/**
 * Auth store — manages JWT token, user profile, and auth state.
 * Token persisted in expo-secure-store.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  loginUser,
  registerUser,
  googleAuth,
  getMe,
  updateMe,
  setAuthToken,
  setOnAuthExpired,
} from '../lib/api';
import { UserProfile, UserUpdateRequest } from '../types/auth';

const TOKEN_KEY = 'hyroxpace_auth_token';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, displayName?: string): Promise<void>;
  googleSignIn(idToken: string): Promise<void>;
  logout(): Promise<void>;
  loadToken(): Promise<void>;
  updateProfile(updates: UserUpdateRequest): Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Wire up 401 handler to auto-logout
  setOnAuthExpired(() => {
    get().logout();
  });

  return {
    token: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,

    async login(email: string, password: string) {
      const response = await loginUser({ email, password });
      setAuthToken(response.access_token);
      await SecureStore.setItemAsync(TOKEN_KEY, response.access_token);
      set({
        token: response.access_token,
        user: response.user,
        isAuthenticated: true,
      });
    },

    async register(email: string, password: string, displayName?: string) {
      const response = await registerUser({ email, password, display_name: displayName });
      setAuthToken(response.access_token);
      await SecureStore.setItemAsync(TOKEN_KEY, response.access_token);
      set({
        token: response.access_token,
        user: response.user,
        isAuthenticated: true,
      });
    },

    async googleSignIn(idToken: string) {
      const response = await googleAuth({ id_token: idToken });
      setAuthToken(response.access_token);
      await SecureStore.setItemAsync(TOKEN_KEY, response.access_token);
      set({
        token: response.access_token,
        user: response.user,
        isAuthenticated: true,
      });
    },

    async logout() {
      setAuthToken(null);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({
        token: null,
        user: null,
        isAuthenticated: false,
      });
    },

    async loadToken() {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          setAuthToken(stored);
          const user = await getMe();
          set({
            token: stored,
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      } catch {
        // Token expired or invalid — clear it
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setAuthToken(null);
        set({ isLoading: false });
      }
    },

    async updateProfile(updates: UserUpdateRequest) {
      const updated = await updateMe(updates);
      set({ user: updated });
    },
  };
});
