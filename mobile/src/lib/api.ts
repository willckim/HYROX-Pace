/**
 * HYROXPace API Service
 * Handles all communication with the backend via Axios
 */

import axios, { AxiosError } from 'axios';
import { AthleteProfile, SimulationResponse, RaceSimulation } from '../types';
import {
  TokenResponse,
  LoginRequest,
  RegisterRequest,
  GoogleAuthRequest,
  UserProfile,
  UserUpdateRequest,
  WearableSyncRequest,
  WearableSyncResponse,
  RedlineAlert,
} from '../types/auth';

// Configure based on environment
// Set to false when backend is running
const USE_MOCK = true;

const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:8000/api/v1'  // Android emulator localhost
  : 'https://api.hyroxpace.com/api/v1'; // Prod: your deployed API

// =============================================================================
// AXIOS CLIENT
// =============================================================================

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error normalization
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status || 0;
    const detail = error.response?.data?.detail || error.message || 'Unknown error';
    throw new ApiError(detail, status);
  },
);

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// =============================================================================
// AUTH TOKEN MANAGEMENT
// =============================================================================

let authToken: string | null = null;
let onAuthExpired: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setOnAuthExpired(callback: (() => void) | null) {
  onAuthExpired = callback;
}

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Augment response interceptor for 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status || 0;
    if (status === 401 && onAuthExpired) {
      onAuthExpired();
    }
    const detail = error.response?.data?.detail || error.message || 'Unknown error';
    throw new ApiError(detail, status);
  },
);

// =============================================================================
// MOCK SIMULATION (offline fallback)
// =============================================================================

/**
 * Generate a mock simulation for offline testing
 * Supports prediction mode and goal mode
 */
function generateMockSimulation(profile: AthleteProfile, goalTimeSeconds?: number): RaceSimulation {
  const fiveKPace = profile.five_k_time_seconds / 5;
  const baseRunTime = Math.round(fiveKPace * 1.1);

  let tier: RaceSimulation['estimated_tier'] = 'intermediate';
  if (profile.five_k_time_seconds < 20 * 60) tier = 'elite';
  else if (profile.five_k_time_seconds < 24 * 60) tier = 'advanced';
  else if (profile.five_k_time_seconds > 30 * 60) tier = 'beginner';

  const segments = [
    { type: 'RUN', name: 'Run 1', baseTime: baseRunTime },
    { type: 'SKI_ERG', name: 'SkiErg', baseTime: 240 },
    { type: 'RUN', name: 'Run 2', baseTime: baseRunTime },
    { type: 'SLED_PUSH', name: 'Sled Push', baseTime: 180 },
    { type: 'RUN', name: 'Run 3', baseTime: baseRunTime },
    { type: 'SLED_PULL', name: 'Sled Pull', baseTime: 240 },
    { type: 'RUN', name: 'Run 4', baseTime: baseRunTime },
    { type: 'BURPEE_BROAD_JUMP', name: 'Burpee BJ', baseTime: 300 },
    { type: 'RUN', name: 'Run 5', baseTime: baseRunTime },
    { type: 'ROW', name: 'Row', baseTime: 240 },
    { type: 'RUN', name: 'Run 6', baseTime: baseRunTime },
    { type: 'FARMERS_CARRY', name: 'Farmers', baseTime: 120 },
    { type: 'RUN', name: 'Run 7', baseTime: baseRunTime },
    { type: 'SANDBAG_LUNGES', name: 'Lunges', baseTime: 270 },
    { type: 'RUN', name: 'Run 8', baseTime: baseRunTime },
    { type: 'WALL_BALLS', name: 'Wall Balls', baseTime: 360 },
  ];

  let predictedTotal = 0;
  let runNum = 0;
  segments.forEach((seg) => {
    if (seg.type === 'RUN') {
      runNum++;
      const degradation = 1 + (runNum - 1) * 0.05;
      predictedTotal += Math.round(seg.baseTime * degradation);
    } else {
      let time = seg.baseTime;
      if (seg.type === 'SLED_PUSH' || seg.type === 'SLED_PULL') {
        if (profile.sled_comfort === 'soul_crushing') time *= 1.3;
        else if (profile.sled_comfort === 'comfortable') time *= 0.85;
      }
      if (seg.type === 'WALL_BALLS') {
        if (profile.wall_ball_unbroken_max < 15) time *= 1.3;
        else if (profile.wall_ball_unbroken_max > 40) time *= 0.85;
      }
      predictedTotal += Math.round(time);
    }
  });

  const roxzoneTime = tier === 'elite' ? 180 : tier === 'advanced' ? 300 : 420;
  predictedTotal += roxzoneTime;

  const isGoalMode = typeof goalTimeSeconds === 'number' && goalTimeSeconds > 0;
  let scaleFactor = 1;
  let goalFeasibility: 'too_fast' | 'aggressive' | 'realistic' | 'easy' = 'realistic';

  if (isGoalMode) {
    scaleFactor = (goalTimeSeconds - roxzoneTime) / (predictedTotal - roxzoneTime);
    const timeDiff = goalTimeSeconds - predictedTotal;
    const percentDiff = (timeDiff / predictedTotal) * 100;

    if (percentDiff < -20) goalFeasibility = 'too_fast';
    else if (percentDiff < -10) goalFeasibility = 'aggressive';
    else if (percentDiff < 10) goalFeasibility = 'realistic';
    else goalFeasibility = 'easy';
  }

  runNum = 0;
  let totalRunTime = 0;
  let totalStationTime = 0;

  const segmentPlans = segments.map((seg, idx) => {
    let time: number;
    let fatigue = Math.min(0.9, idx * 0.05);

    if (seg.type === 'RUN') {
      runNum++;
      const degradation = 1 + (runNum - 1) * 0.05;
      time = Math.round(seg.baseTime * degradation);
      if (isGoalMode) time = Math.round(time * scaleFactor);
      totalRunTime += time;
    } else {
      time = seg.baseTime;
      if (!isGoalMode) {
        if (seg.type === 'SLED_PUSH' || seg.type === 'SLED_PULL') {
          if (profile.sled_comfort === 'soul_crushing') time *= 1.3;
          else if (profile.sled_comfort === 'comfortable') time *= 0.85;
        }
        if (seg.type === 'WALL_BALLS') {
          if (profile.wall_ball_unbroken_max < 15) time *= 1.3;
          else if (profile.wall_ball_unbroken_max > 40) time *= 0.85;
        }
      } else {
        time = Math.round(time * scaleFactor);
      }
      time = Math.round(time);
      totalStationTime += time;
    }

    let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (isGoalMode) {
      if (goalFeasibility === 'too_fast') riskLevel = 'critical';
      else if (goalFeasibility === 'aggressive' && fatigue > 0.4) riskLevel = 'high';
      else if (goalFeasibility === 'aggressive') riskLevel = 'moderate';
      else if (fatigue > 0.6) riskLevel = 'moderate';
    } else {
      riskLevel = fatigue > 0.6 ? 'high' : fatigue > 0.4 ? 'moderate' : 'low';
    }

    return {
      segment_order: idx + 1,
      segment_type: seg.type,
      target_time_seconds: time,
      target_time_display: formatTime(time),
      target_pace_per_km: seg.type === 'RUN' ? formatPace(time) : null,
      effort_percentage: Math.min(100, isGoalMode
        ? Math.round(70 + (1/scaleFactor - 1) * 50 + fatigue * 20)
        : 70 + Math.round(fatigue * 30)),
      fatigue_level_entering: Math.round(fatigue * 100) / 100,
      fatigue_level_exiting: Math.round((fatigue + 0.05) * 100) / 100,
      risk_level: riskLevel,
      risk_reason: riskLevel === 'high' || riskLevel === 'critical'
        ? (isGoalMode ? 'Aggressive pace required for goal' : 'High fatigue accumulated')
        : null,
      execution_cue: getExecutionCue(seg.type, runNum, profile, isGoalMode, goalFeasibility),
    };
  });

  let insights: string[] = [];
  if (isGoalMode) {
    if (goalFeasibility === 'too_fast') {
      insights = [
        `Warning: Goal of ${formatTime(goalTimeSeconds!)} is very aggressive for your fitness level`,
        `Your predicted finish is ${formatTime(predictedTotal)} - goal is ${Math.round((1 - scaleFactor) * 100)}% faster`,
        'Consider a more conservative goal or focus on improving your 5K time first',
      ];
    } else if (goalFeasibility === 'aggressive') {
      insights = [
        `Goal of ${formatTime(goalTimeSeconds!)} is ambitious but possible`,
        `You'll need to execute perfectly - no room for error`,
        'Focus on fast transitions and don\'t go out too hard on Run 1',
      ];
    } else if (goalFeasibility === 'easy') {
      insights = [
        `Goal of ${formatTime(goalTimeSeconds!)} should be comfortable for your fitness`,
        `Your predicted finish is ${formatTime(predictedTotal)} - you could aim faster!`,
        'This gives you buffer for race-day variables',
      ];
    } else {
      insights = [
        `Goal of ${formatTime(goalTimeSeconds!)} is realistic for your fitness`,
        'Stick to these target paces and you\'ll hit your goal',
        'Run 5 and 8 are where most people lose time - stay focused',
      ];
    }
  } else {
    insights = [
      `Estimated ${tier} tier based on your 5K time`,
      'Wall balls and sled pull will be your biggest time differentiators',
      'Run 5 is statistically the slowest - expect a grind',
    ];
  }

  // Mock penalty warnings
  const penaltyWarnings = [];
  if (profile.sled_comfort === 'soul_crushing') {
    penaltyWarnings.push({
      station: 'SLED_PULL',
      rule: 'Athlete must not step in front of the sled pull line',
      time_penalty_seconds: 15,
      description: 'Athletes who struggle with sled pull are more likely to step past the front line under fatigue. 15s first offense, 30s subsequent.',
    });
  }
  if (profile.wall_ball_unbroken_max < 20) {
    penaltyWarnings.push({
      station: 'WALL_BALLS',
      rule: 'Full squat depth required on every rep',
      time_penalty_seconds: 15,
      description: 'Lower wall ball capacity increases risk of cutting squat depth under fatigue. 15s first offense, 30s subsequent.',
    });
  }

  return {
    id: `mock-${Date.now()}`,
    profile_id: `profile-${Date.now()}`,
    created_at: new Date().toISOString(),
    mode: isGoalMode ? 'goal' : 'prediction',
    goal_time_seconds: goalTimeSeconds,
    goal_feasibility: isGoalMode ? goalFeasibility : undefined,
    predictions: {
      conservative_seconds: isGoalMode ? goalTimeSeconds! : Math.round(predictedTotal * 1.05),
      conservative_display: formatTime(isGoalMode ? goalTimeSeconds! : Math.round(predictedTotal * 1.05)),
      likely_seconds: isGoalMode ? goalTimeSeconds! : predictedTotal,
      likely_display: formatTime(isGoalMode ? goalTimeSeconds! : predictedTotal),
      aggressive_seconds: isGoalMode ? goalTimeSeconds! : Math.round(predictedTotal * 0.95),
      aggressive_display: formatTime(isGoalMode ? goalTimeSeconds! : Math.round(predictedTotal * 0.95)),
      confidence_score: isGoalMode
        ? (goalFeasibility === 'realistic' ? 0.75 : goalFeasibility === 'easy' ? 0.9 : goalFeasibility === 'aggressive' ? 0.4 : 0.15)
        : 0.72,
      predicted_finish_seconds: predictedTotal,
      predicted_finish_display: formatTime(predictedTotal),
    },
    segment_plans: segmentPlans,
    risk_analysis: {
      high_risk_segments: segmentPlans.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').map(s => s.segment_order),
      danger_runs: [5, 8],
      primary_limiter: isGoalMode
        ? (goalFeasibility === 'too_fast' || goalFeasibility === 'aggressive' ? 'goal_pace' : 'execution')
        : (profile.five_k_time_seconds > 26 * 60 ? 'aerobic' : 'pacing'),
      limiter_explanation: isGoalMode
        ? (goalFeasibility === 'too_fast'
            ? 'Your goal requires paces faster than your current fitness supports.'
            : goalFeasibility === 'aggressive'
            ? 'You\'ll need to push hard. Every second counts.'
            : 'Stick to the plan and you\'ll hit your target.')
        : (profile.five_k_time_seconds > 26 * 60
            ? 'Running will be your main challenge. Focus on consistent pacing.'
            : 'Your fitness is solid. Success depends on smart pacing and execution.'),
      blow_up_probability: isGoalMode
        ? (goalFeasibility === 'too_fast' ? 0.8 : goalFeasibility === 'aggressive' ? 0.5 : 0.2)
        : (tier === 'beginner' ? 0.45 : tier === 'intermediate' ? 0.3 : 0.15),
      blow_up_zone: 'Run 5 (mid-race wall)',
    },
    penalty_warnings: penaltyWarnings,
    insights,
    total_run_time_seconds: totalRunTime,
    total_station_time_seconds: totalStationTime,
    total_roxzone_time_seconds: roxzoneTime,
    estimated_tier: tier,
  };
}

function getExecutionCue(type: string, runNum: number, profile: AthleteProfile, isGoalMode: boolean, feasibility?: string): string {
  if (type === 'RUN') {
    if (isGoalMode && (feasibility === 'aggressive' || feasibility === 'too_fast')) {
      if (runNum === 1) return 'Hit target pace immediately - no time to ease in';
      if (runNum === 5) return 'Critical: Do NOT slow down here';
      if (runNum === 8) return 'Final push - leave nothing behind';
      return 'Maintain pace - check your watch';
    }
    if (runNum === 1) return 'Controlled start, find your rhythm';
    if (runNum === 5) return 'Mid-race grind - stay mentally engaged';
    if (runNum === 8) return 'Final push - empty the tank';
    return 'Steady effort, controlled breathing';
  }

  const cues: Record<string, string> = {
    'SKI_ERG': isGoalMode ? 'Quick start, maintain power output' : 'Powerful pulls, pace the first 500m',
    'SLED_PUSH': isGoalMode ? 'Fast feet, stay low, no stopping' : 'Stay low, drive through legs',
    'SLED_PULL': isGoalMode ? 'Quick hands, no pausing' : 'Hand over hand rhythm, steady pace',
    'BURPEE_BROAD_JUMP': isGoalMode ? 'Controlled but quick - find a rhythm' : 'Controlled jumps, land soft',
    'ROW': isGoalMode ? 'Strong rate, hit your split' : 'Strong drive, quick recovery',
    'FARMERS_CARRY': isGoalMode ? 'Go! No putting down' : 'Grip and go, short quick steps',
    'SANDBAG_LUNGES': isGoalMode ? 'Step through quickly, no rest' : 'Step through, keep bag stable',
    'WALL_BALLS': isGoalMode
      ? 'Break strategy: go hard, short rests'
      : (profile.wall_ball_unbroken_max < 20 ? 'Break early: 10-10-10 pattern' : 'Catch and throw rhythm'),
  };

  return cues[type] || 'Steady effort';
}

// =============================================================================
// API FUNCTIONS (Axios-based with mock fallback)
// =============================================================================

/**
 * Run a race simulation
 */
export async function runSimulation(profile: AthleteProfile, goalTimeSeconds?: number): Promise<SimulationResponse> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const simulation = generateMockSimulation(profile, goalTimeSeconds);
    return { simulation, shareable_link: `/share/${simulation.id}` };
  }

  const payload = goalTimeSeconds
    ? { profile: { ...profile, goal_time_seconds: goalTimeSeconds } }
    : { profile };
  const { data } = await apiClient.post<SimulationResponse>('/simulate', payload);
  return data;
}

/**
 * Quick simulation (profile directly, no wrapper)
 */
export async function quickSimulation(profile: AthleteProfile, goalTimeSeconds?: number): Promise<RaceSimulation> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return generateMockSimulation(profile, goalTimeSeconds);
  }

  const payload = goalTimeSeconds
    ? { ...profile, goal_time_seconds: goalTimeSeconds }
    : profile;
  const { data } = await apiClient.post<RaceSimulation>('/simulate/quick', payload);
  return data;
}

/**
 * Get available divisions
 */
export async function getDivisions() {
  const { data } = await apiClient.get<{ divisions: Array<{ value: string; label: string; description: string }> }>('/divisions');
  return data;
}

/**
 * Get benchmarks for a division
 */
export async function getBenchmarks(division: string) {
  const { data } = await apiClient.get<{
    division: string;
    weights: Record<string, number>;
    finish_time_benchmarks: Record<string, { min_seconds: number; max_seconds: number; min_display: string; max_display: string }>;
  }>(`/benchmarks/${division}`);
  return data;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await apiClient.get<{ status: string }>('/health', {
    baseURL: API_BASE_URL.replace('/api/v1', ''),
  });
  return data;
}

// =============================================================================
// MOCK AUTH (offline fallback when USE_MOCK = true)
// =============================================================================

function generateMockUser(email: string, displayName?: string): UserProfile {
  return {
    id: `mock-user-${Date.now()}`,
    email,
    display_name: displayName || email.split('@')[0],
    max_hr: null,
    google_id: null,
    created_at: new Date().toISOString(),
  };
}

function generateMockToken(user: UserProfile): TokenResponse {
  return {
    access_token: `mock-jwt-${Date.now()}`,
    token_type: 'bearer',
    user,
  };
}

// =============================================================================
// AUTH API FUNCTIONS
// =============================================================================

export async function loginUser(request: LoginRequest): Promise<TokenResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 500));
    return generateMockToken(generateMockUser(request.email));
  }
  const { data } = await apiClient.post<TokenResponse>('/auth/login', request);
  return data;
}

export async function registerUser(request: RegisterRequest): Promise<TokenResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 500));
    return generateMockToken(generateMockUser(request.email, request.display_name));
  }
  const { data } = await apiClient.post<TokenResponse>('/auth/register', request);
  return data;
}

export async function googleAuth(request: GoogleAuthRequest): Promise<TokenResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 500));
    return generateMockToken(generateMockUser('google-user@gmail.com', 'Google User'));
  }
  const { data } = await apiClient.post<TokenResponse>('/auth/google', request);
  return data;
}

export async function getMe(): Promise<UserProfile> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    // In mock mode, return a stored-feeling user so loadToken() succeeds
    return generateMockUser('mock@hyroxpace.dev', 'Mock Athlete');
  }
  const { data } = await apiClient.get<UserProfile>('/auth/me');
  return data;
}

export async function updateMe(request: UserUpdateRequest): Promise<UserProfile> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    return { ...generateMockUser('mock@hyroxpace.dev'), ...request };
  }
  const { data } = await apiClient.patch<UserProfile>('/auth/me', request);
  return data;
}

// =============================================================================
// WEARABLE API FUNCTIONS
// =============================================================================

export async function syncWearableData(request: WearableSyncRequest): Promise<WearableSyncResponse> {
  if (USE_MOCK) {
    return { samples_stored: request.samples.length, alerts_generated: 0, active_alerts: [] };
  }
  const { data } = await apiClient.post<WearableSyncResponse>('/wearable/sync', request);
  return data;
}

export async function getActiveAlerts(): Promise<RedlineAlert[]> {
  if (USE_MOCK) return [];
  const { data } = await apiClient.get<RedlineAlert[]>('/wearable/alerts');
  return data;
}

export async function getCompetitorAlerts(competitorId: string): Promise<RedlineAlert[]> {
  if (USE_MOCK) return [];
  const { data } = await apiClient.get<RedlineAlert[]>(`/wearable/alerts/${competitorId}`);
  return data;
}

export async function resolveAlert(alertId: string): Promise<RedlineAlert> {
  if (USE_MOCK) {
    return { id: alertId, triggered_at: '', hr_avg: 0, hr_max_pct: 0, duration_seconds: 0, recovery_tip: '', resolved_at: new Date().toISOString() };
  }
  const { data } = await apiClient.post<RedlineAlert>(`/wearable/alerts/${alertId}/resolve`);
  return data;
}

// =============================================================================
// LIVE RACE TYPES & ENDPOINTS
// =============================================================================

export interface LiveCompetitorStatus {
  id: string;
  name: string;
  segment_index: number;
  elapsed_seconds: number;
  progress_pct: number;
}

export interface LiveRaceStatus {
  race_id: string;
  competitors: LiveCompetitorStatus[];
  updated_at: string;
}

export async function getLiveRaces(): Promise<LiveRaceStatus[]> {
  if (USE_MOCK) return [];
  const { data } = await apiClient.get<LiveRaceStatus[]>('/live/races');
  return data;
}

export async function getLiveRaceStatus(raceId: string): Promise<LiveRaceStatus> {
  if (USE_MOCK) {
    return { race_id: raceId, competitors: [], updated_at: new Date().toISOString() };
  }
  const { data } = await apiClient.get<LiveRaceStatus>(`/live/races/${raceId}`);
  return data;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert form state to API profile format
 */
export function formStateToProfile(form: {
  five_k_minutes: string;
  five_k_seconds: string;
  swim_background: string;
  sled_comfort: string;
  wall_ball_max: string;
  lunge_tolerance: string;
  weight_kg: string;
  gender: string;
  age_group: string;
  division: string;
  race_strategy: string;
}): AthleteProfile {
  const fiveKMinutes = parseInt(form.five_k_minutes) || 0;
  const fiveKSeconds = parseInt(form.five_k_seconds) || 0;

  return {
    five_k_time_seconds: fiveKMinutes * 60 + fiveKSeconds,
    swim_background: form.swim_background as AthleteProfile['swim_background'],
    sled_comfort: form.sled_comfort as AthleteProfile['sled_comfort'],
    wall_ball_unbroken_max: parseInt(form.wall_ball_max) || 10,
    lunge_tolerance: form.lunge_tolerance as AthleteProfile['lunge_tolerance'],
    weight_kg: parseFloat(form.weight_kg) || 75,
    gender: form.gender as AthleteProfile['gender'],
    age_group: form.age_group,
    division: form.division as AthleteProfile['division'],
    race_strategy: form.race_strategy as AthleteProfile['race_strategy'],
  };
}

/**
 * Format seconds to display time (M:SS or H:MM:SS)
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace as M:SS/km
 */
function formatPace(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}/km`;
}

/**
 * Get color for risk level
 */
export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'low': return '#22c55e';      // green
    case 'moderate': return '#eab308'; // yellow
    case 'high': return '#f97316';     // orange
    case 'critical': return '#ef4444'; // red
    default: return '#6b7280';         // gray
  }
}

/**
 * Get tier display name
 */
export function getTierDisplay(tier: string): string {
  const displays: Record<string, string> = {
    elite: 'Elite',
    advanced: 'Advanced',
    intermediate: 'Intermediate',
    beginner: 'Beginner',
    recreational: 'Recreational',
  };
  return displays[tier] || tier;
}

/**
 * Get feasibility display
 */
export function getFeasibilityDisplay(feasibility: string): { label: string; color: string; emoji: string } {
  switch (feasibility) {
    case 'too_fast': return { label: 'Very Aggressive', color: '#ef4444', emoji: '!!' };
    case 'aggressive': return { label: 'Aggressive', color: '#f97316', emoji: '>>' };
    case 'realistic': return { label: 'Realistic', color: '#22c55e', emoji: 'OK' };
    case 'easy': return { label: 'Comfortable', color: '#3b82f6', emoji: '--' };
    default: return { label: 'Unknown', color: '#6b7280', emoji: '??' };
  }
}

export default {
  runSimulation,
  quickSimulation,
  getDivisions,
  getBenchmarks,
  healthCheck,
  formStateToProfile,
  formatTime,
  getRiskColor,
  getTierDisplay,
  getFeasibilityDisplay,
  loginUser,
  registerUser,
  googleAuth,
  getMe,
  updateMe,
  syncWearableData,
  getActiveAlerts,
  getCompetitorAlerts,
  resolveAlert,
  getLiveRaces,
  getLiveRaceStatus,
};
