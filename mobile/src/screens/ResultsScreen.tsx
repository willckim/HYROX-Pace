/**
 * Results Screen
 * Shows race prediction summary with finish times, tier, and risk analysis
 * Two modes:
 * 1. Prediction mode (Just Finish) - predicts finish based on fitness
 * 2. Goal mode (Goal Time) - shows required paces to hit target
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../navigation/TabNavigator';
import { getTierDisplay, getRiskColor, getFeasibilityDisplay } from '../lib/api';
import { useWearableStore } from '../store/wearableStore';
import RedlineOverlay from '../components/RedlineOverlay';

type ResultsScreenProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Results'>;
  route: RouteProp<HomeStackParamList, 'Results'>;
};

export default function ResultsScreen({ navigation, route }: ResultsScreenProps) {
  const { simulation } = route.params;
  const { predictions, risk_analysis, estimated_tier, insights } = simulation;
  const { activeAlerts, dismissAlert } = useWearableStore();
  const topAlert = activeAlerts[0] || null;

  const isGoalMode = simulation.mode === 'goal';
  const feasibility = isGoalMode ? getFeasibilityDisplay(simulation.goal_feasibility || 'realistic') : null;

  const blowUpPct = Math.round(risk_analysis.blow_up_probability * 100);

  // GOAL MODE UI
  if (isGoalMode) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

          {topAlert && <RedlineOverlay alert={topAlert} onDismiss={() => dismissAlert(topAlert.id)} />}

          {/* Goal Time Header */}
          <View style={styles.goalHeader}>
            <Text style={styles.goalLabel}>Your Goal</Text>
            <Text style={styles.goalTime}>{formatTime(simulation.goal_time_seconds!)}</Text>
          </View>

          {/* Feasibility Badge */}
          <View style={[styles.feasibilityBadge, { backgroundColor: feasibility!.color + '20' }]}>
            <Text style={[styles.feasibilityText, { color: feasibility!.color }]}>
              {feasibility!.emoji} {feasibility!.label}
            </Text>
          </View>

          {/* Comparison with Predicted */}
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Your Goal</Text>
                <Text style={styles.comparisonValue}>{formatTime(simulation.goal_time_seconds!)}</Text>
              </View>
              <View style={styles.comparisonDivider}>
                <Text style={styles.vsText}>vs</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Predicted</Text>
                <Text style={styles.comparisonValueSecondary}>
                  {predictions.predicted_finish_display || predictions.likely_display}
                </Text>
              </View>
            </View>
            <View style={styles.diffRow}>
              {simulation.goal_time_seconds! < (predictions.predicted_finish_seconds || predictions.likely_seconds) ? (
                <Text style={styles.diffTextFaster}>
                  ⚡ {formatTime((predictions.predicted_finish_seconds || predictions.likely_seconds) - simulation.goal_time_seconds!)} faster than predicted
                </Text>
              ) : (
                <Text style={styles.diffTextSlower}>
                  😎 {formatTime(simulation.goal_time_seconds! - (predictions.predicted_finish_seconds || predictions.likely_seconds))} buffer from predicted
                </Text>
              )}
            </View>
          </View>

          {/* Required Paces Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Required Paces to Hit Goal</Text>
            
            <View style={styles.paceGrid}>
              {/* Average Run Pace */}
              <View style={styles.paceCard}>
                <Text style={styles.paceEmoji}>🏃</Text>
                <Text style={styles.paceLabel}>Avg Run Pace</Text>
                <Text style={styles.paceValue}>
                  {getAverageRunPace(simulation.segment_plans)}
                </Text>
                <Text style={styles.paceHint}>per km</Text>
              </View>
              
              {/* Station Time */}
              <View style={styles.paceCard}>
                <Text style={styles.paceEmoji}>💪</Text>
                <Text style={styles.paceLabel}>Total Stations</Text>
                <Text style={styles.paceValue}>{formatTime(simulation.total_station_time_seconds)}</Text>
                <Text style={styles.paceHint}>8 stations</Text>
              </View>
            </View>

            {/* Key Station Times */}
            <View style={styles.stationTimes}>
              <Text style={styles.stationTimesTitle}>Key Station Targets</Text>
              {simulation.segment_plans
                .filter(s => ['SKI_ERG', 'SLED_PUSH', 'SLED_PULL', 'ROW', 'WALL_BALLS'].includes(s.segment_type))
                .map((seg) => (
                  <View key={seg.segment_order} style={styles.stationRow}>
                    <Text style={styles.stationName}>{getStationName(seg.segment_type)}</Text>
                    <Text style={styles.stationTime}>{seg.target_time_display}</Text>
                  </View>
                ))
              }
            </View>
          </View>

          {/* Risk Analysis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goal Feasibility</Text>
            
            <View style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <Text style={styles.riskLabel}>Blow-Up Risk</Text>
                <Text style={[
                  styles.riskPercent,
                  { color: blowUpPct > 40 ? '#ef4444' : blowUpPct > 25 ? '#f97316' : '#22c55e' }
                ]}>
                  {blowUpPct}%
                </Text>
              </View>
              <Text style={styles.riskExplanation}>{risk_analysis.limiter_explanation}</Text>
            </View>
          </View>

          {/* 2026 Penalty Risks */}
          {simulation.penalty_warnings && simulation.penalty_warnings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2026 Penalty Risks</Text>
              {simulation.penalty_warnings.map((warning, idx) => (
                <View key={idx} style={styles.penaltyCard}>
                  <View style={styles.penaltyHeader}>
                    <Text style={styles.penaltyStation}>{getStationName(warning.station)}</Text>
                    <Text style={styles.penaltyTime}>+{warning.time_penalty_seconds}s</Text>
                  </View>
                  <Text style={styles.penaltyDescription}>{warning.description}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Insights */}
          {insights && insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What This Means</Text>
              {insights.map((insight, idx) => (
                <View key={idx} style={styles.insightRow}>
                  <Text style={styles.insightBullet}>{idx === 0 && insight.includes('Warning') ? '' : '>'}</Text>
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('Plan', {
              simulationId: simulation.id,
              simulation
            })}
          >
            <Text style={styles.ctaText}>View Detailed Race Plan</Text>
            <Text style={styles.ctaSubtext}>Segment-by-segment targets</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // PREDICTION MODE UI (Original)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {topAlert && <RedlineOverlay alert={topAlert} onDismiss={() => dismissAlert(topAlert.id)} />}

        {/* Tier Badge */}
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{getTierDisplay(estimated_tier)}</Text>
        </View>

        {/* Main Prediction */}
        <View style={styles.mainPrediction}>
          <Text style={styles.predictedLabel}>Predicted Finish</Text>
          <Text style={styles.predictedTime}>{predictions.likely_display}</Text>
          <View style={styles.rangeRow}>
            <View style={styles.rangeItem}>
              <Text style={styles.rangeLabel}>Conservative</Text>
              <Text style={styles.rangeValue}>{predictions.conservative_display}</Text>
            </View>
            <View style={styles.rangeDivider} />
            <View style={styles.rangeItem}>
              <Text style={styles.rangeLabel}>Aggressive</Text>
              <Text style={styles.rangeValue}>{predictions.aggressive_display}</Text>
            </View>
          </View>
          <View style={styles.confidenceRow}>
            <View style={styles.confidenceBar}>
              <View 
                style={[
                  styles.confidenceFill, 
                  { width: `${predictions.confidence_score * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.confidenceText}>
              {Math.round(predictions.confidence_score * 100)}% confidence
            </Text>
          </View>
        </View>

        {/* Time Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Breakdown</Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>
                {formatTime(simulation.total_run_time_seconds)}
              </Text>
              <Text style={styles.breakdownLabel}>Running</Text>
              <Text style={styles.breakdownPct}>
                {Math.round(simulation.total_run_time_seconds / (simulation.total_run_time_seconds + simulation.total_station_time_seconds + simulation.total_roxzone_time_seconds) * 100)}%
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>
                {formatTime(simulation.total_station_time_seconds)}
              </Text>
              <Text style={styles.breakdownLabel}>Stations</Text>
              <Text style={styles.breakdownPct}>
                {Math.round(simulation.total_station_time_seconds / (simulation.total_run_time_seconds + simulation.total_station_time_seconds + simulation.total_roxzone_time_seconds) * 100)}%
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>
                {formatTime(simulation.total_roxzone_time_seconds)}
              </Text>
              <Text style={styles.breakdownLabel}>Transitions</Text>
              <Text style={styles.breakdownPct}>
                {Math.round(simulation.total_roxzone_time_seconds / (simulation.total_run_time_seconds + simulation.total_station_time_seconds + simulation.total_roxzone_time_seconds) * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Risk Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Analysis</Text>
          
          <View style={styles.riskCard}>
            <View style={styles.riskHeader}>
              <Text style={styles.riskLabel}>Blow-Up Probability</Text>
              <Text style={[
                styles.riskPercent,
                { color: blowUpPct > 40 ? '#ef4444' : blowUpPct > 25 ? '#f97316' : '#22c55e' }
              ]}>
                {blowUpPct}%
              </Text>
            </View>
            {risk_analysis.blow_up_zone && (
              <Text style={styles.riskZone}>
                ⚠️ Danger zone: {risk_analysis.blow_up_zone}
              </Text>
            )}
          </View>

          <View style={styles.limiterCard}>
            <Text style={styles.limiterTitle}>Primary Limiter</Text>
            <Text style={styles.limiterType}>
              {risk_analysis.primary_limiter === 'aerobic' ? '🫁 Aerobic Capacity' :
               risk_analysis.primary_limiter === 'strength' ? '💪 Strength' :
               risk_analysis.primary_limiter === 'pacing' ? '🎯 Pacing' : '🧠 Mental'}
            </Text>
            <Text style={styles.limiterExplanation}>
              {risk_analysis.limiter_explanation}
            </Text>
          </View>

          {risk_analysis.danger_runs.length > 0 && (
            <View style={styles.dangerRunsCard}>
              <Text style={styles.dangerRunsTitle}>⚡ Danger Runs</Text>
              <View style={styles.dangerRunsList}>
                {risk_analysis.danger_runs.map((runNum) => (
                  <View key={runNum} style={styles.dangerRunBadge}>
                    <Text style={styles.dangerRunText}>Run {runNum}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 2026 Penalty Risks */}
        {simulation.penalty_warnings && simulation.penalty_warnings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2026 Penalty Risks</Text>
            {simulation.penalty_warnings.map((warning, idx) => (
              <View key={idx} style={styles.penaltyCard}>
                <View style={styles.penaltyHeader}>
                  <Text style={styles.penaltyStation}>{getStationName(warning.station)}</Text>
                  <Text style={styles.penaltyTime}>+{warning.time_penalty_seconds}s</Text>
                </View>
                <Text style={styles.penaltyDescription}>{warning.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Insights */}
        {insights && insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Insights</Text>
            {insights.map((insight, idx) => (
              <View key={idx} style={styles.insightRow}>
                <Text style={styles.insightBullet}></Text>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Plan', {
            simulationId: simulation.id,
            simulation
          })}
        >
          <Text style={styles.ctaText}>View Full Race Plan</Text>
          <Text style={styles.ctaSubtext}>Segment-by-segment breakdown</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getAverageRunPace(segmentPlans: any[]): string {
  const runSegments = segmentPlans.filter(s => s.segment_type === 'RUN');
  const totalRunSeconds = runSegments.reduce((acc, s) => acc + s.target_time_seconds, 0);
  const avgPaceSeconds = Math.round(totalRunSeconds / runSegments.length);
  const mins = Math.floor(avgPaceSeconds / 60);
  const secs = avgPaceSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getStationName(type: string): string {
  const names: Record<string, string> = {
    'SKI_ERG': 'SkiErg',
    'SLED_PUSH': 'Sled Push',
    'SLED_PULL': 'Sled Pull',
    'ROW': 'Row',
    'WALL_BALLS': 'Wall Balls',
    'BURPEE_BROAD_JUMP': 'Burpee BJ',
    'FARMERS_CARRY': 'Farmers',
    'SANDBAG_LUNGES': 'Lunges',
  };
  return names[type] || type;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Goal Mode Styles
  goalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  goalLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },
  goalTime: {
    color: '#f97316',
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: 2,
  },
  feasibilityBadge: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  feasibilityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  comparisonCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonDivider: {
    paddingHorizontal: 16,
  },
  vsText: {
    color: '#6b7280',
    fontSize: 14,
  },
  comparisonLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  comparisonValue: {
    color: '#f97316',
    fontSize: 24,
    fontWeight: '700',
  },
  comparisonValueSecondary: {
    color: '#e5e7eb',
    fontSize: 24,
    fontWeight: '600',
  },
  diffRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    alignItems: 'center',
  },
  diffTextFaster: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '600',
  },
  diffTextSlower: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  paceGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  paceCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  paceEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  paceLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  paceValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  paceHint: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 2,
  },
  stationTimes: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
  },
  stationTimesTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  stationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  stationName: {
    color: '#9ca3af',
    fontSize: 14,
  },
  stationTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  riskExplanation: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  // Shared & Prediction Mode Styles
  tierBadge: {
    alignSelf: 'center',
    backgroundColor: '#1f2937',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  tierText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: '600',
  },
  mainPrediction: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  predictedLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  predictedTime: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 2,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  rangeItem: {
    flex: 1,
    alignItems: 'center',
  },
  rangeDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#374151',
  },
  rangeLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 4,
  },
  rangeValue: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '600',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    gap: 12,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  confidenceText: {
    color: '#6b7280',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  breakdownLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  breakdownPct: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 2,
  },
  riskCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskLabel: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  riskPercent: {
    fontSize: 24,
    fontWeight: '700',
  },
  riskZone: {
    color: '#f97316',
    fontSize: 13,
    marginTop: 8,
  },
  limiterCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  limiterTitle: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 4,
  },
  limiterType: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  limiterExplanation: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
  },
  dangerRunsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
  },
  dangerRunsTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    marginBottom: 12,
  },
  dangerRunsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dangerRunBadge: {
    backgroundColor: '#7f1d1d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dangerRunText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '600',
  },
  insightRow: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  insightBullet: {
    fontSize: 14,
    marginRight: 10,
  },
  insightText: {
    color: '#e5e7eb',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  penaltyCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#eab308',
  },
  penaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  penaltyStation: {
    color: '#eab308',
    fontSize: 14,
    fontWeight: '600',
  },
  penaltyTime: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  penaltyDescription: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: '#f97316',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  ctaSubtext: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
});