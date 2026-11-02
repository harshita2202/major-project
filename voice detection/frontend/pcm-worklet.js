/**
 * AudioWorklet: capture mic audio at the context's native rate, low-pass filter,
 * downsample to 16 kHz, convert to PCM16 and post ~250 ms chunks to the main thread.
 *
 * processorOptions: { targetRate: 16000, chunkMs: 250 }
 */
class PcmDownsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetRate = opts.targetRate || 16000;
    this.chunkSamples = Math.round((this.targetRate * (opts.chunkMs || 250)) / 1000);
    this.ratio = sampleRate / this.targetRate; // input samples per output sample
    this.pos = 0; // fractional read position into the current input stream
    this.prev = 0; // last filtered input sample (for interpolation across blocks)
    this.out = new Int16Array(this.chunkSamples);
    this.outLen = 0;
    this.sumSq = 0;
    this.peak = 0;
    this.enabled = true;

    // Two cascaded biquad low-pass sections (Butterworth-ish, ~4th order) at 0.45 * target rate
    // to prevent aliasing before decimation.
    this.sections = [this.makeLowpass(this.targetRate * 0.45, 0.5412), this.makeLowpass(this.targetRate * 0.45, 1.3066)];

    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'enable') this.enabled = !!e.data.value;
      if (e.data && e.data.type === 'flush') this.flush();
    };
  }

  makeLowpass(fc, q) {
    if (sampleRate <= this.targetRate) return null; // nothing to filter
    const w0 = (2 * Math.PI * fc) / sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const cos = Math.cos(w0);
    const a0 = 1 + alpha;
    return {
      b0: (1 - cos) / 2 / a0, b1: (1 - cos) / a0, b2: (1 - cos) / 2 / a0,
      a1: (-2 * cos) / a0, a2: (1 - alpha) / a0,
      x1: 0, x2: 0, y1: 0, y2: 0,
    };
  }

  filter(x) {
    for (const s of this.sections) {
      if (!s) continue;
      const y = s.b0 * x + s.b1 * s.x1 + s.b2 * s.x2 - s.a1 * s.y1 - s.a2 * s.y2;
      s.x2 = s.x1; s.x1 = x; s.y2 = s.y1; s.y1 = y;
      x = y;
    }
    return x;
  }

  push(sample) {
    const v = Math.max(-1, Math.min(1, sample));
    this.out[this.outLen++] = v < 0 ? v * 0x8000 : v * 0x7fff;
    this.sumSq += v * v;
    const a = Math.abs(v);
    if (a > this.peak) this.peak = a;
    if (this.outLen >= this.chunkSamples) this.flush();
  }

  flush() {
    if (this.outLen === 0) return;
    const pcm = this.out.slice(0, this.outLen);
    const rms = Math.sqrt(this.sumSq / this.outLen);
    this.port.postMessage({ type: 'chunk', pcm: pcm.buffer, rms, peak: this.peak }, [pcm.buffer]);
    this.outLen = 0;
    this.sumSq = 0;
    this.peak = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!this.enabled || !input || input.length === 0 || !input[0]) return true;
    const ch0 = input[0];
    const ch1 = input.length > 1 ? input[1] : null;
    const n = ch0.length;

    // Filter the whole block first (mono mix), then resample with linear interpolation.
    const block = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = ch1 ? 0.5 * (ch0[i] + ch1[i]) : ch0[i];
      block[i] = this.filter(s);
    }
    // this.pos is relative to the start of this block; index -1 refers to this.prev.
    while (this.pos < n) {
      const i = Math.floor(this.pos);
      const frac = this.pos - i;
      const a = i - 1 < 0 ? this.prev : block[i - 1];
      const b = block[i];
      this.push(a + (b - a) * frac);
      this.pos += this.ratio;
    }
    this.pos -= n;
    this.prev = block[n - 1];
    return true;
  }
}

registerProcessor('pcm-downsampler', PcmDownsampler);
