/**
 * RedlineOverlay — Animated slide-down banner for HR redline alerts.
 * Red background, shows HR %, duration, and recovery tip.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { RedlineAlert } from '../types/auth';

interface Props {
  alert: RedlineAlert;
  onDismiss: () => void;
}

export default function RedlineOverlay({ alert, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [alert.id]);

  const hrPct = Math.round(alert.hr_max_pct * 100);
  const durationMin = Math.floor(alert.duration_seconds / 60);
  const durationSec = alert.duration_seconds % 60;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>HR Redline Detected</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{hrPct}%</Text>
          <Text style={styles.statLabel}>of Max HR</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{alert.hr_avg}</Text>
          <Text style={styles.statLabel}>Avg BPM</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {durationMin}:{durationSec.toString().padStart(2, '0')}
          </Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
      </View>

      <View style={styles.tipBox}>
        <Text style={styles.tipText}>{alert.recovery_tip}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#7f1d1d',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fca5a5',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#991b1b',
    borderRadius: 8,
  },
  dismissText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: '#fca5a5',
    fontSize: 11,
    marginTop: 2,
  },
  tipBox: {
    backgroundColor: '#991b1b',
    borderRadius: 10,
    padding: 12,
  },
  tipText: {
    color: '#fef2f2',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
