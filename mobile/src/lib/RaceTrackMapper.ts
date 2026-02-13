/**
 * RaceTrackMapper — Maps dashboardStore's 16-segment model to 8-station
 * horizontal positions for the race track visualization.
 *
 * Each lap = 1 run + 1 station. Run done = 0.5, station done = 1.0 within that lap.
 * continuousPosition ranges from 0 (start) to 8 (finished).
 */

export const STATION_SHORT_LABELS = [
  'SKI', 'PUSH', 'PULL', 'BBJ', 'ROW', 'FARM', 'LUNG', 'WALL',
] as const;

const SEGMENT_ACTIVITIES: Record<number, string> = {
  0: 'Run 1',
  1: 'SkiErg',
  2: 'Run 2',
  3: 'Sled Push',
  4: 'Run 3',
  5: 'Sled Pull',
  6: 'Run 4',
  7: 'Burpee BJ',
  8: 'Run 5',
  9: 'Row',
  10: 'Run 6',
  11: 'Farmers Carry',
  12: 'Run 7',
  13: 'Lunges',
  14: 'Run 8',
  15: 'Wall Balls',
};

export interface TrackPosition {
  stationIndex: number;
  lapFraction: number;
  continuousPosition: number;
  isFinished: boolean;
  currentActivity: string;
}

/**
 * Converts 0-16 segmentsCompleted into a TrackPosition.
 *
 * Segments are paired: [run, station] x 8 laps.
 * Lap N: run = segment 2N, station = segment 2N+1
 * Within a lap: run done = 0.5, station done = 1.0
 */
export function getTrackPosition(segmentsCompleted: number): TrackPosition {
  const clamped = Math.max(0, Math.min(16, segmentsCompleted));

  if (clamped >= 16) {
    return {
      stationIndex: 7,
      lapFraction: 1.0,
      continuousPosition: 8,
      isFinished: true,
      currentActivity: 'Finished',
    };
  }

  // Each lap is 2 segments (run + station)
  const lap = Math.floor(clamped / 2);
  const withinLap = clamped % 2;

  const lapFraction = withinLap === 0 ? 0 : 0.5;
  const continuousPosition = lap + lapFraction;
  const stationIndex = Math.min(lap, 7);
  const currentActivity = SEGMENT_ACTIVITIES[clamped] || 'Unknown';

  return {
    stationIndex,
    lapFraction,
    continuousPosition,
    isFinished: false,
    currentActivity,
  };
}

/**
 * Converts continuousPosition (0-8) to a percentage (0-100) for horizontal layout.
 */
export function positionToPercent(continuousPosition: number): number {
  return (Math.max(0, Math.min(8, continuousPosition)) / 8) * 100;
}
