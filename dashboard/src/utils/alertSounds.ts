// ---------------------------------------------------------------------------
// Alert sound notifications using Web Audio API (no external library)
// Respects the `mp_sound_alerts` localStorage setting.
// ---------------------------------------------------------------------------

let userInteracted = false;

// Track first user interaction so we can play sounds after it.
if (typeof window !== "undefined") {
  const markInteracted = () => {
    userInteracted = true;
    window.removeEventListener("click", markInteracted);
    window.removeEventListener("keydown", markInteracted);
  };
  window.addEventListener("click", markInteracted);
  window.addEventListener("keydown", markInteracted);
}

function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem("mp_sound_alerts") !== "false";
  } catch {
    return true;
  }
}

export function playAlertSound(severity: "warning" | "critical" | "extreme"): void {
  if (!userInteracted || !isSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    function beep(freq: number, startTime: number, duration: number, volume: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    if (severity === "warning") {
      // Single tone — A4
      beep(440, ctx.currentTime, 0.5, 0.3);
    } else if (severity === "critical") {
      // Two-tone beep
      beep(880, ctx.currentTime, 0.2, 0.4);
      beep(660, ctx.currentTime + 0.25, 0.35, 0.4);
    } else if (severity === "extreme") {
      // Triple alarm
      for (let i = 0; i < 3; i++) {
        const t = ctx.currentTime + i * 0.3;
        beep(1046, t, 0.15, 0.45);       // C6
        beep(784, t + 0.15, 0.1, 0.35); // G5
      }
    }
  } catch {
    // AudioContext blocked or unavailable — silently ignore
  }
}

// Call this after each dashboard refresh with new + previous crash scores.
export function checkAndPlayCrashAlert(
  newScore: number,
  prevScore: number | null,
): void {
  if (prevScore === null) return;
  const EXTREME = 90;
  const CRITICAL = 75;

  if (newScore >= EXTREME && prevScore < EXTREME) {
    playAlertSound("extreme");
  } else if (newScore >= CRITICAL && prevScore < CRITICAL) {
    playAlertSound("critical");
  } else if (newScore >= 50 && prevScore < 50) {
    playAlertSound("warning");
  }
}
