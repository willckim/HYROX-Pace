/**
 * CoachEngine — Deterministic coach rules engine.
 * Pure functions, no side effects. Priority-ordered rules (first match wins).
 */

export interface RaceState {
  currentSegmentIndex: number;
  currentSegmentType: string;
  elapsedSeconds: number;
  targetElapsedSeconds: number;
  currentHR: number | null;
  maxHR: number | null;
  competitorDelta: number | null; // positive = competitor ahead
}

export type CoachPriority = 'critical' | 'warning' | 'info';

export interface CoachTip {
  message: string;
  priority: CoachPriority;
  context: string;
}

const SEGMENT_TIPS: Record<string, string> = {
  RUN: 'Steady rhythm, controlled breathing.',
  SKI_ERG: 'Powerful pulls, pace the first 500m.',
  SLED_PUSH: 'Stay low, drive through your legs.',
  SLED_PULL: 'Hand over hand rhythm, steady pace.',
  BURPEE_BROAD_JUMP: 'Controlled jumps, land soft.',
  ROW: 'Strong drive, quick recovery.',
  FARMERS_CARRY: 'Grip and go, short quick steps.',
  SANDBAG_LUNGES: 'Step through, keep bag stable.',
  WALL_BALLS: 'Catch and throw rhythm, break at 10s.',
};

export function evaluate(state: RaceState): CoachTip {
  const {
    currentSegmentIndex,
    currentSegmentType,
    elapsedSeconds,
    targetElapsedSeconds,
    currentHR,
    maxHR,
    competitorDelta,
  } = state;

  const hrPct = currentHR && maxHR ? currentHR / maxHR : 0;
  const delta = elapsedSeconds - targetElapsedSeconds;
  const isEarlyRace = currentSegmentIndex < 6;

  // Rule 1: HR >= 93% max → critical
  if (hrPct >= 0.93) {
    return {
      message: 'HR critical -- walk first 100m after station.',
      priority: 'critical',
      context: `HR at ${Math.round(hrPct * 100)}% of max`,
    };
  }

  // Rule 2: >30s ahead of plan in early runs → warning
  if (delta < -30 && isEarlyRace) {
    const ahead = Math.abs(Math.round(delta));
    return {
      message: `${ahead}s ahead -- hold back. Save for Run 5+.`,
      priority: 'warning',
      context: 'Pacing too fast early',
    };
  }

  // Rule 3: >20s behind plan → warning
  if (delta > 20) {
    const behind = Math.round(delta);
    return {
      message: `${behind}s behind. Steady effort, don't panic.`,
      priority: 'warning',
      context: 'Behind target pace',
    };
  }

  // Rule 4: HR 85-93% max → info
  if (hrPct >= 0.85 && hrPct < 0.93) {
    return {
      message: 'HR elevated. Controlled breathing.',
      priority: 'info',
      context: `HR at ${Math.round(hrPct * 100)}% of max`,
    };
  }

  // Rule 5: Competitor >15s ahead → info
  if (competitorDelta !== null && competitorDelta > 15) {
    const ahead = Math.round(competitorDelta);
    return {
      message: `Competitor ${ahead}s ahead. Stick to YOUR plan.`,
      priority: 'info',
      context: 'Competitor gap',
    };
  }

  // Rule 6: Default segment-specific tip
  const tip = SEGMENT_TIPS[currentSegmentType] || 'Stay focused, keep moving.';
  return {
    message: tip,
    priority: 'info',
    context: `Segment ${currentSegmentIndex + 1}/16`,
  };
}
