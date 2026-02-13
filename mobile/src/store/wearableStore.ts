/**
 * Wearable store — manages wearable connection, monitoring state, and alerts.
 */

import { create } from 'zustand';
import { WearableService } from '../services/WearableService';
import { getActiveAlerts, getCompetitorAlerts, resolveAlert as apiResolveAlert } from '../lib/api';
import { RedlineAlert } from '../types/auth';

interface WearableState {
  isConnected: boolean;
  isMonitoring: boolean;
  currentHR: number | null;
  activeAlerts: RedlineAlert[];

  connect(): Promise<boolean>;
  startMonitoring(competitorId?: string): Promise<void>;
  stopMonitoring(): void;
  fetchAlerts(competitorId?: string): Promise<void>;
  dismissAlert(alertId: string): Promise<void>;
}

export const useWearableStore = create<WearableState>((set, get) => ({
  isConnected: false,
  isMonitoring: false,
  currentHR: null,
  activeAlerts: [],

  async connect() {
    if (!WearableService.isAvailable()) {
      return false;
    }
    const granted = await WearableService.requestPermissions();
    set({ isConnected: granted });
    return granted;
  },

  async startMonitoring(competitorId?: string) {
    const { isConnected } = get();
    if (!isConnected) {
      const granted = await get().connect();
      if (!granted) return;
    }

    WearableService.startMonitoring(competitorId);
    set({ isMonitoring: true });

    // Start a local HR reader for UI display
    const updateHR = async () => {
      const { heartRate } = await WearableService.readLatestHR();
      if (heartRate !== null) {
        set({ currentHR: heartRate });
      }
    };
    updateHR();
  },

  stopMonitoring() {
    WearableService.stopMonitoring();
    set({ isMonitoring: false, currentHR: null });
  },

  async fetchAlerts(competitorId?: string) {
    try {
      const alerts = competitorId
        ? await getCompetitorAlerts(competitorId)
        : await getActiveAlerts();
      set({ activeAlerts: alerts });
    } catch {
      // Silently fail
    }
  },

  async dismissAlert(alertId: string) {
    try {
      await apiResolveAlert(alertId);
      set((state) => ({
        activeAlerts: state.activeAlerts.filter((a) => a.id !== alertId),
      }));
    } catch {
      // Silently fail
    }
  },
}));
