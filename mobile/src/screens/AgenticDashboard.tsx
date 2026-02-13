/**
 * AgenticDashboard — "Brain" screen combining live race tracking,
 * coach insights, wearable connections, and redline alerts.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDashboardStore, getSegmentType, formatElapsed } from '../store/dashboardStore';
import { useWearableStore } from '../store/wearableStore';
import { useAuthStore } from '../store/authStore';
import { evaluate, CoachTip } from '../lib/CoachEngine';
import RedlineOverlay from '../components/RedlineOverlay';

const TICK_INTERVAL = 10_000; // 10 seconds

export default function AgenticDashboard() {
  const { participants, initLiveRace, updateElapsed, reset } = useDashboardStore();
  const { activeAlerts, dismissAlert, currentHR } = useWearableStore();
  const { user } = useAuthStore();
  const [coachTip, setCoachTip] = useState<CoachTip | null>(null);
  const [garminConnected, setGarminConnected] = useState(false);
  const [watchStatus, setWatchStatus] = useState<'idle' | 'connected' | 'unavailable'>('idle');
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateCoach = useCallback(() => {
    const userParticipant = useDashboardStore.getState().participants.find(p => p.isUser);
    if (!userParticipant) return;

    const alice = useDashboardStore.getState().participants.find(p => p.id === 'alice');
    const competitorDelta = alice
      ? (alice.segmentsCompleted - userParticipant.segmentsCompleted) * 180
      : null;

    // Target: ~300s per segment (8 runs * 300 + 8 stations * 240 ≈ 4320 total)
    const targetElapsed = userParticipant.segmentsCompleted * 300;

    const tip = evaluate({
      currentSegmentIndex: userParticipant.currentSegmentIndex,
      currentSegmentType: getSegmentType(userParticipant.currentSegmentIndex),
      elapsedSeconds: userParticipant.elapsedSeconds,
      targetElapsedSeconds: targetElapsed,
      currentHR: useWearableStore.getState().currentHR,
      maxHR: user?.max_hr || null,
      competitorDelta,
    });
    setCoachTip(tip);
  }, [user?.max_hr]);

  useEffect(() => {
    initLiveRace('You');
    updateCoach();

    tickRef.current = setInterval(() => {
      updateCoach();
    }, TICK_INTERVAL);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      reset();
    };
  }, []);

  const handleAppleWatch = async () => {
    const { connect } = useWearableStore.getState();
    const granted = await connect();
    setWatchStatus(granted ? 'connected' : 'unavailable');
  };

  const handleGarmin = () => {
    Alert.alert(
      'Garmin Connect',
      'Authorize HYROXPace to access your Garmin data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Authorize',
          onPress: () => {
            setTimeout(() => {
              setGarminConnected(true);
            }, 500);
          },
        },
      ],
    );
  };

  const topAlert = activeAlerts.length > 0 ? activeAlerts[0] : null;

  const priorityColor: Record<string, string> = {
    critical: '#ef4444',
    warning: '#f97316',
    info: '#3b82f6',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Text style={styles.header}>Dashboard</Text>

        {/* A. Redline Alert */}
        {topAlert && (
          <RedlineOverlay
            alert={topAlert}
            onDismiss={() => dismissAlert(topAlert.id)}
          />
        )}

        {/* B. Live Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.pulseDot} />
            <Text style={styles.sectionTitle}>Live Race</Text>
          </View>

          {participants.map((p) => {
            const progress = p.segmentsCompleted / 16;
            const barColor = p.isUser ? '#f97316' : '#60a5fa';
            const nameColor = p.isUser ? '#f97316' : '#60a5fa';

            // Calculate time delta vs user
            const userP = participants.find(u => u.isUser);
            let deltaText = '';
            if (!p.isUser && userP) {
              const diff = p.elapsedSeconds - userP.elapsedSeconds;
              const absDiff = Math.abs(diff);
              const m = Math.floor(absDiff / 60);
              const s = absDiff % 60;
              const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
              deltaText = diff > 0
                ? `+${timeStr} ahead of You`
                : diff < 0
                  ? `-${timeStr} behind You`
                  : 'Even';
            }

            return (
              <View key={p.id} style={styles.participantCard}>
                <Text style={[styles.participantName, { color: nameColor }]}>
                  {p.name}
                </Text>
                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.round(progress * 100)}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>
                <Text style={styles.participantStatus}>
                  {p.segmentsCompleted}/16 segments | {formatElapsed(p.elapsedSeconds)} | {p.lastStationName}
                </Text>
                {deltaText !== '' && (
                  <Text style={styles.deltaText}>{deltaText}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* C. Coach Insight */}
        {coachTip && (
          <View style={styles.section}>
            <View
              style={[
                styles.coachCard,
                { borderLeftColor: priorityColor[coachTip.priority] || '#3b82f6' },
              ]}
            >
              <Text style={styles.coachLabel}>Coach</Text>
              <Text style={styles.coachMessage}>{coachTip.message}</Text>
              <Text style={styles.coachContext}>{coachTip.context}</Text>
            </View>
          </View>
        )}

        {/* D. Wearable Sync */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wearable Sync</Text>
          <View style={styles.wearableRow}>
            <TouchableOpacity
              style={[
                styles.wearableButton,
                watchStatus === 'connected' && styles.wearableConnected,
              ]}
              onPress={handleAppleWatch}
            >
              <Text style={styles.wearableButtonText}>Apple Watch</Text>
              <Text style={styles.wearableStatus}>
                {watchStatus === 'connected'
                  ? 'Connected'
                  : watchStatus === 'unavailable'
                    ? 'Unavailable (Expo Go)'
                    : 'Tap to connect'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.wearableButton,
                garminConnected && styles.wearableConnected,
              ]}
              onPress={handleGarmin}
            >
              <Text style={styles.wearableButtonText}>Garmin Connect</Text>
              <Text style={styles.wearableStatus}>
                {garminConnected ? 'Connected' : 'Tap to authorize'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current HR */}
          <View style={styles.hrDisplay}>
            <Text style={styles.hrValue}>
              {currentHR !== null ? currentHR : '--'}
            </Text>
            <Text style={styles.hrLabel}>BPM</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  participantCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  participantStatus: {
    fontSize: 13,
    color: '#9ca3af',
  },
  deltaText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  coachCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  coachLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f97316',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  coachMessage: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 6,
  },
  coachContext: {
    fontSize: 12,
    color: '#6b7280',
  },
  wearableRow: {
    flexDirection: 'row',
    gap: 12,
  },
  wearableButton: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  wearableConnected: {
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  wearableButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  wearableStatus: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  hrDisplay: {
    alignItems: 'center',
    marginTop: 16,
  },
  hrValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  hrLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
});
