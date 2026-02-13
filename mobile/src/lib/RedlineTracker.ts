/**
 * RedlineTracker — Local 2-minute HR > 95% sustained duration tracker.
 * Module-level state (not Zustand) to avoid extra render cycles.
 * Returns RedlineAlert when sustained >= 2 min, then resets.
 */

import { RedlineAlert } from '../types/auth';

const REDLINE_THRESHOLD = 0.95;
const REDLINE_DURATION_MS = 2 * 60 * 1000; // 2 minutes

// Module-level state
let redlineStartTime: number | null = null;
let lastSampleTime: number | null = null;
let alertCounter = 0;

export interface RedlineStatus {
  isInRedline: boolean;
  secondsInRedline: number;
}

/**
 * Record an HR sample. Returns a RedlineAlert if HR has been >= 95% of maxHR
 * for a sustained 2 minutes, then resets the tracker.
 */
export function recordHRSample(
  currentHR: number | null,
  maxHR: number | null,
  now: number = Date.now(),
): RedlineAlert | null {
  lastSampleTime = now;

  if (currentHR === null || maxHR === null || maxHR <= 0) {
    // No valid HR — exit redline
    redlineStartTime = null;
    return null;
  }

  const hrPct = currentHR / maxHR;

  if (hrPct < REDLINE_THRESHOLD) {
    // Below threshold — reset
    redlineStartTime = null;
    return null;
  }

  // In redline zone
  if (redlineStartTime === null) {
    redlineStartTime = now;
    return null;
  }

  const durationMs = now - redlineStartTime;

  if (durationMs >= REDLINE_DURATION_MS) {
    // Sustained >= 2 min — fire alert and reset
    const durationSec = Math.round(durationMs / 1000);
    alertCounter += 1;

    const alert: RedlineAlert = {
      id: `local-redline-${alertCounter}`,
      triggered_at: new Date(redlineStartTime).toISOString(),
      hr_avg: currentHR,
      hr_max_pct: hrPct,
      duration_seconds: durationSec,
      recovery_tip: getRecoveryTip(hrPct, durationSec),
      resolved_at: null,
    };

    // Reset after firing
    redlineStartTime = null;
    return alert;
  }

  return null;
}

/**
 * Get current redline status for UI indicator.
 */
export function getRedlineStatus(now: number = Date.now()): RedlineStatus {
  if (redlineStartTime === null) {
    return { isInRedline: false, secondsInRedline: 0 };
  }

  const seconds = Math.round((now - redlineStartTime) / 1000);
  return { isInRedline: true, secondsInRedline: seconds };
}

/**
 * Reset all tracker state. Call on unmount.
 */
export function resetRedlineTracker(): void {
  redlineStartTime = null;
  lastSampleTime = null;
}

function getRecoveryTip(hrPct: number, durationSec: number): string {
  if (hrPct >= 0.98) {
    return 'CRITICAL: Walk immediately. Slow deep breaths for 60 seconds before resuming any effort.';
  }
  if (durationSec > 180) {
    return 'Extended redline detected. Walk the first 200m of the next run. Sip water at the next opportunity.';
  }
  return 'HR sustained above 95% for 2+ minutes. Reduce effort by 10% on the next segment. Nasal breathing to bring HR down.';
}
