/* =========================================================================
   VoiceGuard frontend
   - Mic capture via AudioWorklet → 16 kHz PCM16 → ~250 ms chunks
   - Enrollment: record N seconds, upload WAV to POST /enroll
   - Monitoring: stream chunks over WS /ws/monitor with auto-reconnect
   ========================================================================= */

// ------------------------------------------------------------------ config
const params = new URLSearchParams(location.search);
let API = params.get('api') || location.origin;      // resolved in resolveApi()
const MIC_CONSTRAINTS = {
  audio: {
    channelCount: 1,
    echoCancellation: true,   // prevents exam-page sounds (e.g. our own beep) from being picked up
    noiseSuppression: false,  // NS can distort voice timbre and hurt speaker embeddings
    autoGainControl: true,
  },
};
let CFG = { sample_rate: 16000, chunk_ms: 250, enroll_duration_sec: 20, strikes_to_warn: 3, cooldown_sec: 10, min_speech_sec: 8 };
const RED_HOLD_MS = 6000;           // keep the red status visible this long after a warning
const CLIENT_SILENT_MS = 8000;      // client-side "mic seems silent" hint
const SILENT_RMS = 0.0015;          // ≈ -56 dBFS

// --------------------------------------------------------------- helpers
const $ = (id) => document.getElementById(id);
const show = (el, on = true) => el.classList.toggle('hidden', !on);
const fmtTime = (d = new Date()) => d.toLocaleTimeString([], { hour12: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setPill(el, kind, text) {
  el.className = `pill pill-${kind}`;
  el.querySelector('span').textContent = text;
}

function goto(screen) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(`screen-${screen}`).classList.add('active');
  const order = ['consent', 'enroll', 'test'];
  const idx = order.indexOf(screen === 'summary' ? 'test' : screen);
  order.forEach((s, i) => {
    const li = $(`step-${s}`);
    li.classList.toggle('active', i === idx && screen !== 'summary');
    li.classList.toggle('done', i < idx || screen === 'summary');
  });
}

async function resolveApi() {
  const candidates = params.get('api') ? [params.get('api')] : [location.origin, `${location.protocol}//${location.hostname || 'localhost'}:8000`];
  for (const base of candidates) {
    try {
      const r = await fetch(`${base}/health`, { cache: 'no-store' });
      if (r.ok) {
        API = base;
        const h = await r.json();
        setPill($('server-pill'), h.status === 'ok' ? 'ok' : 'warn', h.status === 'ok' ? `Server ready · ${h.device}` : 'Loading models…');
        try { CFG = { ...CFG, ...(await (await fetch(`${API}/config/client`)).json()) }; } catch { /* keep defaults */ }
        $('enroll-duration').textContent = CFG.enroll_duration_sec;
        return h.status === 'ok';
      }
    } catch { /* try next */ }
  }
  setPill($('server-pill'), 'bad', 'Server unreachable');
  return false;
}

async function waitForServer() {
  for (;;) {
    if (await resolveApi()) return;
    await sleep(3000);
  }
}

// --------------------------------------------------------------- audio
class MicCapture {
  constructor() { this.ctx = null; this.stream = null; this.node = null; this.onChunk = null; this.onLevel = null; }

  async start() {
    if (this.ctx) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('This browser does not support microphone capture (requires HTTPS or localhost).'), { name: 'NotSupportedError' });
    }
    this.stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.audioWorklet.addModule(new URL('./pcm-worklet.js', import.meta.url));
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'pcm-downsampler', {
      processorOptions: { targetRate: CFG.sample_rate, chunkMs: CFG.chunk_ms },
    });
    this.node.port.onmessage = (e) => {
      if (e.data?.type !== 'chunk') return;
      this.onLevel?.(e.data.rms, e.data.peak);
      this.onChunk?.(e.data.pcm);
    };
    src.connect(this.node);
    // Keep the graph pulling without making noise.
    const mute = this.ctx.createGain(); mute.gain.value = 0;
    this.node.connect(mute).connect(this.ctx.destination);
    this.stream.getAudioTracks()[0].addEventListener('ended', () => this.onEnded?.());
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.ctx = this.stream = this.node = null;
  }
}

function micErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone permission was denied. Click the lock/camera icon in the address bar, allow the microphone for this site, then press the button again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone was found. Connect a microphone and try again.';
    case 'NotReadableError':
      return 'Your microphone is being used by another application. Close it and try again.';
    default:
      return `Could not start the microphone: ${err?.message || err}`;
  }
}

function encodeWav(int16Chunks, sampleRate) {
  const total = int16Chunks.reduce((n, c) => n + c.length, 0);
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + total * 2, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, total * 2, true);
  let off = 44;
  for (const c of int16Chunks) { new Int16Array(buf, off, c.length).set(c); off += c.length * 2; }
  return new Blob([buf], { type: 'audio/wav' });
}

class LevelMeter {
  constructor(canvas) { this.c = canvas; this.g = canvas.getContext('2d'); this.hist = new Array(48).fill(0); }
  push(rms) {
    const db = 20 * Math.log10(Math.max(rms, 1e-5));
    this.hist.push(Math.min(1, Math.max(0, (db + 60) / 55)));
    this.hist.shift();
    this.draw();
  }
  draw() {
    const { c, g, hist } = this; const W = c.width, H = c.height; const bw = W / hist.length;
    g.clearRect(0, 0, W, H);
    const grad = g.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, '#7c5cff'); grad.addColorStop(1, '#22d3ee');
    g.fillStyle = grad;
    hist.forEach((v, i) => { const h = Math.max(2, v * (H - 6)); g.fillRect(i * bw + 1, (H - h) / 2, bw - 2, h); });
  }
}

// Short attention tone generated with WebAudio (no asset needed).
let alertCtx = null;
function playAlert() {
  try {
    alertCtx = alertCtx || new AudioContext();
    const t = alertCtx.currentTime;
    [0, 0.22, 0.44].forEach((d, i) => {
      const o = alertCtx.createOscillator(); const g = alertCtx.createGain();
      o.type = 'triangle'; o.frequency.value = i === 2 ? 660 : 880;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
      o.connect(g).connect(alertCtx.destination); o.start(t + d); o.stop(t + d + 0.2);
    });
  } catch { /* audio not available */ }
}

// ============================================================== CONSENT
const mic = new MicCapture();
$('consent-checkbox').addEventListener('change', (e) => { $('consent-accept').disabled = !e.target.checked; });
$('consent-accept').addEventListener('click', async () => {
  show($('consent-error'), false);
  $('consent-accept').disabled = true;
  try {
    await mic.start();      // permission prompt happens only after consent
    goto('enroll');
  } catch (err) {
    $('consent-error').textContent = micErrorMessage(err);
    show($('consent-error'));
    mic.stop();
  } finally {
    $('consent-accept').disabled = !$('consent-checkbox').checked;
  }
});

// ============================================================ ENROLLMENT
const enrollMeter = new LevelMeter($('enroll-meter'));
const RING_LEN = 2 * Math.PI * 88;
let enrollChunks = [];
let recording = false;
let session = null;  // { session_id, threshold, ... }

function setRecorder(state) { $('recorder').dataset.state = state; }
function setRing(frac) { $('ring-progress').style.strokeDashoffset = String(RING_LEN * (1 - frac)); }

async function countdown(n = 3) {
  setRecorder('countdown');
  const el = $('countdown');
  for (let i = n; i > 0; i--) {
    el.textContent = i; el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
    $('enroll-status').textContent = 'Get ready to read…';
    await sleep(900);
  }
  el.textContent = ''; el.classList.remove('tick');
}

async function startEnrollment() {
  if (recording) return;
  show($('enroll-error'), false); show($('enroll-result'), false); show($('start-test'), false); show($('enroll-retry'), false);
  try { await mic.start(); } catch (err) { showEnrollError(micErrorMessage(err)); return; }
  $('record-btn').disabled = true;
  await countdown(3);

  enrollChunks = []; recording = true; setRecorder('recording');
  document.body.classList.add('recording');
  $('enroll-status').textContent = 'Recording — read the paragraph aloud.';
  const durMs = CFG.enroll_duration_sec * 1000;
  const t0 = performance.now();
  let loudSince = t0;

  await new Promise((resolve) => {
    const tick = () => {
      const el = performance.now() - t0;
      setRing(Math.min(1, el / durMs));
      $('enroll-timer').textContent = `${(el / 1000).toFixed(1)} s / ${CFG.enroll_duration_sec} s`;
      if (performance.now() - loudSince > 4000) $('enroll-status').textContent = "We can't hear you — check that your mic isn't muted.";
      if (el >= durMs) return resolve();
      requestAnimationFrame(tick);
    };
    mic.onLevel = (rms) => { enrollMeter.push(rms); if (rms > SILENT_RMS * 4) { loudSince = performance.now(); if ($('enroll-status').textContent.startsWith('We')) $('enroll-status').textContent = 'Recording — read the paragraph aloud.'; } };
    tick();
  });

  recording = false; document.body.classList.remove('recording');
  setRecorder('processing');
  $('enroll-status').textContent = 'Building your voice profile…';
  await submitEnrollment();
}

async function submitEnrollment() {
  const wav = encodeWav(enrollChunks, CFG.sample_rate);
  enrollChunks = [];                      // drop raw audio from memory right away
  const fd = new FormData();
  fd.append('audio', wav, 'enroll.wav');
  try {
    const r = await fetch(`${API}/enroll`, { method: 'POST', body: fd });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const d = body.detail || {};
      throw new Error(d.message || (typeof body.detail === 'string' ? body.detail : `Enrollment failed (HTTP ${r.status}).`));
    }
    session = body;
    setRecorder('done');
    $('enroll-status').textContent = 'Voice profile created.';
    $('enroll-result').innerHTML = `✓ Profile ready · ${body.speech_sec.toFixed(1)} s of speech, ${body.n_segments} segments · threshold <b class="mono">${body.threshold.toFixed(3)}</b>`;
    show($('enroll-result')); show($('start-test')); show($('enroll-retry'));
  } catch (err) {
    showEnrollError(err.message === 'Failed to fetch' ? 'Could not reach the server. Check that the backend is running and try again.' : err.message);
  }
}

function showEnrollError(msg) {
  setRecorder('idle'); setRing(0);
  $('enroll-error').textContent = msg; show($('enroll-error'));
  $('enroll-status').textContent = 'Please try again.';
  $('record-btn').disabled = false;
  show($('enroll-retry'), false);
}

mic.onChunk = (buf) => {
  if (recording) enrollChunks.push(new Int16Array(buf));
  else monitor?.sendChunk(buf);
};
mic.onEnded = () => {
  setPill($('mic-pill'), 'bad', 'Mic disconnected');
  showNotice('Your microphone was disconnected. Reconnect it and reload the page.');
};
mic.onLevel = (rms) => enrollMeter.push(rms);

$('record-btn').addEventListener('click', startEnrollment);
$('enroll-retry').addEventListener('click', () => { session = null; setRecorder('idle'); setRing(0); $('record-btn').disabled = false; startEnrollment(); });
$('start-test').addEventListener('click', () => startTest());

// ============================================================== MONITOR
class Monitor {
  constructor(sessionId) {
    this.sessionId = sessionId; this.ws = null; this.retry = 0; this.closed = false;
    this.lastMsg = 0; this.pingTimer = null;
  }
  url() {
    const u = new URL(API); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws/monitor'; u.search = `?session_id=${encodeURIComponent(this.sessionId)}`;
    return u.toString();
  }
  connect() {
    if (this.closed) return;
    setPill($('ws-pill'), 'warn', this.retry ? `Reconnecting (${this.retry})…` : 'Connecting…');
    const ws = new WebSocket(this.url());
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; this.lastMsg = Date.now(); setPill($('ws-pill'), 'ok', 'Live'); this.startPing(); };
    ws.onmessage = (e) => { this.lastMsg = Date.now(); try { handleServerEvent(JSON.parse(e.data)); } catch (err) { console.error(err); } };
    ws.onclose = (e) => {
      this.stopPing();
      if (this.ws !== ws) return;
      if (e.code === 4404) { setPill($('ws-pill'), 'bad', 'Session expired'); this.closed = true; onSessionLost(); return; }
      if (e.code === 4409) { setPill($('ws-pill'), 'bad', 'Opened elsewhere'); this.closed = true; showNotice('This exam session was opened in another tab or window.'); return; }
      if (e.code === 4000 || this.closed) { setPill($('ws-pill'), 'muted', 'Closed'); return; }
      this.scheduleReconnect();
    };
    ws.onerror = () => { /* onclose follows */ };
  }
  scheduleReconnect() {
    setStatus('offline');
    const delay = Math.min(8000, 500 * 2 ** this.retry) * (0.8 + Math.random() * 0.4);
    this.retry += 1;
    setPill($('ws-pill'), 'warn', `Reconnecting in ${(delay / 1000).toFixed(1)} s`);
    setTimeout(() => this.connect(), delay);
  }
  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      if (Date.now() - this.lastMsg > 12000) { this.ws.close(); return; }   // dead connection → reconnect
      this.ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
    }, 4000);
  }
  stopPing() { clearInterval(this.pingTimer); this.pingTimer = null; }
  sendChunk(buf) {
    if (this.ws?.readyState === WebSocket.OPEN && this.ws.bufferedAmount < 256 * 1024) this.ws.send(buf);
  }
  end() {
    this.closed = true; this.stopPing();
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'end' }));
  }
}

let monitor = null;
const testMeter = new LevelMeter($('test-meter'));
let redUntil = 0, lastStatus = 'checking', warnCount = 0, lastSoundAt = Date.now();
const points = [];   // {t, sim, status}
let threshold = 0.4;

function setStatus(kind) {
  if (Date.now() < redUntil && kind !== 'bad') return;      // hold red for a while
  const map = {
    ok: ['status-ok', 'Only you detected'],
    checking: ['status-checking', 'Checking…'],
    bad: ['status-bad', 'Warning: another voice detected'],
    offline: ['status-offline', 'Reconnecting…'],
  };
  const [cls, txt] = map[kind];
  if (kind !== lastStatus) { $('status').className = `status ${cls}`; $('status-text').textContent = txt; lastStatus = kind; }
}

function renderStrikes(n) {
  const max = CFG.strikes_to_warn;
  $('strike-dots').innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''} ${n >= max - 1 && i < n ? 'full' : ''}"></i>`).join('');
}

function logEvent(text, kind = '', time = new Date()) {
  const li = document.createElement('li');
  li.className = kind ? `ev-${kind}` : '';
  li.innerHTML = `<span class="t">${fmtTime(time)}</span><span>${kind || 'window'}</span><span></span>`;
  li.lastChild.textContent = text;
  const ul = $('event-log'); ul.prepend(li);
  while (ul.children.length > 150) ul.lastChild.remove();
}

function showNotice(msg) { $('test-notice').textContent = msg; show($('test-notice'), !!msg); }

function showWarning() {
  redUntil = Date.now() + RED_HOLD_MS;
  setStatus('bad');
  $('warning-banner').classList.remove('show'); void $('warning-banner').offsetWidth; $('warning-banner').classList.add('show');
  playAlert();
  clearTimeout(showWarning.t);
  showWarning.t = setTimeout(() => { $('warning-banner').classList.remove('show'); }, 8000);
}

function handleServerEvent(ev) {
  switch (ev.type) {
    case 'ready':
      threshold = ev.threshold; $('kpi-thr').textContent = threshold.toFixed(3);
      CFG.strikes_to_warn = ev.strikes_to_warn; renderStrikes(0);
      logEvent(`connected · threshold ${ev.threshold.toFixed(3)}`, 'system');
      setStatus('checking');
      break;
    case 'window':
    case 'warning': {
      $('latency').textContent = `${ev.latency_ms.toFixed(0)} ms / window`;
      $('kpi-speech').textContent = `${Math.round(ev.speech_ratio * 100)}%`;
      renderStrikes(ev.strikes);
      if (ev.similarity == null) { setStatus(lastStatus === 'ok' ? 'ok' : 'checking'); break; }
      $('kpi-sim').textContent = ev.similarity.toFixed(3);
      points.push({ t: ev.stream_time, sim: ev.similarity, status: ev.status });
      if (points.length > 120) points.shift();
      drawChart();
      if (ev.type === 'warning') {
        warnCount += 1; $('kpi-warn').textContent = warnCount;
        logEvent(`ANOTHER VOICE · sim ${ev.similarity.toFixed(3)} < ${ev.threshold.toFixed(3)}`, 'warning');
        showWarning();
      } else {
        logEvent(`sim ${ev.similarity.toFixed(3)} · speech ${Math.round(ev.speech_ratio * 100)}% · ${ev.status}${ev.suppressed_by_cooldown ? ' (cooldown)' : ''}`);
        setStatus(ev.status === 'match' ? 'ok' : 'checking');
      }
      break;
    }
    case 'silent_mic':
      showNotice(`Your microphone has been silent for ${Math.round(ev.silent_for_sec)} s. Make sure it is connected and not muted.`);
      setPill($('mic-pill'), 'warn', 'Mic silent');
      logEvent('microphone silent', 'system');
      break;
    case 'mic_ok':
      showNotice(''); setPill($('mic-pill'), 'ok', 'Mic active'); logEvent('microphone active again', 'system');
      break;
    case 'ended':
      showSummary(ev.report);
      break;
    case 'error':
      logEvent(ev.message, 'system');
      break;
    default: break;
  }
}

function drawChart() {
  const c = $('sim-chart'); const g = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = c.clientWidth * dpr, H = c.clientHeight * dpr;
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  g.clearRect(0, 0, W, H);
  const pad = 28 * dpr, y = (v) => H - pad / 2 - ((v + 0.2) / 1.2) * (H - pad);   // range -0.2..1.0
  g.font = `${10 * dpr}px JetBrains Mono, monospace`; g.fillStyle = 'rgba(160,170,200,.5)'; g.strokeStyle = 'rgba(160,170,200,.08)';
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => { g.beginPath(); g.moveTo(pad, y(v)); g.lineTo(W, y(v)); g.stroke(); g.fillText(v.toFixed(2), 2 * dpr, y(v) + 3 * dpr); });
  // threshold
  g.setLineDash([6 * dpr, 6 * dpr]); g.strokeStyle = 'hsl(352 90% 70%)'; g.lineWidth = 1.5 * dpr;
  g.beginPath(); g.moveTo(pad, y(threshold)); g.lineTo(W, y(threshold)); g.stroke(); g.setLineDash([]);
  if (!points.length) return;
  const n = 120, x = (i) => pad + (i + (n - points.length)) * ((W - pad - 8 * dpr) / (n - 1));
  const grad = g.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, '#7c5cff'); grad.addColorStop(1, '#22d3ee');
  g.strokeStyle = grad; g.lineWidth = 2 * dpr; g.beginPath();
  points.forEach((p, i) => (i ? g.lineTo(x(i), y(p.sim)) : g.moveTo(x(i), y(p.sim)))); g.stroke();
  points.forEach((p, i) => {
    g.fillStyle = p.status === 'warning' ? 'hsl(352 90% 62%)' : p.status === 'mismatch' ? 'hsl(42 96% 58%)' : 'hsl(152 70% 48%)';
    g.beginPath(); g.arc(x(i), y(p.sim), (p.status === 'warning' ? 5 : 3) * dpr, 0, Math.PI * 2); g.fill();
  });
}

async function startTest() {
  if (!session) return;
  goto('test');
  $('kpi-thr').textContent = session.threshold.toFixed(3);
  threshold = session.threshold; renderStrikes(0); drawChart();
  try { await mic.start(); } catch (err) { showNotice(micErrorMessage(err)); return; }
  setPill($('mic-pill'), 'ok', 'Mic active');
  mic.onLevel = (rms) => {
    testMeter.push(rms);
    if (rms > SILENT_RMS) lastSoundAt = Date.now();
  };
  monitor = new Monitor(session.session_id);
  monitor.connect();
  // Client-side silent-mic hint (server also checks).
  clearInterval(startTest.silentTimer);
  startTest.silentTimer = setInterval(() => {
    if (Date.now() - lastSoundAt > CLIENT_SILENT_MS && $('test-notice').classList.contains('hidden')) {
      showNotice('No sound from your microphone. Check that it is connected and not muted.');
      setPill($('mic-pill'), 'warn', 'Mic silent');
    }
  }, 2000);
}

function onSessionLost() {
  showNotice('Your exam session is no longer valid on the server (it may have restarted). Please re-enroll your voice.');
  setTimeout(() => { mic.onLevel = (rms) => enrollMeter.push(rms); session = null; setRecorder('idle'); setRing(0); $('record-btn').disabled = false; goto('enroll'); }, 2500);
}

$('dismiss-warning').addEventListener('click', () => $('warning-banner').classList.remove('show'));

$('end-test').addEventListener('click', async () => {
  if (!confirm('End the exam now? Your voice data will be deleted.')) return;
  $('end-test').disabled = true;
  monitor?.end();
  clearInterval(startTest.silentTimer);
  mic.stop();
  try {
    const r = await fetch(`${API}/sessions/${session.session_id}/end`, { method: 'POST' });
    if (r.ok) { showSummary(await r.json()); return; }
  } catch { /* the WS 'ended' message may still deliver the report */ }
  setTimeout(() => { if (!$('screen-summary').classList.contains('active')) showSummary(null); }, 1500);
});

function showSummary(report) {
  if ($('screen-summary').classList.contains('active')) return;
  monitor && (monitor.closed = true);
  goto('summary');
  const warnings = report?.warnings || [];
  $('summary-kpis').innerHTML = `
    <div class="kpi"><small>Warnings</small><b class="mono">${report ? report.warnings_count : warnCount}</b></div>
    <div class="kpi"><small>Windows</small><b class="mono">${report?.windows_evaluated ?? '—'}</b></div>
    <div class="kpi"><small>Mean sim</small><b class="mono">${report?.similarity_mean?.toFixed?.(3) ?? '—'}</b></div>
    <div class="kpi"><small>Threshold</small><b class="mono">${report?.threshold?.toFixed?.(3) ?? '—'}</b></div>`;
  $('summary-warnings').innerHTML = warnings.length ? '' : '<li><span></span><span></span><span>No other voices were detected. 🎉</span></li>';
  warnings.forEach((w) => {
    const li = document.createElement('li'); li.className = 'ev-warning';
    li.innerHTML = `<span class="t">${fmtTime(new Date(w.timestamp))}</span><span>t=${w.stream_time.toFixed(0)}s</span><span>sim ${w.similarity.toFixed(3)}</span>`;
    $('summary-warnings').append(li);
  });
}

$('restart').addEventListener('click', () => location.reload());
window.addEventListener('resize', () => drawChart());
window.addEventListener('beforeunload', () => { if (monitor && !monitor.closed) navigator.sendBeacon?.(`${API}/sessions/${session.session_id}/end`); });

// ------------------------------------------------------------------ boot
goto('consent');
waitForServer();
