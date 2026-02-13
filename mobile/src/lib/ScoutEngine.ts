/**
 * ScoutEngine — Deterministic race_scout-style insight generator.
 * Pure function, no LLM. Priority-ordered rules (first applicable wins).
 */

import { Participant } from '../store/dashboardStore';
import { getTrackPosition, STATION_SHORT_LABELS } from './RaceTrackMapper';

export type ScoutCategory =
  | 'gap_analysis'
  | 'pace_projection'
  | 'critical_moment'
  | 'general';

export interface ScoutInsight {
  headline: string;
  detail: string;
  category: ScoutCategory;
}

const HARD_STATION_TIPS: Record<string, string> = {
  'Sled Pull':
    'Sled Pull is a grip-killer. Hand-over-hand rhythm — short pulls, never stop moving. Save legs for the run after.',
  'Burpee BJ':
    'Burpee Broad Jumps tax the legs hard. Controlled landings, step back instead of jumping back to save energy.',
  'Lunges':
    'Lunges are the quad-burner. Short steps, upright torso. Break into sets of 10 if needed — walking rest costs less than blowing up.',
  'Wall Balls':
    'Wall Balls are the final push. Break early (sets of 10-15) rather than going to failure. Catch-and-throw rhythm is everything.',
};

const HARD_STATIONS = new Set(['Sled Pull', 'Burpee BJ', 'Lunges', 'Wall Balls']);

/**
 * Estimate what segment a participant "should" be at based on elapsed time.
 * Uses ~270s per segment as a reference pace.
 */
function expectedSegments(elapsedSeconds: number): number {
  return elapsedSeconds / 270;
}

export function generateInsight(
  user: Participant,
  competitors: Participant[],
): ScoutInsight {
  const userPos = getTrackPosition(user.segmentsCompleted);
  const leader = competitors.reduce<Participant | null>((best, c) => {
    if (!best) return c;
    return c.segmentsCompleted > best.segmentsCompleted ? c : best;
  }, null);

  // Rule 1: Gap analysis — leader >=2 segments ahead
  if (leader && leader.segmentsCompleted - user.segmentsCompleted >= 2) {
    const gap = leader.segmentsCompleted - user.segmentsCompleted;
    const leaderPos = getTrackPosition(leader.segmentsCompleted);
    const passStation = STATION_SHORT_LABELS[Math.min(userPos.stationIndex + 1, 7)];
    return {
      headline: `${leader.name} is ${gap} segments ahead`,
      detail: `They're at ${leaderPos.currentActivity}. Your best chance to close: ${passStation} station — fast transition, no rest between.`,
      category: 'gap_analysis',
    };
  }

  // Rule 1b: Gap analysis — leader 0-1 segments ahead but >30s elapsed gap
  if (leader) {
    const segDiff = leader.segmentsCompleted - user.segmentsCompleted;
    const timeDiff = leader.elapsedSeconds - user.elapsedSeconds;
    if (segDiff >= 0 && segDiff <= 1 && Math.abs(timeDiff) > 30) {
      const ahead = timeDiff > 0;
      const gapSec = Math.abs(timeDiff);
      if (ahead) {
        return {
          headline: `${leader.name} is ${gapSec}s slower — closeable`,
          detail: `Only ${segDiff} segment${segDiff === 1 ? '' : 's'} apart and they're burning more time. Maintain your pace and you'll pull away.`,
          category: 'gap_analysis',
        };
      } else {
        return {
          headline: `${gapSec}s gap to ${leader.name} — within striking distance`,
          detail: `They're faster by ${gapSec}s but only ${segDiff} segment${segDiff === 1 ? '' : 's'} ahead. A fast station transition can close this.`,
          category: 'gap_analysis',
        };
      }
    }
  }

  // Rule 2: Pace projection — >45s behind expected
  const expected = expectedSegments(user.elapsedSeconds);
  const paceDelta = user.segmentsCompleted - expected;
  const behindSeconds = -paceDelta * 270;

  if (behindSeconds > 45) {
    const behind = Math.round(behindSeconds);
    return {
      headline: `~${behind}s behind target pace`,
      detail: 'Don\'t panic — reduce transition time between stations. Walk-jog the first 200m of runs, then build.',
      category: 'pace_projection',
    };
  }

  // Rule 2b: Pace projection — >45s ahead in first half
  if (behindSeconds < -45 && user.segmentsCompleted < 8) {
    const ahead = Math.round(Math.abs(behindSeconds));
    return {
      headline: `${ahead}s ahead of pace — banking time early`,
      detail: 'You have a buffer, but blowing up in the second half is the #1 HYROX mistake. Ease off 5% on the next run.',
      category: 'pace_projection',
    };
  }

  // Rule 3: Critical moment — approaching a hard station
  const currentActivity = userPos.currentActivity;
  // Check if user is on a run and next segment is a hard station
  if (currentActivity.startsWith('Run') && user.segmentsCompleted < 15) {
    const nextSegmentIndex = user.segmentsCompleted + 1;
    const nextNames: Record<number, string> = {
      5: 'Sled Pull',
      7: 'Burpee BJ',
      13: 'Lunges',
      15: 'Wall Balls',
    };
    const nextStation = nextNames[nextSegmentIndex];
    if (nextStation && HARD_STATIONS.has(nextStation)) {
      return {
        headline: `${nextStation} is next — prepare now`,
        detail: HARD_STATION_TIPS[nextStation],
        category: 'critical_moment',
      };
    }
  }

  // Also trigger if currently ON a hard station
  if (HARD_STATIONS.has(currentActivity)) {
    return {
      headline: `In ${currentActivity} — stay composed`,
      detail: HARD_STATION_TIPS[currentActivity],
      category: 'critical_moment',
    };
  }

  // Rule 4: General — current activity + stations remaining
  const stationsLeft = 8 - Math.ceil(user.segmentsCompleted / 2);
  return {
    headline: `${currentActivity} — ${stationsLeft} station${stationsLeft !== 1 ? 's' : ''} remaining`,
    detail: 'Steady rhythm. Focus on smooth transitions — every second saved between stations adds up.',
    category: 'general',
  };
}
