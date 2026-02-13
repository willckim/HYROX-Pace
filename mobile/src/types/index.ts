/**
 * HYROXPace TypeScript Types
 * Mirrors backend Pydantic schemas
 */

// =============================================================================
// ENUMS
// =============================================================================

export type Division = 
  | 'mens_pro'
  | 'mens_open'
  | 'womens_pro'
  | 'womens_open'
  | 'doubles_men'
  | 'doubles_women'
  | 'doubles_mixed';

export type Gender = 'male' | 'female';

export type SwimBackground = 'none' | 'recreational' | 'competitive';

export type SledComfort = 'comfortable' | 'manageable' | 'soul_crushing';

export type LungeTolerance = 'strong' | 'moderate' | 'weak';

export type RaceStrategy = 'finish_strong' | 'send_it';

export type PerformanceTier = 'elite' | 'advanced' | 'intermediate' | 'beginner' | 'recreational';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface AthleteProfile {
  // Engine metrics
  five_k_time_seconds: number;
  mile_time_seconds?: number;
  swim_background: SwimBackground;
  weekly_aerobic_hours?: number;

  // Strength metrics
  sled_comfort: SledComfort;
  wall_ball_unbroken_max: number;
  lunge_tolerance: LungeTolerance;

  // Body context
  weight_kg: number;
  height_cm?: number;
  gender: Gender;
  age_group: string;

  // Race context
  division: Division;
  race_strategy: RaceStrategy;
  target_event_date?: string;

  // Goal mode
  goal_time_seconds?: number;
}

// =============================================================================
// OUTPUT TYPES
// =============================================================================

export interface SegmentPlan {
  segment_order: number;
  segment_type: string;
  
  target_time_seconds: number;
  target_time_display: string;
  target_pace_per_km: string | null;
  
  effort_percentage: number;
  fatigue_level_entering: number;
  fatigue_level_exiting: number;
  
  risk_level: RiskLevel;
  risk_reason: string | null;
  
  execution_cue: string;
}

export interface FinishTimePrediction {
  conservative_seconds: number;
  conservative_display: string;
  
  likely_seconds: number;
  likely_display: string;
  
  aggressive_seconds: number;
  aggressive_display: string;
  
  confidence_score: number;
  
  // For goal mode - the fitness-based prediction
  predicted_finish_seconds?: number;
  predicted_finish_display?: string;
}

export interface RiskAnalysis {
  high_risk_segments: number[];
  danger_runs: number[];
  
  primary_limiter: string;
  limiter_explanation: string;
  
  blow_up_probability: number;
  blow_up_zone: string | null;
}

export interface PenaltyWarning {
  station: string;
  rule: string;
  time_penalty_seconds: number;
  description: string;
}

export interface GoalImpossibilityFlag {
  is_impossible: boolean;
  reason: string;
  required_avg_run_pace_seconds: number;
  athlete_5k_pace_seconds: number;
  pace_deficit_percentage: number;
}

export interface RaceSimulation {
  id: string;
  profile_id: string;
  created_at: string;

  // Mode indicator
  mode?: 'prediction' | 'goal';
  goal_time_seconds?: number;
  goal_feasibility?: 'too_fast' | 'aggressive' | 'realistic' | 'easy';

  predictions: FinishTimePrediction;
  segment_plans: SegmentPlan[];
  risk_analysis: RiskAnalysis;

  // 2026 penalty warnings
  penalty_warnings?: PenaltyWarning[];

  // Goal impossibility flag
  goal_impossibility?: GoalImpossibilityFlag;

  insights: string[];

  total_run_time_seconds: number;
  total_station_time_seconds: number;
  total_roxzone_time_seconds: number;

  estimated_tier: PerformanceTier;
}

export interface SimulationResponse {
  simulation: RaceSimulation;
  shareable_link: string | null;
}

// =============================================================================
// UI HELPER TYPES
// =============================================================================

export interface DivisionOption {
  value: Division;
  label: string;
  description: string;
}

export interface IntakeStep {
  id: string;
  title: string;
  description: string;
}

export const DIVISIONS: DivisionOption[] = [
  { value: 'mens_pro', label: "Men's Pro", description: 'Heaviest weights, fastest competition' },
  { value: 'mens_open', label: "Men's Open", description: 'Standard men\'s division' },
  { value: 'womens_pro', label: "Women's Pro", description: 'Heaviest women\'s weights' },
  { value: 'womens_open', label: "Women's Open", description: 'Standard women\'s division' },
  { value: 'doubles_men', label: 'Doubles Men', description: 'Two male athletes' },
  { value: 'doubles_women', label: 'Doubles Women', description: 'Two female athletes' },
  { value: 'doubles_mixed', label: 'Doubles Mixed', description: 'One male, one female' },
];

export const AGE_GROUPS = [
  '18-24', '25-29', '30-34', '35-39', '40-44', 
  '45-49', '50-54', '55-59', '60+'
];

// =============================================================================
// FORM STATE
// =============================================================================

export interface IntakeFormState {
  // Step 1: Engine
  five_k_minutes: string;
  five_k_seconds: string;
  swim_background: SwimBackground;
  
  // Step 2: Strength
  sled_comfort: SledComfort;
  wall_ball_max: string;
  lunge_tolerance: LungeTolerance;
  
  // Step 3: Body & Context
  weight_kg: string;
  gender: Gender;
  age_group: string;
  division: Division;
  race_strategy: RaceStrategy;
}

export const DEFAULT_FORM_STATE: IntakeFormState = {
  five_k_minutes: '',
  five_k_seconds: '',
  swim_background: 'none',
  sled_comfort: 'manageable',
  wall_ball_max: '',
  lunge_tolerance: 'moderate',
  weight_kg: '',
  gender: 'male',
  age_group: '25-29',
  division: 'mens_open',
  race_strategy: 'finish_strong',
};