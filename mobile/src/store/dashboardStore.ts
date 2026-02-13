/**
 * Dashboard store — Live race tracking for a single user participant.
 */

import { create } from 'zustand';

const SEGMENT_NAMES = [
  'Run 1', 'SkiErg', 'Run 2', 'Sled Push',
  'Run 3', 'Sled Pull', 'Run 4', 'Burpee BJ',
  'Run 5', 'Row', 'Run 6', 'Farmers Carry',
  'Run 7', 'Lunges', 'Run 8', 'Wall Balls',
];

const SEGMENT_TYPES = [
  'RUN', 'SKI_ERG', 'RUN', 'SLED_PUSH',
  'RUN', 'SLED_PULL', 'RUN', 'BURPEE_BROAD_JUMP',
  'RUN', 'ROW', 'RUN', 'FARMERS_CARRY',
  'RUN', 'SANDBAG_LUNGES', 'RUN', 'WALL_BALLS',
];

export interface Participant {
  id: string;
  name: string;
  isUser: boolean;
  segmentsCompleted: number;
  currentSegmentIndex: number;
  elapsedSeconds: number;
  lastStationName: string;
}

export interface SegmentSplit {
  segmentIndex: number;
  segmentName: string;
  elapsedAtCompletion: number;
  splitSeconds: number;
}

interface DashboardState {
  participants: Participant[];
  isActive: boolean;
  splits: SegmentSplit[];

  initLiveRace(displayName: string): void;
  advanceSegment(currentElapsedSeconds: number): void;
  undoSegment(): void;
  updateElapsed(seconds: number): void;
  reset(): void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  participants: [],
  isActive: false,
  splits: [],

  initLiveRace(displayName: string) {
    const user: Participant = {
      id: 'user',
      name: displayName || 'You',
      isUser: true,
      segmentsCompleted: 0,
      currentSegmentIndex: 0,
      elapsedSeconds: 0,
      lastStationName: SEGMENT_NAMES[0],
    };
    set({ participants: [user], isActive: true, splits: [] });
  },

  advanceSegment(currentElapsedSeconds: number) {
    const { participants, splits } = get();
    const user = participants[0];
    if (!user || user.segmentsCompleted >= 16) return;

    const prevElapsed = splits.length > 0
      ? splits[splits.length - 1].elapsedAtCompletion
      : 0;

    const newSplit: SegmentSplit = {
      segmentIndex: user.segmentsCompleted,
      segmentName: SEGMENT_NAMES[user.segmentsCompleted],
      elapsedAtCompletion: currentElapsedSeconds,
      splitSeconds: currentElapsedSeconds - prevElapsed,
    };

    const newCompleted = user.segmentsCompleted + 1;
    const newIndex = Math.min(newCompleted, 15);

    set({
      participants: [{
        ...user,
        segmentsCompleted: newCompleted,
        currentSegmentIndex: newIndex,
        elapsedSeconds: currentElapsedSeconds,
        lastStationName: SEGMENT_NAMES[Math.min(newCompleted, 15)],
      }],
      splits: [...splits, newSplit],
    });
  },

  undoSegment() {
    const { participants, splits } = get();
    const user = participants[0];
    if (!user || user.segmentsCompleted <= 0 || splits.length === 0) return;

    const newSplits = splits.slice(0, -1);
    const newCompleted = user.segmentsCompleted - 1;
    const prevElapsed = newSplits.length > 0
      ? newSplits[newSplits.length - 1].elapsedAtCompletion
      : 0;

    set({
      participants: [{
        ...user,
        segmentsCompleted: newCompleted,
        currentSegmentIndex: newCompleted,
        elapsedSeconds: prevElapsed,
        lastStationName: SEGMENT_NAMES[newCompleted],
      }],
      splits: newSplits,
    });
  },

  updateElapsed(seconds: number) {
    const { participants } = get();
    if (participants.length === 0) return;
    const user = participants[0];
    set({
      participants: [{ ...user, elapsedSeconds: seconds }],
    });
  },

  reset() {
    set({ participants: [], isActive: false, splits: [] });
  },
}));

export function getSegmentType(index: number): string {
  return SEGMENT_TYPES[Math.min(index, 15)];
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
