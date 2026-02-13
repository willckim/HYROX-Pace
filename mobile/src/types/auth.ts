/**
 * Authentication types — mirrors backend auth schemas.
 */

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  max_hr: number | null;
  google_id: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface GoogleAuthRequest {
  id_token: string;
}

export interface UserUpdateRequest {
  display_name?: string;
  max_hr?: number;
}

export interface RedlineAlert {
  id: string;
  triggered_at: string;
  hr_avg: number;
  hr_max_pct: number;
  duration_seconds: number;
  recovery_tip: string;
  resolved_at: string | null;
}

export interface WearableSyncRequest {
  competitor_id?: string;
  samples: Array<{
    timestamp: string;
    heart_rate?: number;
    active_calories?: number;
  }>;
}

export interface WearableSyncResponse {
  samples_stored: number;
  alerts_generated: number;
  active_alerts: RedlineAlert[];
}
