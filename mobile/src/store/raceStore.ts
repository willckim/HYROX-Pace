/**
 * Race store — manages race selection, phase detection, and live timer.
 * Persists selected race to expo-secure-store.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { HyroxRace, isRaceDay, RACE_CALENDAR } from '../data/raceCalendar';

const PERSIST_KEY = 'hyroxpace_selected_race';

export type RacePhase = 'no_race' | 'countdown' | 'race_day';
export type LiveStatus = 'idle' | 'running' | 'paused' | 'finished';

interface RaceState {
  selectedRace: HyroxRace | null;
  phase: RacePhase;
  liveStatus: LiveStatus;
  raceStartedAt: number | null;
  racePausedElapsed: number;
  totalElapsedSeconds: number;

  selectRace(race: HyroxRace): void;
  clearRace(): void;
  recomputePhase(): void;
  startRace(): void;
  pauseRace(): void;
  resumeRace(): void;
  finishRace(): void;
  tickElapsed(): void;
  loadPersistedRace(): Promise<void>;
}

function computePhase(race: HyroxRace | null): RacePhase {
  if (!race) return 'no_race';
  if (isRaceDay(race)) return 'race_day';
  return 'countdown';
}

export const useRaceStore = create<RaceState>((set, get) => ({
  selectedRace: null,
  phase: 'no_race',
  liveStatus: 'idle',
  raceStartedAt: null,
  racePausedElapsed: 0,
  totalElapsedSeconds: 0,

  selectRace(race: HyroxRace) {
    const phase = computePhase(race);
    set({
      selectedRace: race,
      phase,
      liveStatus: 'idle',
      raceStartedAt: null,
      racePausedElapsed: 0,
      totalElapsedSeconds: 0,
    });
    SecureStore.setItemAsync(PERSIST_KEY, JSON.stringify(race)).catch(() => {});
  },

  clearRace() {
    set({
      selectedRace: null,
      phase: 'no_race',
      liveStatus: 'idle',
      raceStartedAt: null,
      racePausedElapsed: 0,
      totalElapsedSeconds: 0,
    });
    SecureStore.deleteItemAsync(PERSIST_KEY).catch(() => {});
  },

  recomputePhase() {
    const { selectedRace, liveStatus } = get();
    if (liveStatus !== 'idle') return; // don't interrupt live race
    set({ phase: computePhase(selectedRace) });
  },

  startRace() {
    set({
      liveStatus: 'running',
      raceStartedAt: Date.now(),
      racePausedElapsed: 0,
      totalElapsedSeconds: 0,
      phase: 'race_day',
    });
  },

  pauseRace() {
    const { raceStartedAt, racePausedElapsed } = get();
    if (!raceStartedAt) return;
    const runningMs = Date.now() - raceStartedAt;
    set({
      liveStatus: 'paused',
      racePausedElapsed: racePausedElapsed + runningMs,
      raceStartedAt: null,
    });
  },

  resumeRace() {
    set({
      liveStatus: 'running',
      raceStartedAt: Date.now(),
    });
  },

  finishRace() {
    // Capture final elapsed before stopping
    const { raceStartedAt, racePausedElapsed } = get();
    let totalMs = racePausedElapsed;
    if (raceStartedAt) {
      totalMs += Date.now() - raceStartedAt;
    }
    set({
      liveStatus: 'finished',
      raceStartedAt: null,
      totalElapsedSeconds: Math.floor(totalMs / 1000),
    });
  },

  tickElapsed() {
    const { liveStatus, raceStartedAt, racePausedElapsed } = get();
    if (liveStatus !== 'running' || !raceStartedAt) return;
    const totalMs = racePausedElapsed + (Date.now() - raceStartedAt);
    set({ totalElapsedSeconds: Math.floor(totalMs / 1000) });
  },

  async loadPersistedRace() {
    try {
      const stored = await SecureStore.getItemAsync(PERSIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as HyroxRace;
        // Verify the race still exists in the calendar
        const match = RACE_CALENDAR.find(r => r.id === parsed.id);
        if (match) {
          set({
            selectedRace: match,
            phase: computePhase(match),
          });
        }
      }
    } catch {
      // Corrupt data — ignore
    }
  },
}));
