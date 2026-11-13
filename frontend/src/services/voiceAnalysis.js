/**
 * voiceAnalysis.js
 * ProctorTrack™ integration service for VoiceGuard Real-Time Multi-Voice Detection.
 *
 * Connects to the Python VoiceGuard FastAPI backend (/voice-api -> port 8000)
 * for Silero VAD + SpeechBrain ECAPA-TDNN voice enrollment and WebSocket live
 * monitoring, with an automatic in-browser WebAudio spectral/formant & pitch
 * multi-voice detector when the Python server is offline.
 */

export const VOICE_API_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}/voice-api`
    : import.meta.env?.VITE_VOICE_API_URL || 'http://localhost:8000';

const DIRECT_VOICE_URL = import.meta.env?.VITE_VOICE_API_URL || 'http://localhost:8000';

export const DEFAULT_VOICE_CFG = {
  sample_rate: 16000,
  chunk_ms: 250,
  enroll_duration_sec: 12,
  min_speech_sec: 4,
  window_sec: 2.0,
  hop_sec: 1.0,
  strikes_to_warn: 3,
  cooldown_sec: 10,
};

const MIC_CONSTRAINTS = {
  audio: {
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: false,
    autoGainControl: true,
  },
};

export const SILENT_RMS = 0.0015; // ~ -56 dBFS

let resolvedApiBase = VOICE_API_URL;
let clientConfig = { ...DEFAULT_VOICE_CFG };

/**
 * Resolves the reachable VoiceGuard backend URL (/voice-api proxy or direct localhost:8000)
 * and fetches client configuration if available.
 */
export async function checkVoiceServerHealth() {
  const candidates = [VOICE_API_URL, DIRECT_VOICE_URL];
  for (const base of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${base}/health`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        resolvedApiBase = base;
        const health = await res.json();
        try {
          const cfgRes = await fetch(`${base}/config/client`, { cache: 'no-store' });
          if (cfgRes.ok) {
            const serverCfg = await cfgRes.json();
            clientConfig = { ...DEFAULT_VOICE_CFG, ...serverCfg };
          }
        } catch {
          // keep default clientConfig
        }
        return {
          available: health.status === 'ok',
          status: health.status || 'ok',
          device: health.device || 'cpu',
          active_sessions: health.active_sessions ?? 0,
          config: clientConfig,
          mode: 'server',
        };
      }
    } catch {
      // try next candidate
    }
  }

  return {
    available: true,
    status: 'browser-fallback',
    device: 'webaudio-dsp',
    active_sessions: 0,
    config: clientConfig,
    mode: 'browser',
  };
}

/**
 * Converts an array of Int16Array PCM chunks into a standard 16-bit mono WAV Blob.
 */
export function encodeWav(int16Chunks, sampleRate = 16000) {
  const total = int16Chunks.reduce((n, c) => n + c.length, 0);
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + total * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, total * 2, true);
  let off = 44;
  for (const c of int16Chunks) {
    new Int16Array(buf, off, c.length).set(c);
    off += c.length * 2;
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/**
 * Formats user-friendly microphone error messages.
 */
export function formatMicError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'Microphone permission denied. Please allow microphone access in your browser address bar and try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'No microphone hardware found. Please connect a microphone and retry.';
    case 'NotReadableError':
      return 'Your microphone is busy in another application. Close other audio apps and retry.';
    default:
      return `Could not access microphone: ${err?.message || err}`;
  }
}

// ─── In-place Radix-2 FFT (N = 256) for Spectral Formant & Sub-band Analysis ──
function fft256(real, imag) {
  const n = 256;
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tr = real[i];
      real[i] = real[j];
      real[j] = tr;
      const ti = imag[i];
      imag[i] = imag[j];
      imag[j] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    const wlenR = Math.cos(ang);
    const wlenI = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < half; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const vR = real[i + k + half] * wR - imag[i + k + half] * wI;
        const vI = real[i + k + half] * wI + imag[i + k + half] * wR;
        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + half] = uR - vR;
        imag[i + k + half] = uI - vI;
        const nextWR = wR * wlenR - wI * wlenI;
        wI = wR * wlenI + wI * wlenR;
        wR = nextWR;
      }
    }
  }
}

// 10 spectral bands across 128 FFT bins (62.5 Hz per bin @ 16 kHz)
const SPECTRAL_BANDS = [
  [2, 4],   // 125 - 250 Hz (Fundamental / low male F0)
  [4, 7],   // 250 - 437 Hz (High F0 / F1 low)
  [7, 11],  // 437 - 687 Hz (F1 vowel region)
  [11, 16], // 687 - 1000 Hz (F1/F2 transition)
  [16, 24], // 1000 - 1500 Hz (F2 low)
  [24, 34], // 1500 - 2125 Hz (F2 high)
  [34, 46], // 2125 - 2875 Hz (F3 region)
  [46, 64], // 2875 - 4000 Hz (F4 / speaker timbre)
  [64, 90], // 4000 - 5625 Hz (Fricative / sibilance)
  [90, 124] // 5625 - 7750 Hz (High frequency air)
];

/**
 * Extracts VAD speech ratio + 16-dimensional speaker timbre, pitch (F0),
 * harmonicity, and multi-voice overlap features from a 16kHz float32 window.
 */
function extractWindowFeatures(floatSamples) {
  const n = floatSamples.length;
  if (n < 1024) return null;

  const frameLen = 512; // 32 ms @ 16 kHz
  const totalFrames = Math.floor(n / frameLen);
  const frameRmsList = new Float32Array(totalFrames);
  let sumSqAll = 0;

  for (let f = 0; f < totalFrames; f++) {
    const base = f * frameLen;
    let fSq = 0;
    for (let j = 0; j < frameLen; j++) {
      const s = floatSamples[base + j];
      fSq += s * s;
    }
    frameRmsList[f] = Math.sqrt(fSq / frameLen);
    sumSqAll += fSq;
  }

  const windowRms = Math.sqrt(sumSqAll / (totalFrames * frameLen));

  // Compute dynamic energy modulation to reject stationary background noise (e.g. pink/fan/TV noise)
  const sortedRms = Float32Array.from(frameRmsList).sort();
  const p20Rms = sortedRms[Math.floor(totalFrames * 0.2)] || 1e-6;
  const p90Rms = sortedRms[Math.floor(totalFrames * 0.9)] || 0;
  const modulationRatio = p90Rms / Math.max(p20Rms, 0.002);

  // Stationary noise has nearly constant frame RMS (modulationRatio < 1.75) and low peak energy
  if (windowRms < 0.012 || (modulationRatio < 1.85 && p90Rms < 0.04)) {
    return { speechRatio: 0.05, rms: windowRms, embedding: null };
  }

  // Dynamic frame threshold: active speech frames exceed noise floor and minimum speech energy
  const speechFrameThr = Math.max(0.015, p20Rms * 1.45);
  let speechFrames = 0;
  const f0Values = [];
  const pitchCorrs = [];
  const secondPeakRatios = [];
  const bandLogSums = new Float64Array(SPECTRAL_BANDS.length);
  const bandLogSqSums = new Float64Array(SPECTRAL_BANDS.length);
  let spectralFrames = 0;

  const fftReal = new Float32Array(256);
  const fftImag = new Float32Array(256);

  for (let f = 0; f < totalFrames; f++) {
    if (frameRmsList[f] < speechFrameThr) continue;
    speechFrames++;

    const base = f * frameLen;

    // 1. Pitch (F0) & Harmonicity via normalized autocorrelation over lags 36..190 (84 Hz .. 444 Hz)
    let r0 = 1e-8;
    for (let i = 0; i < 320; i++) {
      const s = floatSamples[base + i];
      r0 += s * s;
    }

    let bestLag = 0;
    let bestCorr = -1;
    let secondBestCorr = -1;
    let prevCorr = -1;
    let currCorr = -1;

    for (let lag = 36; lag <= 185; lag += 1) {
      let rk = 0;
      for (let i = 0; i < 320; i++) {
        rk += floatSamples[base + i] * floatSamples[base + i + lag];
      }
      const normCorr = rk / r0;

      // Track local peaks for multi-voice competing pitch detection
      if (lag >= 38 && currCorr > prevCorr && currCorr > normCorr) {
        if (currCorr > bestCorr) {
          secondBestCorr = bestCorr;
          bestCorr = currCorr;
          bestLag = lag - 1;
        } else if (currCorr > secondBestCorr && Math.abs((lag - 1) - bestLag) > 12 && ((lag - 1) % bestLag) > 8) {
          secondBestCorr = currCorr;
        }
      }
      prevCorr = currCorr;
      currCorr = normCorr;
    }

    if (bestCorr > 0.32 && bestLag > 0) {
      f0Values.push(16000 / bestLag);
      pitchCorrs.push(bestCorr);
      if (secondBestCorr > 0.2) {
        secondPeakRatios.push(secondBestCorr / bestCorr);
      } else {
        secondPeakRatios.push(0);
      }
    }

    // 2. 256-point Hann-windowed FFT for vocal-tract spectral envelope
    for (let i = 0; i < 256; i++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / 255));
      // Pre-emphasis filter (1 - 0.97 z^-1) highlights speaker formants F1/F2/F3
      const s = floatSamples[base + i + 1] - 0.97 * floatSamples[base + i];
      fftReal[i] = s * hann;
      fftImag[i] = 0;
    }
    fft256(fftReal, fftImag);

    const frameBandLogs = new Float32Array(SPECTRAL_BANDS.length);
    let frameLogMean = 0;
    for (let b = 0; b < SPECTRAL_BANDS.length; b++) {
      const [bStart, bEnd] = SPECTRAL_BANDS[b];
      let eSum = 1e-10;
      for (let k = bStart; k < bEnd; k++) {
        eSum += fftReal[k] * fftReal[k] + fftImag[k] * fftImag[k];
      }
      const logE = Math.log(eSum / (bEnd - bStart));
      frameBandLogs[b] = logE;
      frameLogMean += logE;
    }
    frameLogMean /= SPECTRAL_BANDS.length;

    // Mean-normalize log spectrum per frame (cepstral liftering / gain invariance)
    for (let b = 0; b < SPECTRAL_BANDS.length; b++) {
      const normLog = frameBandLogs[b] - frameLogMean;
      bandLogSums[b] += normLog;
      bandLogSqSums[b] += normLog * normLog;
    }
    spectralFrames++;
  }

  // Require voiced harmonic speech frames (further rejects non-vocal broadband noise)
  const voicedRatio = f0Values.length / Math.max(1, totalFrames);
  const rawSpeechRatio = speechFrames / Math.max(1, totalFrames);
  const effectiveSpeechRatio = voicedRatio < 0.14 ? rawSpeechRatio * 0.3 : Math.max(rawSpeechRatio, voicedRatio * 1.4);

  if (effectiveSpeechRatio < 0.40 || spectralFrames < 5 || f0Values.length < 4) {
    return { speechRatio: Math.min(0.35, effectiveSpeechRatio), rms: windowRms, embedding: null };
  }

  // Compute speaker feature vector (16 dimensions):
  // [0..9]: 10 mean-normalized log-spectral formant bands
  // [10]: Mean F0 (scaled: Hz / 200)
  // [11]: Median F0 (scaled: Hz / 200)
  // [12]: F0 interquartile spread (captures multi-voice pitch jumping)
  // [13]: Mean harmonicity (pitch autocorrelation peak)
  // [14]: Secondary competing pitch ratio (spikes during overlapping voices)
  // [15]: Spectral flux / variance across frames (spikes when two voices overlap or alternate)
  const feat = new Float32Array(16);
  let meanBandVar = 0;
  for (let b = 0; b < 10; b++) {
    const meanB = bandLogSums[b] / spectralFrames;
    const varB = Math.max(0, bandLogSqSums[b] / spectralFrames - meanB * meanB);
    feat[b] = meanB;
    meanBandVar += varB;
  }
  meanBandVar /= 10;

  const sortedF0 = [...f0Values].sort((a, b) => a - b);
  const meanF0 = sortedF0.reduce((a, b) => a + b, 0) / sortedF0.length;
  const medianF0 = sortedF0[Math.floor(sortedF0.length * 0.5)];
  const q25F0 = sortedF0[Math.floor(sortedF0.length * 0.25)];
  const q75F0 = sortedF0[Math.floor(sortedF0.length * 0.75)];
  const iqrF0 = (q75F0 - q25F0) / Math.max(80, medianF0);

  const meanHarmonicity = pitchCorrs.reduce((a, b) => a + b, 0) / pitchCorrs.length;
  const meanSecondPeak = secondPeakRatios.reduce((a, b) => a + b, 0) / secondPeakRatios.length;

  feat[10] = (meanF0 / 150.0) * 2.5;
  feat[11] = (medianF0 / 150.0) * 2.5;
  feat[12] = iqrF0 * 2.0;
  feat[13] = meanHarmonicity * 2.0;
  feat[14] = meanSecondPeak * 2.5;
  feat[15] = Math.sqrt(meanBandVar) * 1.5;

  return {
    speechRatio: Math.min(1.0, effectiveSpeechRatio),
    rms: windowRms,
    embedding: feat,
  };
}

/**
 * Computes speaker similarity in [0, 1] between a window feature vector and
 * the enrolled speaker profile (mean + std vector), penalizing both vocal-tract/pitch
 * mismatch (different speaker) and multi-voice overlap artifacts.
 */
function computeProfileSimilarity(feat, profileObj) {
  if (!feat || !profileObj) return 0;
  const mean = profileObj.mean || profileObj;
  const std = profileObj.std || null;

  // 1. Spectral formant distance (bands 0..9)
  let spectralDistSq = 0;
  for (let i = 0; i < 10; i++) {
    const diff = feat[i] - mean[i];
    const scale = std ? Math.max(0.22, std[i] * 1.6) : 0.35;
    const z = diff / scale;
    spectralDistSq += z * z;
  }
  const spectralRmsZ = Math.sqrt(spectralDistSq / 10);

  // 2. Pitch (F0) distance (dims 10..11)
  const pitchDiff = Math.abs(feat[10] - mean[10]) + Math.abs(feat[11] - mean[11]);
  const pitchScale = std ? Math.max(0.18, (std[10] + std[11])) : 0.25;
  const pitchZ = pitchDiff / (2 * pitchScale);

  // 3. Multi-voice / overlap instability penalty (dims 12, 13, 14, 15)
  // When a second voice overlaps with the user:
  // - harmonicity (feat[13]) drops below enrolled speaker's harmonicity
  // - competing pitch ratio (feat[14]), F0 spread (feat[12]), and spectral variance (feat[15]) increase
  const harmDrop = Math.max(0, (mean[13] - feat[13]) * 1.8);
  const competingPitchExcess = Math.max(0, (feat[14] - mean[14]) * 1.6);
  const f0SpreadExcess = Math.max(0, (feat[12] - mean[12]) * 1.2);
  const overlapPenalty = harmDrop + competingPitchExcess + f0SpreadExcess;

  const combinedDistance = spectralRmsZ * 0.55 + pitchZ * 0.35 + overlapPenalty * 0.45;
  const sim = Math.exp(-0.75 * combinedDistance);
  return Math.max(0, Math.min(1, sim));
}

function buildLocalVoiceProfile(int16Chunks, sampleRate = 16000) {
  const totalLen = int16Chunks.reduce((acc, c) => acc + c.length, 0);
  const floatBuf = new Float32Array(totalLen);
  let offset = 0;
  for (const c of int16Chunks) {
    for (let i = 0; i < c.length; i++) {
      floatBuf[offset++] = c[i] / 32768.0;
    }
  }

  const winSamples = sampleRate * 2; // 2s window
  const hopSamples = sampleRate * 1; // 1s hop
  const embeddings = [];
  let speechWindows = 0;

  for (let s = 0; s + winSamples <= floatBuf.length; s += hopSamples) {
    const slice = floatBuf.subarray(s, s + winSamples);
    const res = extractWindowFeatures(slice);
    if (res && res.embedding) {
      embeddings.push(res.embedding);
      speechWindows++;
    }
  }

  if (embeddings.length === 0) {
    const res = extractWindowFeatures(floatBuf);
    if (res && res.embedding) {
      embeddings.push(res.embedding);
      speechWindows = 1;
    }
  }

  if (embeddings.length === 0) {
    return null;
  }

  const dim = embeddings[0].length;
  const mean = new Float32Array(dim);
  const std = new Float32Array(dim);

  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) mean[i] += emb[i];
  }
  for (let i = 0; i < dim; i++) mean[i] /= embeddings.length;

  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      const d = emb[i] - mean[i];
      std[i] += d * d;
    }
  }
  for (let i = 0; i < dim; i++) {
    std[i] = Math.sqrt(std[i] / Math.max(1, embeddings.length));
  }

  const profileObj = {
    mean: Array.from(mean),
    std: Array.from(std),
  };

  const sims = embeddings.map((e) => computeProfileSimilarity(e, profileObj));
  const simMean = sims.reduce((a, b) => a + b, 0) / sims.length;
  const simVar = sims.reduce((a, b) => a + (b - simMean) ** 2, 0) / sims.length;
  const simStd = Math.sqrt(simVar);
  const autoThr = Number(Math.max(0.35, Math.min(0.54, simMean - 2.2 * simStd)).toFixed(4));

  return {
    profile: profileObj,
    threshold: autoThr,
    speech_sec: Number((speechWindows * 1.2).toFixed(1)),
    n_segments: embeddings.length,
    self_similarity_mean: Number(simMean.toFixed(4)),
    self_similarity_std: Number(simStd.toFixed(4)),
  };
}

/**
 * Enrolls the candidate's voice using recorded 16kHz Int16 PCM chunks.
 * Uploads WAV to Python VoiceGuard POST /enroll if server is running,
 * and also builds a browser profile fallback.
 */
export async function enrollCandidateVoice(int16Chunks, sampleRate = 16000) {
  const localResult = buildLocalVoiceProfile(int16Chunks, sampleRate);
  const wavBlob = encodeWav(int16Chunks, sampleRate);

  const candidates = [resolvedApiBase, VOICE_API_URL, DIRECT_VOICE_URL];
  const seen = new Set();

  for (const base of candidates) {
    if (seen.has(base)) continue;
    seen.add(base);

    try {
      const fd = new FormData();
      fd.append('audio', wavBlob, 'enroll.wav');

      const res = await fetch(`${base}/enroll`, {
        method: 'POST',
        body: fd,
      });

      const body = await res.json().catch(() => ({}));
      if (res.ok && body.session_id) {
        resolvedApiBase = base;
        return {
          ...body,
          mode: 'server',
          localProfile: localResult?.profile || null,
        };
      }

      // If server returned 422 (e.g. insufficient_speech or silent_audio), surface error
      if (res.status === 422 || res.status === 400) {
        const detail = body.detail || {};
        const enrollErr = new Error(
          detail.message ||
            (typeof detail === 'string'
              ? detail
              : 'Voice enrollment did not capture enough clear speech. Please speak clearly and try again.')
        );
        enrollErr.isEnrollmentRejected = true;
        throw enrollErr;
      }
    } catch (err) {
      if (err?.isEnrollmentRejected) {
        throw err;
      }
      // Network/connection error -> continue to next candidate or browser fallback
    }
  }

  // Fallback to browser profile when Python server on port 8000 is not running
  if (!localResult) {
    throw new Error(
      'Not enough speech detected in the recording. Please make sure your microphone is unmuted and read the passage aloud.'
    );
  }

  return {
    session_id: `local-voice-${Date.now()}`,
    threshold: localResult.threshold,
    enrolled_threshold: localResult.threshold,
    speech_sec: localResult.speech_sec,
    n_segments: localResult.n_segments,
    self_similarity_mean: localResult.self_similarity_mean,
    self_similarity_std: localResult.self_similarity_std,
    mode: 'browser',
    localProfile: localResult.profile,
  };
}

/**
 * Ends an active VoiceGuard session on the backend.
 */
export async function endVoiceSession(voiceSessionId) {
  if (!voiceSessionId || String(voiceSessionId).startsWith('local-voice-')) {
    return null;
  }
  try {
    const res = await fetch(`${resolvedApiBase}/sessions/${encodeURIComponent(voiceSessionId)}/end`, {
      method: 'POST',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore cleanup error
  }
  return null;
}

/**
 * Captures 16 kHz mono PCM16 chunks from the user's microphone via AudioWorklet (/pcm-worklet.js).
 */
export class MicCapture {
  constructor(targetRate = 16000, chunkMs = 250) {
    this.targetRate = targetRate;
    this.chunkMs = chunkMs;
    this.ctx = null;
    this.stream = null;
    this.node = null;
    this.onChunk = null;
    this.onLevel = null;
    this.onEnded = null;
  }

  async start() {
    if (this.ctx) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      const err = new Error('This browser does not support microphone capture.');
      err.name = 'NotSupportedError';
      throw err;
    }

    this.stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    await this.ctx.audioWorklet.addModule('/pcm-worklet.js');
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'pcm-downsampler', {
      processorOptions: { targetRate: this.targetRate, chunkMs: this.chunkMs },
    });

    this.node.port.onmessage = (e) => {
      if (e.data?.type !== 'chunk') return;
      this.onLevel?.(e.data.rms, e.data.peak);
      this.onChunk?.(e.data.pcm);
    };

    src.connect(this.node);
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.node.connect(mute).connect(this.ctx.destination);

    const track = this.stream.getAudioTracks()[0];
    if (track) {
      track.addEventListener('ended', () => this.onEnded?.());
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  stop() {
    try {
      this.stream?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    try {
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.stream = null;
    this.node = null;
  }
}

/**
 * Live streaming voice monitor.
 * Connects to Python VoiceGuard WebSocket (/ws/monitor?session_id=...) when available,
 * and falls back to local sliding-window evaluation when in browser mode.
 */
export class VoiceStreamMonitor {
  constructor({ sessionData, onEvent, onStatusChange }) {
    this.sessionData = sessionData;
    this.onEvent = onEvent;
    this.onStatusChange = onStatusChange;
    this.ws = null;
    this.closed = false;
    this.retry = 0;
    this.pingTimer = null;
    this.lastMsg = 0;
    this.useLocalFallback = !sessionData?.session_id || sessionData?.mode === 'browser';

    // Local sliding-window state (used when Python WS is offline)
    this.sampleRate = 16000;
    this.windowSamples = this.sampleRate * 2;
    this.hopSamples = this.sampleRate * 1;
    this.floatBuffer = new Float32Array(0);
    this.totalSamples = 0;
    this.nextEvalSample = this.windowSamples;
    this.localProfile = sessionData?.localProfile || null;
    this.localThreshold =
      sessionData?.mode === 'browser' ? (sessionData?.threshold || 0.48) : 0.48;
    this.strikes = 0;
    this.strikesToWarn = 3;
    this.lastStrikeTime = -1e9;
    this.lastWarningTime = -1e9;
    this.cooldownSec = 10;
    this.warningsCount = 0;
    this.lastSoundTime = 0;
    this.micSilentFlagged = false;
  }

  buildWsUrl() {
    const base = resolvedApiBase.startsWith('http')
      ? resolvedApiBase
      : `${window.location.origin}${resolvedApiBase}`;
    const u = new URL(base);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = `${u.pathname.replace(/\/$/, '')}/ws/monitor`;
    u.search = `?session_id=${encodeURIComponent(this.sessionData.session_id)}`;
    return u.toString();
  }

  connect() {
    if (this.closed) return;

    if (this.useLocalFallback) {
      this.onStatusChange?.('live-local');
      this.onEvent?.({
        type: 'ready',
        threshold: this.localThreshold,
        window_sec: 2.0,
        hop_sec: 1.0,
        strikes_to_warn: this.strikesToWarn,
        cooldown_sec: this.cooldownSec,
        warnings_so_far: this.warningsCount,
        mode: 'browser',
      });
      return;
    }

    this.onStatusChange?.(this.retry ? 'reconnecting' : 'connecting');
    try {
      const ws = new WebSocket(this.buildWsUrl());
      ws.binaryType = 'arraybuffer';
      this.ws = ws;

      ws.onopen = () => {
        this.retry = 0;
        this.lastMsg = Date.now();
        this.onStatusChange?.('live');
        this.startPing();
      };

      ws.onmessage = (e) => {
        this.lastMsg = Date.now();
        try {
          const data = JSON.parse(e.data);
          this.onEvent?.(data);
        } catch {
          // ignore malformed frame
        }
      };

      ws.onclose = (e) => {
        this.stopPing();
        if (this.ws !== ws || this.closed) return;
        if (e.code === 4404) {
          // Session unknown on server -> switch seamlessly to local fallback
          this.useLocalFallback = true;
          this.connect();
          return;
        }
        if (e.code === 4000 || e.code === 4409) {
          this.onStatusChange?.('closed');
          return;
        }
        if (this.retry >= 2) {
          this.useLocalFallback = true;
          this.connect();
          return;
        }
        const delay = Math.min(5000, 700 * 2 ** this.retry);
        this.retry += 1;
        this.onStatusChange?.('reconnecting');
        setTimeout(() => this.connect(), delay);
      };

      ws.onerror = () => {
        // onclose handles retry/fallback
      };
    } catch {
      this.useLocalFallback = true;
      this.connect();
    }
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      if (Date.now() - this.lastMsg > 12000) {
        this.ws.close();
        return;
      }
      this.ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
    }, 4000);
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  sendChunk(pcmArrayBuffer) {
    if (this.closed) return;

    if (!this.useLocalFallback) {
      if (this.ws?.readyState === WebSocket.OPEN && this.ws.bufferedAmount < 256 * 1024) {
        this.ws.send(pcmArrayBuffer);
      }
      return;
    }

    // Local browser sliding-window evaluation
    const int16 = new Int16Array(pcmArrayBuffer);
    if (int16.length === 0) return;

    const chunkFloat = new Float32Array(int16.length);
    let chunkSq = 0;
    for (let i = 0; i < int16.length; i++) {
      const v = int16[i] / 32768.0;
      chunkFloat[i] = v;
      chunkSq += v * v;
    }

    const merged = new Float32Array(this.floatBuffer.length + chunkFloat.length);
    merged.set(this.floatBuffer, 0);
    merged.set(chunkFloat, this.floatBuffer.length);
    this.floatBuffer = merged;
    this.totalSamples += chunkFloat.length;

    const streamTime = this.totalSamples / this.sampleRate;
    const chunkRms = Math.sqrt(chunkSq / chunkFloat.length);

    if (chunkRms > 0.001) {
      this.lastSoundTime = streamTime;
      if (this.micSilentFlagged) {
        this.micSilentFlagged = false;
        this.onEvent?.({ type: 'mic_ok', stream_time: streamTime });
      }
    } else if (!this.micSilentFlagged && streamTime - this.lastSoundTime >= 15.0) {
      this.micSilentFlagged = true;
      this.onEvent?.({
        type: 'silent_mic',
        stream_time: streamTime,
        silent_for_sec: Math.round(streamTime - this.lastSoundTime),
      });
    }

    while (this.totalSamples >= this.nextEvalSample && this.floatBuffer.length >= this.windowSamples) {
      const winSlice = this.floatBuffer.subarray(
        this.floatBuffer.length - this.windowSamples,
        this.floatBuffer.length
      );
      this.evaluateLocalWindow(winSlice, this.nextEvalSample / this.sampleRate);
      this.nextEvalSample += this.hopSamples;
    }

    // Keep at most 4 seconds in buffer
    const maxKeep = this.sampleRate * 4;
    if (this.floatBuffer.length > maxKeep) {
      this.floatBuffer = this.floatBuffer.slice(this.floatBuffer.length - maxKeep);
    }
  }

  evaluateLocalWindow(winSlice, streamTime) {
    const t0 = performance.now();
    const feat = extractWindowFeatures(winSlice);
    const latencyMs = performance.now() - t0;

    if (!feat || !feat.embedding) {
      this.onEvent?.({
        type: 'window',
        stream_time: streamTime,
        status: 'silence',
        speech_ratio: feat?.speechRatio || 0,
        similarity: null,
        threshold: this.localThreshold,
        strikes: this.strikes,
        latency_ms: latencyMs,
      });
      return;
    }

    // If user skipped enrollment, auto-enroll from first clean speech window
    if (!this.localProfile) {
      this.localProfile = {
        mean: Array.from(feat.embedding),
        std: new Array(feat.embedding.length).fill(0.25),
      };
    }

    const sim = computeProfileSimilarity(feat.embedding, this.localProfile);
    let status;
    let suppressed = false;

    if (sim >= this.localThreshold) {
      this.strikes = 0;
      status = 'match';
    } else {
      if (streamTime - this.lastStrikeTime > 4.0) {
        this.strikes = 0;
      }
      this.strikes += 1;
      this.lastStrikeTime = streamTime;

      if (this.strikes < this.strikesToWarn) {
        status = 'mismatch';
      } else if (streamTime - this.lastWarningTime < this.cooldownSec) {
        status = 'mismatch';
        suppressed = true;
      } else {
        this.warningsCount += 1;
        this.lastWarningTime = streamTime;
        this.strikes = 0;
        status = 'warning';
      }
    }

    this.onEvent?.({
      type: status === 'warning' ? 'warning' : 'window',
      stream_time: streamTime,
      status,
      speech_ratio: feat.speechRatio,
      similarity: sim,
      threshold: this.localThreshold,
      strikes: this.strikes,
      warning: status === 'warning',
      suppressed_by_cooldown: suppressed,
      latency_ms: latencyMs,
    });
  }

  end() {
    this.closed = true;
    this.stopPing();
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'end' }));
        this.ws.close(4000, 'exam ended');
      }
    } catch {
      // ignore
    }
    this.ws = null;
  }
}


// ─── Real-Time Multi-Voice Detection Service (Autocorrelation & Spectral Dispersion) ───
export class VoiceMonitor {
  /**
   * @param {MediaStream} audioStream - Microphone media stream
   * @param {Object} options
   * @param {function} options.onViolation - Callback when multiple voices are detected
   * @param {function} options.onStatusChange - Callback with { status, level, strikes, pitch }
   * @param {number} [options.strikesToWarn=2]
   * @param {number} [options.cooldownMs=8000]
   */
  constructor(audioStream, options = {}) {
    this.stream = audioStream;
    this.onViolation = options.onViolation || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.strikesToWarn = options.strikesToWarn || 2;
    this.cooldownMs = options.cooldownMs || 8000;

    this.audioCtx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.intervalId = null;

    this.strikes = 0;
    this.lastWarningTime = 0;
    this.pitchHistory = []; // { pitch, confidence, time }
    this.primaryPitchBaseline = null;
    this.currentLevel = 0;
    this.currentStatus = 'silent'; // 'silent' | 'normal' | 'multiple_voices'

    this._destroyed = false;
    this._initAudio();
  }

  _initAudio() {
    if (!this.stream || !this.stream.getAudioTracks().length) {
      console.warn('[VoiceMonitor] No audio track available in media stream.');
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn('[VoiceMonitor] Web Audio API is not supported in this browser.');
        return;
      }

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.6;

      this.sourceNode.connect(this.analyser);

      // Start analysis loop every 300 ms for responsive, low-latency voice detection
      this.intervalId = setInterval(() => this._analyzeFrame(), 300);
      console.log('[VoiceMonitor] Audio pipeline running at', this.audioCtx.sampleRate, 'Hz');
    } catch (err) {
      console.warn('[VoiceMonitor] Failed to initialize AudioContext:', err);
    }
  }

  _detectPitchAutocorrelation(timeData, sampleRate) {
    // Vocal pitch fundamental frequency range: 80 Hz to 350 Hz
    const minLag = Math.floor(sampleRate / 350); // ~137 samples at 48kHz
    const maxLag = Math.floor(sampleRate / 80);  // ~600 samples at 48kHz

    let bestCorrelation = -1;
    let bestLag = -1;
    let secondBestCorrelation = -1;
    let secondBestLag = -1;

    // Calculate normalized autocorrelation across candidate pitch lags
    for (let lag = minLag; lag <= maxLag; lag += 2) {
      let correlation = 0;
      let norm1 = 0;
      let norm2 = 0;
      const step = 2;
      const len = timeData.length - lag;

      for (let i = 0; i < len; i += step) {
        correlation += timeData[i] * timeData[i + lag];
        norm1 += timeData[i] * timeData[i];
        norm2 += timeData[i + lag] * timeData[i + lag];
      }

      const denominator = Math.sqrt(norm1 * norm2);
      if (denominator > 0) {
        const r = correlation / denominator;
        if (r > bestCorrelation) {
          secondBestCorrelation = bestCorrelation;
          secondBestLag = bestLag;
          bestCorrelation = r;
          bestLag = lag;
        } else if (r > secondBestCorrelation && Math.abs(lag - bestLag) > 25) {
          secondBestCorrelation = r;
          secondBestLag = lag;
        }
      }
    }

    const primaryPitch = bestLag > 0 ? sampleRate / bestLag : 0;
    const secondaryPitch = secondBestLag > 0 ? sampleRate / secondBestLag : 0;

    return {
      primaryPitch: bestCorrelation > 0.35 ? primaryPitch : 0,
      confidence: bestCorrelation,
      secondaryPitch: secondBestCorrelation > 0.35 ? secondaryPitch : 0,
      secondaryConfidence: secondBestCorrelation,
    };
  }

  _analyzeFrame() {
    if (this._destroyed || !this.analyser || !this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const timeData = new Float32Array(this.analyser.fftSize);
    const freqData = new Float32Array(this.analyser.frequencyBinCount);

    this.analyser.getFloatTimeDomainData(timeData);
    this.analyser.getFloatFrequencyData(freqData);

    // 1. RMS level calculation
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      sumSq += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sumSq / timeData.length);
    const dbfs = 20 * Math.log10(Math.max(rms, 1e-5));
    // Scale -55 dBFS to 0, -10 dBFS to 1
    const level = Math.min(1.0, Math.max(0, (dbfs + 55) / 45));
    this.currentLevel = level;

    // Ambient room silence check (below -52 dBFS)
    if (dbfs < -52 || rms < 0.003) {
      if (this.strikes > 0) this.strikes = Math.max(0, this.strikes - 1);
      if (Date.now() - this.lastWarningTime > 3500) {
        this.currentStatus = 'silent';
      }
      this.onStatusChange({
        status: this.currentStatus,
        level: 0,
        strikes: this.strikes,
        dbfs: Math.round(dbfs),
        pitch: 0,
      });
      return;
    }

    // 2. Human speech pitch detection using normalized autocorrelation
    const sampleRate = this.audioCtx.sampleRate;
    const { primaryPitch, confidence, secondaryPitch, secondaryConfidence } =
      this._detectPitchAutocorrelation(timeData, sampleRate);

    const isVoicedSpeech = primaryPitch >= 80 && primaryPitch <= 350 && confidence > 0.35;

    let isMultiVoiceAnomaly = false;

    if (isVoicedSpeech) {
      const now = Date.now();
      this.pitchHistory.push({ pitch: primaryPitch, confidence, time: now });
      if (this.pitchHistory.length > 12) this.pitchHistory.shift();

      // Establish or update candidate's single-speaker baseline pitch
      if (this.primaryPitchBaseline === null) {
        this.primaryPitchBaseline = primaryPitch;
      } else {
        // Slow exponential moving average of dominant pitch
        this.primaryPitchBaseline = 0.85 * this.primaryPitchBaseline + 0.15 * primaryPitch;
      }

      // Detection Check A: Simultaneous Two-Speaker Overlap (polyphonic dual correlation peaks)
      if (secondaryPitch >= 80 && secondaryPitch <= 350 && secondaryConfidence > 0.40) {
        const pitchDelta = Math.abs(primaryPitch - secondaryPitch);
        const pitchRatio = Math.max(primaryPitch, secondaryPitch) / (Math.min(primaryPitch, secondaryPitch) + 1e-4);
        // Exclude octave harmonics (~2.0 or ~0.5)
        const isOctaveHarmonic = Math.abs(pitchRatio - 2.0) < 0.12 || Math.abs(pitchRatio - 3.0) < 0.15;
        if (pitchDelta > 38 && !isOctaveHarmonic) {
          isMultiVoiceAnomaly = true;
          console.log(`[VoiceMonitor] Overlapping dual-speaker signature: ${Math.round(primaryPitch)}Hz & ${Math.round(secondaryPitch)}Hz`);
        }
      }

      // Detection Check B: Alternating Disparate Speaker Shifts (>45 Hz delta from baseline)
      if (this.pitchHistory.length >= 4) {
        const pitches = this.pitchHistory.map((p) => p.pitch);
        const minPitch = Math.min(...pitches);
        const maxPitch = Math.max(...pitches);
        const pitchSpan = maxPitch - minPitch;

        // Calculate pitch variance
        const meanPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
        const variance = pitches.reduce((acc, p) => acc + Math.pow(p - meanPitch, 2), 0) / pitches.length;
        const stdDev = Math.sqrt(variance);

        // A single speaker's standard deviation is typically < 18 Hz.
        // Multiple alternating speakers result in high spread (stdDev > 26 Hz and span > 50 Hz)
        if (stdDev > 26 && pitchSpan > 50) {
          isMultiVoiceAnomaly = true;
          console.log(`[VoiceMonitor] Conversational pitch dispersion: stdDev=${Math.round(stdDev)}Hz, span=${Math.round(pitchSpan)}Hz`);
        }
      }
    }

    // 3. Strike accumulator & security violation dispatch
    if (isMultiVoiceAnomaly) {
      this.strikes++;
      console.log(`[VoiceMonitor] Anomaly detected (strike ${this.strikes}/${this.strikesToWarn})`);

      if (this.strikes >= this.strikesToWarn) {
        const now = Date.now();
        if (now - this.lastWarningTime >= this.cooldownMs) {
          this.lastWarningTime = now;
          this.currentStatus = 'multiple_voices';
          this.onViolation({
            type: 'MULTIPLE_VOICES',
            message: 'Multiple voices detected! Talking or external verbal assistance is strictly prohibited during the exam.',
            dbfs: Math.round(dbfs),
            level,
            pitch: Math.round(primaryPitch),
          });
        }
      }
    } else {
      if (this.strikes > 0) {
        this.strikes = Math.max(0, this.strikes - 1);
      }
      if (Date.now() - this.lastWarningTime > 4000) {
        this.currentStatus = isVoicedSpeech ? 'normal' : 'silent';
      }
    }

    this.onStatusChange({
      status: this.currentStatus,
      level,
      strikes: this.strikes,
      dbfs: Math.round(dbfs),
      pitch: Math.round(primaryPitch),
    });
  }

  stop() {
    this._destroyed = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) { void e; }
      this.sourceNode = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (e) { void e; }
      this.analyser = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch (e) { void e; }
      this.audioCtx = null;
    }
  }
}
