"""Offline scenario runner: feed prerecorded WAVs through the *same* streaming pipeline
used by the WebSocket endpoint and print similarity scores + warnings per case.

Typical usage (from the project root):

    # 1) Put your recordings in data/ using the default names (see --help), then:
    python -m tests.run_scenarios --data-dir data

    # 2) Or build the four scenario files from three raw recordings first:
    python -m tests.run_scenarios --data-dir data --build \
        --user-test data/raw/me_reading_more.wav --other data/raw/friend.wav --noise data/raw/tv.wav

    # 3) Or pass cases explicitly:
    python -m tests.run_scenarios --enroll me_enroll.wav --case user_only=me.wav --case tv=tv.wav

Default file names inside --data-dir:
    enroll.wav            ~20 s of the test taker reading (enrollment)
    user_only.wav         (a) test taker only
    alternating.wav       (b) test taker + second speaker taking turns
    overlap.wav           (c) two people talking at the same time
    noise.wav             (d) background noise / TV only (no test taker)

If ``<case>.json`` exists next to a WAV with {"foreign_intervals": [[start, end], ...]},
detection latency (foreign-speech onset -> warning) is reported as well.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.audio import load_wav, rms_dbfs, write_clip  # noqa: E402
from backend.app.config import Settings, load_settings  # noqa: E402
from backend.app.enrollment import EnrollmentError, enroll  # noqa: E402
from backend.app.models import ModelBundle, get_models  # noqa: E402
from backend.app.monitor import MonitorPipeline, StrikeTracker, WindowResult  # noqa: E402

DEFAULT_CASES = ["user_only", "alternating", "overlap", "noise"]
# Expected number of warnings: (min, max). None = unbounded.
EXPECTATIONS: dict[str, tuple[int, int | None]] = {
    "user_only": (0, 0),
    "alternating": (1, None),
    "overlap": (1, None),
    "noise": (0, 0),
}

# ANSI colours (disabled when not a TTY)
_TTY = sys.stdout.isatty()
def c(txt: str, code: str) -> str:
    return f"\033[{code}m{txt}\033[0m" if _TTY else txt
GREEN, YELLOW, RED, DIM, BOLD, CYAN = "32", "33", "31", "2", "1", "36"


@dataclass
class CaseResult:
    name: str
    path: Path
    duration: float
    windows: list[WindowResult] = field(default_factory=list)
    foreign: list[tuple[float, float]] = field(default_factory=list)

    @property
    def sims(self) -> np.ndarray:
        return np.array([w.similarity for w in self.windows if w.similarity is not None], dtype=np.float32)

    @property
    def warnings(self) -> list[WindowResult]:
        return [w for w in self.windows if w.warning]


# --------------------------------------------------------------------------- run
def run_case(name: str, path: Path, profile: np.ndarray, threshold: float, models: ModelBundle,
             settings: Settings, clip_dir: Path | None, verbose: bool) -> CaseResult:
    sr = settings.audio.sample_rate
    audio = load_wav(path, sr)
    res = CaseResult(name=name, path=path, duration=len(audio) / sr)
    meta = path.with_suffix(".json")
    if meta.exists():
        res.foreign = [tuple(x) for x in json.loads(meta.read_text()).get("foreign_intervals", [])]

    pipe = MonitorPipeline(profile=profile, base_threshold=threshold, models=models, settings=settings,
                           clip_dir=(clip_dir / name) if clip_dir else None)
    chunk = int(sr * settings.audio.client_chunk_ms / 1000)  # same chunking as the browser
    print(c(f"\n=== Case: {name}  ({path.name}, {res.duration:.1f}s, thr={pipe.threshold:.3f}) ===", BOLD))
    if verbose:
        print(c("   t(s)  speech   sim    status     strikes", DIM))
    for i in range(0, len(audio), chunk):
        for w in pipe.push(audio[i : i + chunk]):
            res.windows.append(w)
            if verbose:
                print_window(w, res.foreign)
    return res


def in_foreign(t: float, foreign: list[tuple[float, float]], win: float) -> bool:
    return any(s < t and e > t - win for s, e in foreign)


def print_window(w: WindowResult, foreign: list[tuple[float, float]]) -> None:
    sim = "   -  " if w.similarity is None else f"{w.similarity:6.3f}"
    col = {"silence": DIM, "match": GREEN, "mismatch": YELLOW, "warning": RED}[w.status]
    tag = " <-- WARNING" if w.warning else (" (cooldown)" if w.suppressed_by_cooldown else "")
    truth = c("  [other voice in window]", CYAN) if foreign and in_foreign(w.stream_time, foreign, 2.0) else ""
    print(f"  {w.stream_time:6.1f}  {w.speech_ratio * 100:5.0f}%  {sim}  {c(f'{w.status:<9}', col)}  {w.strikes}{tag}{truth}")


def summarize(r: CaseResult) -> str:
    sims = r.sims
    n_win = len(r.windows)
    n_sp = len(sims)
    lines = [c(f"--- {r.name}: summary ---", BOLD)]
    lines.append(f"  windows: {n_win} total, {n_sp} with speech, {n_win - n_sp} skipped (VAD)")
    if n_sp:
        thr = r.windows[0].threshold
        lines.append(
            f"  similarity: mean={sims.mean():.3f}  std={sims.std():.3f}  min={sims.min():.3f}  "
            f"p10={np.percentile(sims, 10):.3f}  p50={np.median(sims):.3f}  max={sims.max():.3f}"
        )
        lines.append(f"  below threshold ({thr:.3f}): {(sims < thr).sum()}/{n_sp} windows ({(sims < thr).mean() * 100:.0f}%)")
    ws = r.warnings
    lines.append(f"  warnings: {len(ws)}" + (f"  at t = {', '.join(f'{w.stream_time:.0f}s' for w in ws)}" if ws else ""))
    for w in ws:
        if w.clip_path:
            lines.append(c(f"    clip: {w.clip_path}", DIM))
    if r.foreign and ws:
        onset = r.foreign[0][0]
        first = next((w.stream_time for w in ws if w.stream_time >= onset), None)
        if first is not None:
            lines.append(f"  detection latency: first foreign speech @ {onset:.1f}s -> warning @ {first:.1f}s "
                         f"= {first - onset:.1f}s (audio time, excl. compute)")
    exp = EXPECTATIONS.get(r.name)
    if exp:
        lo, hi = exp
        ok = len(ws) >= lo and (hi is None or len(ws) <= hi)
        want = f"{lo}" if lo == hi else f">={lo}"
        lines.append(f"  expected warnings {want}: " + (c("PASS", GREEN) if ok else c("FAIL", RED)))
    return "\n".join(lines)


def sweep(results: list[CaseResult], settings: Settings, thresholds: np.ndarray) -> None:
    """Replay recorded similarities with other thresholds using the SAME strike/cooldown rules."""
    print(c("\n=== Threshold sweep (warnings per case; replayed with identical strike/cooldown rules) ===", BOLD))
    header = "   thr  " + "".join(f"{r.name[:12]:>13}" for r in results) + "   verdict"
    print(header)
    for thr in thresholds:
        row, ok_all = f"  {thr:.2f}  ", True
        for r in results:
            tr = StrikeTracker(settings.monitoring)
            n = sum(1 for w in r.windows if w.similarity is not None and tr.update(w.stream_time, w.similarity, thr)[0] == "warning")
            exp = EXPECTATIONS.get(r.name)
            ok = exp is None or (n >= exp[0] and (exp[1] is None or n <= exp[1]))
            ok_all &= ok
            row += c(f"{n:>13}", GREEN if ok else RED) if exp else f"{n:>13}"
        print(row + ("   all expectations met" if ok_all else ""))


# ------------------------------------------------------------------------- build
def _norm(x: np.ndarray, target_dbfs: float = -23.0) -> np.ndarray:
    g = 10 ** ((target_dbfs - rms_dbfs(x)) / 20)
    return np.clip(x * g, -1, 1).astype(np.float32)


def _tile(x: np.ndarray, n: int) -> np.ndarray:
    return np.tile(x, int(np.ceil(n / max(1, len(x)))))[:n]


def build_scenarios(out: Path, user: Path, other: Path, noise: Path | None, sr: int,
                    length_sec: float, turn_sec: float) -> None:
    """Synthesize alternating/overlap/noise/user_only files from raw single-speaker recordings."""
    out.mkdir(parents=True, exist_ok=True)
    n = int(length_sec * sr)
    u = _tile(_norm(load_wav(user, sr)), n)
    o = _tile(_norm(load_wav(other, sr)), n)

    write_clip(out / "user_only.wav", u, sr)
    (out / "user_only.json").write_text(json.dumps({"foreign_intervals": []}))

    alt = np.zeros(n, dtype=np.float32)
    turn = int(turn_sec * sr)
    foreign = []
    for k, s in enumerate(range(0, n, turn)):
        e = min(n, s + turn)
        alt[s:e] = (u if k % 2 == 0 else o)[s:e]
        if k % 2:
            foreign.append([s / sr, e / sr])
    write_clip(out / "alternating.wav", alt, sr)
    (out / "alternating.json").write_text(json.dumps({"foreign_intervals": foreign}))

    lead = int(min(10.0, length_sec / 3) * sr)
    ov = u.copy()
    ov[lead:] = np.clip(0.7 * u[lead:] + 0.7 * o[lead:], -1, 1)
    write_clip(out / "overlap.wav", ov, sr)
    (out / "overlap.json").write_text(json.dumps({"foreign_intervals": [[lead / sr, n / sr]]}))

    if noise is not None:
        nz = _tile(_norm(load_wav(noise, sr), -30.0), n)
    else:  # pink-ish noise fallback
        rng = np.random.default_rng(0)
        w = rng.standard_normal(n).astype(np.float32)
        nz = _norm(np.cumsum(w) - np.convolve(np.cumsum(w), np.ones(64) / 64, mode="same"), -35.0)
    write_clip(out / "noise.wav", nz, sr)
    (out / "noise.json").write_text(json.dumps({"foreign_intervals": []}))
    print(f"Built scenario files in {out}")


# -------------------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", type=Path, default=ROOT / "data")
    ap.add_argument("--enroll", type=Path, help="Enrollment WAV (default: <data-dir>/enroll.wav)")
    ap.add_argument("--case", action="append", default=[], metavar="NAME=PATH", help="Add/override a case")
    ap.add_argument("--config", type=Path, help="Alternative config.yaml")
    ap.add_argument("--threshold", type=float, help="Override the auto threshold from enrollment")
    ap.add_argument("--save-clips", type=Path, metavar="DIR", help="Write warning clips here (default: none)")
    ap.add_argument("--quiet", action="store_true", help="Only print summaries, not every window")
    ap.add_argument("--no-sweep", action="store_true")
    ap.add_argument("--build", action="store_true", help="Synthesize scenario WAVs into --data-dir first")
    ap.add_argument("--user-test", type=Path, help="[--build] test-taker speech (NOT the enrollment take)")
    ap.add_argument("--other", type=Path, help="[--build] second speaker speech")
    ap.add_argument("--noise", type=Path, help="[--build] background noise / TV recording (optional)")
    ap.add_argument("--length", type=float, default=60.0, help="[--build] seconds per scenario")
    ap.add_argument("--turn", type=float, default=6.0, help="[--build] seconds per turn in 'alternating'")
    args = ap.parse_args()

    settings = load_settings(args.config)
    sr = settings.audio.sample_rate

    if args.build:
        if not (args.user_test and args.other):
            ap.error("--build requires --user-test and --other")
        build_scenarios(args.data_dir, args.user_test, args.other, args.noise, sr, args.length, args.turn)

    enroll_path = args.enroll or args.data_dir / "enroll.wav"
    if not enroll_path.exists():
        ap.error(f"Enrollment file not found: {enroll_path}")

    cases: dict[str, Path] = {n: args.data_dir / f"{n}.wav" for n in DEFAULT_CASES if (args.data_dir / f"{n}.wav").exists()}
    for spec in args.case:
        name, _, p = spec.partition("=")
        cases[name] = Path(p)
    if not cases:
        ap.error("No scenario WAVs found. Use --data-dir, --case NAME=PATH or --build.")

    print(c("Loading models ...", DIM))
    t0 = time.perf_counter()
    models = get_models(settings)
    print(c(f"Models ready in {time.perf_counter() - t0:.1f}s (embeddings on {models.embedder.device})", DIM))

    # ---- enrollment (identical to POST /enroll)
    try:
        er = enroll(load_wav(enroll_path, sr), models, settings)
    except EnrollmentError as e:
        print(c(f"Enrollment rejected [{e.code}]: {e.message}", RED))
        return 2
    thr = args.threshold if args.threshold is not None else er.threshold
    print(c("\n=== Enrollment ===", BOLD))
    print(f"  file: {enroll_path}  speech: {er.speech_sec:.1f}s  segments: {er.n_segments}")
    print(f"  self-similarity: mean={er.self_sim_mean:.3f} std={er.self_sim_std:.3f} "
          f"min={min(er.self_sims):.3f} max={max(er.self_sims):.3f}")
    e = settings.enrollment
    print(f"  auto threshold = clip(mean - {e.threshold_std_factor:g}*std, {e.threshold_min}, {e.threshold_max}) = {er.threshold:.3f}"
          + (f"   (overridden -> {thr:.3f})" if args.threshold is not None else ""))
    if settings.monitoring.threshold_offset:
        print(f"  threshold_offset from config: {settings.monitoring.threshold_offset:+.3f}")

    # ---- cases
    results: list[CaseResult] = []
    t_proc = time.perf_counter()
    for name, path in cases.items():
        if not path.exists():
            print(c(f"Skipping {name}: {path} not found", YELLOW))
            continue
        r = run_case(name, path, er.profile, thr, models, settings, args.save_clips, not args.quiet)
        results.append(r)
        print(summarize(r))
    total_audio = sum(r.duration for r in results)
    lat = [w.latency_ms for r in results for w in r.windows if w.similarity is not None]
    print(c(f"\nProcessed {total_audio:.0f}s of audio in {time.perf_counter() - t_proc:.1f}s; "
            f"mean per-window compute {np.mean(lat) if lat else 0:.0f} ms", DIM))

    if not args.no_sweep and results:
        sweep(results, settings, np.round(np.arange(0.15, 0.701, 0.05), 2))
        print(c("\nTip: pick the highest threshold where user_only/noise stay at 0 and the others still warn;\n"
                "     then set monitoring.threshold_offset (or enrollment.threshold_min/max) in config.yaml.", DIM))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
