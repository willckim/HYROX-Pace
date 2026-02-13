/**
 * Wearable Service — Stub implementation for Expo Go.
 *
 * Native HealthKit/Google Fit modules (react-native-health, react-native-google-fit)
 * are not installed — they require a custom dev client build. This service provides
 * the full interface so the rest of the app compiles, and returns no-op / null values.
 *
 * When building a custom dev client, install the native packages and swap in the
 * real implementation that reads from HealthKit/Google Fit.
 */

import { syncWearableData } from '../lib/api';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

let pollTimer: ReturnType<typeof setInterval> | null = null;

function isAvailable(): boolean {
  // Native health modules not installed — always false in Expo Go
  return false;
}

async function requestPermissions(): Promise<boolean> {
  return false;
}

async function readLatestHR(): Promise<{ heartRate: number | null; calories: number | null }> {
  return { heartRate: null, calories: null };
}

async function pollAndSync(competitorId?: string) {
  const { heartRate, calories } = await readLatestHR();

  if (heartRate === null && calories === null) return;

  try {
    await syncWearableData({
      competitor_id: competitorId,
      samples: [
        {
          timestamp: new Date().toISOString(),
          heart_rate: heartRate ?? undefined,
          active_calories: calories ?? undefined,
        },
      ],
    });
  } catch {
    // Silently fail sync — don't interrupt race experience
  }
}

function startMonitoring(competitorId?: string) {
  if (pollTimer) return;
  pollAndSync(competitorId);
  pollTimer = setInterval(() => pollAndSync(competitorId), POLL_INTERVAL_MS);
}

function stopMonitoring() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function isMonitoring(): boolean {
  return pollTimer !== null;
}

export const WearableService = {
  isAvailable,
  requestPermissions,
  startMonitoring,
  stopMonitoring,
  isMonitoring,
  readLatestHR,
};
