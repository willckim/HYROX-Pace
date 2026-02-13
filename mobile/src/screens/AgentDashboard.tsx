/**
 * AgentDashboard — 3-phase race screen:
 *   A) Race Picker (no_race)
 *   B) Countdown (countdown)
 *   C) Live Tracking (race_day / running)
 *
 * Fully responsive — scales to any screen size (Z Flip, SE, Pro Max, tablets).
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  AppState,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboardStore, getSegmentType, formatElapsed } from '../store/dashboardStore';
import { useRaceStore } from '../store/raceStore';
import { useWearableStore } from '../store/wearableStore';
import { useAuthStore } from '../store/authStore';
import { evaluate, CoachTip } from '../lib/CoachEngine';
import { generateInsight, ScoutInsight } from '../lib/ScoutEngine';
import {
  getTrackPosition,
  positionToPercent,
  STATION_SHORT_LABELS,
} from '../lib/RaceTrackMapper';
import {
  recordHRSample,
  getRedlineStatus,
  resetRedlineTracker,
  RedlineStatus,
} from '../lib/RedlineTracker';
import RedlineOverlay from '../components/RedlineOverlay';
import { RedlineAlert } from '../types/auth';
import {
  HyroxRace,
  RaceRegion,
  RACE_REGIONS,
  getRacesByRegion,
} from '../data/raceCalendar';

const TIMER_INTERVAL = 1_000;
const ENGINE_INTERVAL = 10_000;

// ─── Responsive scale helper ────────────────────────────────
// Base design width = 375 (iPhone SE). Everything scales from there.
function useScale() {
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.3); // cap at 1.3x for tablets
  return {
    s: (size: number) => Math.round(size * scale),
    width,
    isNarrow: width < 340,   // Z Flip folded, SE
    isWide: width > 420,     // Plus/Max/tablets
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  gap_analysis: '#f97316',
  pace_projection: '#3b82f6',
  critical_moment: '#ef4444',
  general: '#22c55e',
};

const PRE_RACE_TIPS = [
  'Hydrate well — aim for 500ml water 2 hours before start.',
  'Warm up with 10 min light jog + dynamic stretches.',
  'Plan your pacing: negative split the runs, save energy for stations 5-8.',
  'Lay out race gear tonight — bib, shoes, gloves, fuel.',
  'Visualize each station transition — smooth and fast.',
];

const REGION_KEYS: RaceRegion[] = ['north_america', 'europe', 'asia_pacific', 'south_america'];
const REGION_SHORT: Record<RaceRegion, string> = {
  north_america: 'NA',
  europe: 'EU',
  asia_pacific: 'APAC',
  south_america: 'SA',
};

// ─── Phase A: Race Picker ────────────────────────────────────

function RacePicker() {
  const { selectRace } = useRaceStore();
  const [activeRegion, setActiveRegion] = useState<RaceRegion>('north_america');
  const grouped = useMemo(() => getRacesByRegion(), []);
  const races = grouped[activeRegion];
  const { s, isNarrow } = useScale();
  const insets = useSafeAreaInsets();

  const formatDate = (race: HyroxRace) => {
    if (!race.date) return 'TBD';
    const d = new Date(race.date + 'T00:00:00');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    const year = d.getFullYear();
    if (race.dateEnd) {
      const e = new Date(race.dateEnd + 'T00:00:00');
      const eMonth = e.toLocaleString('en-US', { month: 'short' });
      const eDay = e.getDate();
      return `${month} ${day}–${eMonth === month ? '' : eMonth + ' '}${eDay}, ${year}`;
    }
    return `${month} ${day}, ${year}`;
  };

  const renderRace = ({ item }: { item: HyroxRace }) => (
    <TouchableOpacity
      style={[styles.raceRow, { padding: s(14), marginBottom: s(6), borderRadius: s(10) }]}
      onPress={() => selectRace(item)}
      activeOpacity={0.7}
    >
      <View style={styles.raceRowLeft}>
        <Text style={[styles.raceLabel, { fontSize: s(15) }]} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={[styles.raceLocation, { fontSize: s(12) }]} numberOfLines={1}>
          {item.city}, {item.country}
        </Text>
        {item.specialDesignation && (
          <View style={[styles.specialBadge, { borderRadius: s(5), paddingHorizontal: s(7), paddingVertical: s(2), marginTop: s(4) }]}>
            <Text style={[styles.specialBadgeText, { fontSize: s(10) }]}>{item.specialDesignation}</Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.raceDate, { fontSize: s(isNarrow ? 11 : 12) }, !item.date && styles.raceDateTbd]}
        numberOfLines={1}
      >
        {formatDate(item)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: s(16), paddingTop: s(12) }}>
        <Text style={[styles.header, { fontSize: s(24), marginBottom: s(2) }]}>Choose Your Race</Text>

        {/* Region tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', gap: s(6), paddingVertical: s(10) }}
        >
          {REGION_KEYS.map(key => (
            <TouchableOpacity
              key={key}
              style={[
                styles.regionTab,
                { paddingHorizontal: s(16), paddingVertical: s(8), borderRadius: s(18) },
                activeRegion === key && styles.regionTabActive,
              ]}
              onPress={() => setActiveRegion(key)}
            >
              <Text
                style={[
                  styles.regionTabText,
                  { fontSize: s(13) },
                  activeRegion === key && styles.regionTabTextActive,
                ]}
              >
                {REGION_SHORT[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.regionFullLabel, { fontSize: s(12), marginBottom: s(8) }]}>
          {RACE_REGIONS[activeRegion]}
        </Text>
      </View>

      <FlatList
        data={races}
        keyExtractor={item => item.id}
        renderItem={renderRace}
        contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: s(40) }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Phase B: Countdown ──────────────────────────────────────

function Countdown() {
  const { selectedRace, clearRace, startRace } = useRaceStore();
  const [now, setNow] = useState(Date.now());
  const { s, isNarrow } = useScale();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  if (!selectedRace) return null;

  const raceDate = selectedRace.date
    ? new Date(selectedRace.date + 'T08:00:00').getTime()
    : null;

  let days = 0;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (raceDate) {
    const diff = Math.max(0, raceDate - now);
    days = Math.floor(diff / (1000 * 60 * 60 * 24));
    hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    seconds = Math.floor((diff % (1000 * 60)) / 1000);
  }

  const countdownNumSize = s(isNarrow ? 32 : 40);
  const countdownGap = s(isNarrow ? 10 : 18);
  const unitMinWidth = s(isNarrow ? 50 : 60);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: s(16), paddingBottom: s(40) }}>
        {/* Race card */}
        <View style={[styles.countdownCard, { padding: s(20), borderRadius: s(14), marginBottom: s(20) }]}>
          <Text
            style={[styles.countdownLabel, { fontSize: s(isNarrow ? 18 : 22) }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {selectedRace.label}
          </Text>
          <Text style={[styles.countdownLocation, { fontSize: s(14) }]}>
            {selectedRace.city}, {selectedRace.country}
          </Text>
          {selectedRace.specialDesignation && (
            <View style={[styles.specialBadge, { marginTop: s(6) }]}>
              <Text style={[styles.specialBadgeText, { fontSize: s(10) }]}>{selectedRace.specialDesignation}</Text>
            </View>
          )}
          {selectedRace.date && (
            <Text style={[styles.countdownDate, { fontSize: s(12), marginTop: s(6) }]}>{selectedRace.date}</Text>
          )}
        </View>

        {/* Countdown timer */}
        {raceDate ? (
          <View style={[styles.countdownTimerRow, { gap: countdownGap, marginBottom: s(28) }]}>
            {[
              { val: days, label: 'DAYS' },
              { val: hours, label: 'HRS' },
              { val: minutes, label: 'MIN' },
              { val: seconds, label: 'SEC' },
            ].map(({ val, label }) => (
              <View key={label} style={[styles.countdownUnit, { minWidth: unitMinWidth }]}>
                <Text style={[styles.countdownNumber, { fontSize: countdownNumSize }]}>
                  {String(val).padStart(2, '0')}
                </Text>
                <Text style={[styles.countdownUnitLabel, { fontSize: s(10) }]}>{label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.countdownTbd, { fontSize: s(15), marginBottom: s(28) }]}>
            Date to be announced
          </Text>
        )}

        {/* Pre-race tips */}
        <View style={{ marginBottom: s(28) }}>
          <Text style={[styles.sectionTitle, { fontSize: s(16), marginBottom: s(10) }]}>Pre-Race Prep</Text>
          {PRE_RACE_TIPS.map((tip, i) => (
            <View key={i} style={[styles.tipRow, { marginBottom: s(8) }]}>
              <Text style={[styles.tipBullet, { fontSize: s(13), width: s(20) }]}>{i + 1}.</Text>
              <Text style={[styles.tipText, { fontSize: s(13), lineHeight: s(18) }]}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity style={[styles.startButton, { borderRadius: s(10), paddingVertical: s(14) }]} onPress={startRace}>
          <Text style={[styles.startButtonText, { fontSize: s(16) }]}>Start Race</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.changeRaceButton, { paddingVertical: s(10) }]} onPress={clearRace}>
          <Text style={[styles.changeRaceButtonText, { fontSize: s(13) }]}>Change Race</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Phase C: Live Tracking ──────────────────────────────────

function LiveTracking() {
  const {
    selectedRace,
    liveStatus,
    totalElapsedSeconds,
    tickElapsed,
    startRace,
    pauseRace,
    resumeRace,
    finishRace,
    clearRace,
  } = useRaceStore();
  const {
    participants,
    initLiveRace,
    advanceSegment,
    undoSegment,
    updateElapsed,
    reset,
  } = useDashboardStore();
  const { activeAlerts, dismissAlert, currentHR } = useWearableStore();
  const { user } = useAuthStore();
  const { s, isNarrow } = useScale();

  const [coachTip, setCoachTip] = useState<CoachTip | null>(null);
  const [scoutInsight, setScoutInsight] = useState<ScoutInsight | null>(null);
  const [localAlerts, setLocalAlerts] = useState<RedlineAlert[]>([]);
  const [redlineStatus, setRedlineStatus] = useState<RedlineStatus>({
    isInRedline: false,
    secondsInRedline: 0,
  });
  const [garminConnected, setGarminConnected] = useState(false);
  const [watchStatus, setWatchStatus] = useState<'idle' | 'connected' | 'unavailable'>('idle');
  const insets = useSafeAreaInsets();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEngineRun = useRef(0);

  const updateEngines = useCallback(() => {
    const state = useDashboardStore.getState();
    const userP = state.participants[0];
    if (!userP) return;

    const targetElapsed = userP.segmentsCompleted * 300;
    const tip = evaluate({
      currentSegmentIndex: userP.currentSegmentIndex,
      currentSegmentType: getSegmentType(userP.currentSegmentIndex),
      elapsedSeconds: userP.elapsedSeconds,
      targetElapsedSeconds: targetElapsed,
      currentHR: useWearableStore.getState().currentHR,
      maxHR: user?.max_hr || null,
      competitorDelta: null,
    });
    setCoachTip(tip);

    const insight = generateInsight(userP, []);
    setScoutInsight(insight);

    const hr = useWearableStore.getState().currentHR;
    const maxHR = user?.max_hr || null;
    const alert = recordHRSample(hr, maxHR);
    if (alert) {
      setLocalAlerts(prev => [alert, ...prev]);
    }
    setRedlineStatus(getRedlineStatus());
  }, [user?.max_hr]);

  useEffect(() => {
    const displayName = user?.display_name || 'You';
    if (participants.length === 0) {
      initLiveRace(displayName);
    }
    updateEngines();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      resetRedlineTracker();
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (liveStatus === 'running') {
      timerRef.current = setInterval(() => {
        tickElapsed();
        const elapsed = useRaceStore.getState().totalElapsedSeconds;
        updateElapsed(elapsed);

        const now = Date.now();
        if (now - lastEngineRun.current >= ENGINE_INTERVAL) {
          lastEngineRun.current = now;
          updateEngines();
        }
      }, TIMER_INTERVAL);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [liveStatus]);

  const handleAdvance = () => {
    const elapsed = useRaceStore.getState().totalElapsedSeconds;
    advanceSegment(elapsed);
    updateEngines();
  };

  const handleUndo = () => {
    undoSegment();
    updateEngines();
  };

  const handleWatch = async () => {
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
            setTimeout(() => setGarminConnected(true), 500);
          },
        },
      ],
    );
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Race',
      'Are you sure you want to end this race?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          style: 'destructive',
          onPress: () => finishRace(),
        },
      ],
    );
  };

  const handleNewRace = () => {
    reset();
    clearRace();
  };

  const dismissLocalAlert = (id: string) => {
    setLocalAlerts(prev => prev.filter(a => a.id !== id));
  };

  const allAlerts = [...activeAlerts, ...localAlerts];
  const topAlert = allAlerts.length > 0 ? allAlerts[0] : null;

  const watchLabel = Platform.OS === 'ios' ? 'Apple Watch' : 'Google Health';

  const userP = participants[0];
  const userPos = userP ? getTrackPosition(userP.segmentsCompleted) : null;
  const userPercent = userPos ? positionToPercent(userPos.continuousPosition) : 0;

  const pad = s(16);
  const cardPad = s(14);
  const cardRadius = s(10);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: pad, paddingBottom: s(40) }}>
        {/* Header */}
        <Text style={[styles.header, { fontSize: s(24), marginBottom: s(2) }]}>Race Control</Text>
        {selectedRace && (
          <Text style={[styles.subHeader, { fontSize: s(13), marginBottom: s(16) }]} numberOfLines={1}>
            {selectedRace.label} {selectedRace.date ? `\u00B7 ${selectedRace.date}` : ''}
          </Text>
        )}

        {/* Redline Overlay */}
        {topAlert && (
          <RedlineOverlay
            alert={topAlert}
            onDismiss={() => {
              if (topAlert.id.startsWith('local-')) {
                dismissLocalAlert(topAlert.id);
              } else {
                dismissAlert(topAlert.id);
              }
            }}
          />
        )}

        {/* Race Track */}
        <View style={[styles.trackCard, { padding: cardPad, borderRadius: cardRadius, marginBottom: s(20) }]}>
          <View style={[styles.trackHeader, { marginBottom: s(12) }]}>
            <View style={[
              styles.pulseDot,
              { width: s(9), height: s(9), borderRadius: s(5), marginRight: s(6) },
              liveStatus === 'paused' && { backgroundColor: '#f59e0b' },
              liveStatus === 'finished' && { backgroundColor: '#6b7280' },
            ]} />
            <Text style={[styles.trackTitle, { fontSize: s(14) }]}>
              {liveStatus === 'finished' ? 'Race Complete' : 'Live Race'}
            </Text>
            <View style={[styles.timerBadge, { borderRadius: s(6), paddingHorizontal: s(8), paddingVertical: s(3) }]}>
              <Text style={[styles.timerText, { fontSize: s(14) }]}>{formatElapsed(totalElapsedSeconds)}</Text>
            </View>
          </View>

          {/* Track Rail */}
          <View style={[styles.trackContainer, { height: s(60), marginHorizontal: s(4), marginBottom: s(10) }]}>
            <View style={[styles.goMarker, { left: '0%', top: s(6) }]}>
              <Text style={[styles.goText, { fontSize: s(9) }]}>GO</Text>
            </View>

            {STATION_SHORT_LABELS.map((label, i) => {
              const pct = ((i + 1) / 8) * 100;
              return (
                <View
                  key={label}
                  style={[styles.stationTick, { left: `${pct}%`, marginLeft: s(-12) }]}
                >
                  <View style={[styles.tickMark, { width: s(2), height: s(14) }]} />
                  <Text style={[styles.tickLabel, { fontSize: s(isNarrow ? 6 : 7) }]}>{label}</Text>
                </View>
              );
            })}

            <View style={[styles.rail, { top: s(26), height: s(2) }]} />

            {userP && (
              <View
                style={[
                  styles.dot,
                  { width: s(11), height: s(11), borderRadius: s(6), marginLeft: s(-6), top: s(21) },
                  styles.dotUser,
                  { left: `${userPercent}%` },
                ]}
              />
            )}
          </View>

          {/* User badge */}
          {userP && userPos && (
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={[styles.badgeName, { color: '#f97316', fontSize: s(11) }]}>
                  {userP.name}
                </Text>
                <Text style={[styles.badgeTime, { fontSize: s(10) }]}>{formatElapsed(totalElapsedSeconds)}</Text>
                <Text style={[styles.badgeActivity, { fontSize: s(9) }]}>{userPos.currentActivity}</Text>
                <Text style={[styles.badgeSegment, { fontSize: s(9) }]}>
                  {userP.segmentsCompleted}/16 segments
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Segment Controls */}
        {liveStatus !== 'finished' && (
          <View style={[styles.segmentControls, { gap: s(10), marginBottom: s(20) }]}>
            <TouchableOpacity
              style={[
                styles.advanceButton,
                { borderRadius: cardRadius, paddingVertical: s(14) },
                (liveStatus !== 'running' || !userP || userP.segmentsCompleted >= 16) && styles.buttonDisabled,
              ]}
              onPress={handleAdvance}
              disabled={liveStatus !== 'running' || !userP || userP.segmentsCompleted >= 16}
            >
              <Text style={[styles.advanceButtonText, { fontSize: s(15) }]}>
                {userP && userP.segmentsCompleted >= 16 ? 'All Done' : 'Next Segment'}
              </Text>
            </TouchableOpacity>

            {userP && userP.segmentsCompleted > 0 && (
              <TouchableOpacity
                style={[styles.undoButton, { borderRadius: cardRadius, paddingVertical: s(14), paddingHorizontal: s(16) }]}
                onPress={handleUndo}
              >
                <Text style={[styles.undoButtonText, { fontSize: s(15) }]}>Undo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Scout Insight */}
        {scoutInsight && (
          <View style={{ marginBottom: s(20) }}>
            <View
              style={[
                styles.scoutCard,
                { padding: cardPad, borderRadius: cardRadius },
                { borderLeftColor: CATEGORY_COLORS[scoutInsight.category] || '#3b82f6' },
              ]}
            >
              <Text style={[styles.scoutLabel, { fontSize: s(11), marginBottom: s(4) }]}>Race Scout</Text>
              <Text style={[styles.scoutHeadline, { fontSize: s(14), lineHeight: s(20), marginBottom: s(4) }]}>
                {scoutInsight.headline}
              </Text>
              <Text style={[styles.scoutDetail, { fontSize: s(12), lineHeight: s(17) }]}>
                {scoutInsight.detail}
              </Text>
            </View>
          </View>
        )}

        {/* Coach Tip */}
        {coachTip && (
          <View style={{ marginBottom: s(20) }}>
            <View
              style={[
                styles.coachCard,
                { padding: cardPad, borderRadius: cardRadius },
                {
                  borderLeftColor:
                    coachTip.priority === 'critical'
                      ? '#ef4444'
                      : coachTip.priority === 'warning'
                        ? '#f97316'
                        : '#3b82f6',
                },
              ]}
            >
              <Text style={[styles.coachLabel, { fontSize: s(11), marginBottom: s(4) }]}>Coach</Text>
              <Text style={[styles.coachMessage, { fontSize: s(14), lineHeight: s(20), marginBottom: s(4) }]}>
                {coachTip.message}
              </Text>
              <Text style={[styles.coachContext, { fontSize: s(11) }]}>{coachTip.context}</Text>
            </View>
          </View>
        )}

        {/* Wearable Sync */}
        <View style={{ marginBottom: s(20) }}>
          <Text style={[styles.sectionTitle, { fontSize: s(16), marginBottom: s(10) }]}>Wearable Sync</Text>
          <View style={[styles.wearableRow, { gap: s(10) }]}>
            <TouchableOpacity
              style={[
                styles.wearableButton,
                { padding: cardPad, borderRadius: cardRadius },
                watchStatus === 'connected' && styles.wearableConnected,
              ]}
              onPress={handleWatch}
            >
              <Text style={[styles.wearableButtonText, { fontSize: s(13), marginBottom: s(3) }]}>{watchLabel}</Text>
              <Text style={[styles.wearableStatus, { fontSize: s(10) }]}>
                {watchStatus === 'connected'
                  ? 'Connected'
                  : watchStatus === 'unavailable'
                    ? 'Unavailable'
                    : 'Tap to connect'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.wearableButton,
                { padding: cardPad, borderRadius: cardRadius },
                garminConnected && styles.wearableConnected,
              ]}
              onPress={handleGarmin}
            >
              <Text style={[styles.wearableButtonText, { fontSize: s(13), marginBottom: s(3) }]}>Garmin</Text>
              <Text style={[styles.wearableStatus, { fontSize: s(10) }]}>
                {garminConnected ? 'Connected' : 'Tap to authorize'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* HR Display */}
          <View style={[styles.hrDisplay, { marginTop: s(12) }]}>
            <Text style={[styles.hrValue, { fontSize: s(40) }]}>
              {currentHR !== null ? currentHR : '--'}
            </Text>
            <Text style={[styles.hrLabel, { fontSize: s(13) }]}>BPM</Text>
            {redlineStatus.isInRedline && (
              <Text style={[styles.redlineIndicator, { fontSize: s(12), marginTop: s(4) }]}>
                {redlineStatus.secondsInRedline}s in redline zone
              </Text>
            )}
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.controlRow, { gap: s(10), marginBottom: s(20) }]}>
          {liveStatus === 'idle' && (
            <TouchableOpacity style={[styles.controlButton, { borderRadius: cardRadius, paddingVertical: s(14) }]} onPress={startRace}>
              <Text style={[styles.controlButtonText, { fontSize: s(15) }]}>Start</Text>
            </TouchableOpacity>
          )}
          {liveStatus === 'running' && (
            <>
              <TouchableOpacity
                style={[styles.controlButton, styles.controlPause, { borderRadius: cardRadius, paddingVertical: s(14) }]}
                onPress={pauseRace}
              >
                <Text style={[styles.controlButtonText, { fontSize: s(15) }]}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.controlFinish, { borderRadius: cardRadius, paddingVertical: s(14) }]}
                onPress={handleFinish}
              >
                <Text style={[styles.controlButtonText, { fontSize: s(15) }]}>Finish</Text>
              </TouchableOpacity>
            </>
          )}
          {liveStatus === 'paused' && (
            <>
              <TouchableOpacity
                style={[styles.controlButton, styles.controlResume, { borderRadius: cardRadius, paddingVertical: s(14) }]}
                onPress={resumeRace}
              >
                <Text style={[styles.controlButtonText, { fontSize: s(15) }]}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.controlFinish, { borderRadius: cardRadius, paddingVertical: s(14) }]}
                onPress={handleFinish}
              >
                <Text style={[styles.controlButtonText, { fontSize: s(15) }]}>Finish</Text>
              </TouchableOpacity>
            </>
          )}
          {liveStatus === 'finished' && (
            <TouchableOpacity style={[styles.controlButton, { borderRadius: cardRadius, paddingVertical: s(14) }]} onPress={handleNewRace}>
              <Text style={[styles.controlButtonText, { fontSize: s(15) }]}>New Race</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Main Router ─────────────────────────────────────────────

export default function AgentDashboard() {
  const { phase, liveStatus, loadPersistedRace, recomputePhase } = useRaceStore();

  useEffect(() => {
    loadPersistedRace();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        recomputePhase();
      }
    });
    return () => sub.remove();
  }, []);

  if (phase === 'race_day' || liveStatus !== 'idle') {
    return <LiveTracking />;
  }

  if (phase === 'countdown') {
    return <Countdown />;
  }

  return <RacePicker />;
}

// ─── Base styles (sizes overridden inline by s()) ────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    fontWeight: '800',
    color: '#fff',
  },
  subHeader: {
    color: '#9ca3af',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#fff',
  },

  // Race Picker
  regionTab: {
    backgroundColor: '#1f2937',
  },
  regionTabActive: {
    backgroundColor: '#f97316',
  },
  regionTabText: {
    fontWeight: '700',
    color: '#9ca3af',
  },
  regionTabTextActive: {
    color: '#fff',
  },
  regionFullLabel: {
    color: '#6b7280',
    marginLeft: 4,
  },
  raceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  raceRowLeft: {
    flex: 1,
    marginRight: 8,
  },
  raceLabel: {
    fontWeight: '700',
    color: '#fff',
  },
  raceLocation: {
    color: '#9ca3af',
  },
  raceDate: {
    fontWeight: '600',
    color: '#22c55e',
    flexShrink: 0,
  },
  raceDateTbd: {
    color: '#6b7280',
  },
  specialBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7c3aed',
  },
  specialBadgeText: {
    fontWeight: '700',
    color: '#fff',
  },

  // Countdown
  countdownCard: {
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  countdownLabel: {
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  countdownLocation: {
    color: '#9ca3af',
  },
  countdownDate: {
    color: '#6b7280',
  },
  countdownTimerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  countdownUnit: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  countdownUnitLabel: {
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 1,
  },
  countdownTbd: {
    color: '#6b7280',
    textAlign: 'center',
  },
  tipRow: {
    flexDirection: 'row',
    paddingLeft: 4,
  },
  tipBullet: {
    fontWeight: '700',
    color: '#f97316',
  },
  tipText: {
    color: '#d1d5db',
    flex: 1,
  },
  startButton: {
    backgroundColor: '#22c55e',
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: {
    fontWeight: '800',
    color: '#fff',
  },
  changeRaceButton: {
    alignItems: 'center',
  },
  changeRaceButtonText: {
    fontWeight: '600',
    color: '#9ca3af',
  },

  // Live Tracking
  trackCard: {
    backgroundColor: '#1f2937',
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    backgroundColor: '#22c55e',
  },
  trackTitle: {
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  timerBadge: {
    backgroundColor: '#374151',
  },
  timerText: {
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  trackContainer: {
    position: 'relative',
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#4b5563',
  },
  goMarker: {
    position: 'absolute',
    marginLeft: -10,
  },
  goText: {
    fontWeight: '700',
    color: '#22c55e',
  },
  stationTick: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  tickMark: {
    backgroundColor: '#6b7280',
    marginBottom: 2,
  },
  tickLabel: {
    fontWeight: '600',
    color: '#9ca3af',
  },
  dot: {
    position: 'absolute',
  },
  dotUser: {
    backgroundColor: '#f97316',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  badge: {
    alignItems: 'center',
  },
  badgeName: {
    fontWeight: '700',
  },
  badgeTime: {
    color: '#9ca3af',
    fontVariant: ['tabular-nums'],
  },
  badgeActivity: {
    color: '#6b7280',
  },
  badgeSegment: {
    color: '#6b7280',
    marginTop: 2,
  },

  // Segment controls
  segmentControls: {
    flexDirection: 'row',
  },
  advanceButton: {
    flex: 1,
    backgroundColor: '#f97316',
    alignItems: 'center',
  },
  advanceButtonText: {
    fontWeight: '800',
    color: '#fff',
  },
  undoButton: {
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  undoButtonText: {
    fontWeight: '700',
    color: '#9ca3af',
  },
  buttonDisabled: {
    opacity: 0.4,
  },

  // Scout
  scoutCard: {
    backgroundColor: '#1f2937',
    borderLeftWidth: 4,
  },
  scoutLabel: {
    fontWeight: '700',
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoutHeadline: {
    color: '#fff',
    fontWeight: '600',
  },
  scoutDetail: {
    color: '#9ca3af',
  },

  // Coach
  coachCard: {
    backgroundColor: '#1f2937',
    borderLeftWidth: 4,
  },
  coachLabel: {
    fontWeight: '700',
    color: '#f97316',
    textTransform: 'uppercase',
  },
  coachMessage: {
    color: '#fff',
    fontWeight: '600',
  },
  coachContext: {
    color: '#6b7280',
  },

  // Wearable
  wearableRow: {
    flexDirection: 'row',
  },
  wearableButton: {
    flex: 1,
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  wearableConnected: {
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  wearableButtonText: {
    fontWeight: '700',
    color: '#fff',
  },
  wearableStatus: {
    color: '#9ca3af',
    textAlign: 'center',
  },
  hrDisplay: {
    alignItems: 'center',
  },
  hrValue: {
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  hrLabel: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  redlineIndicator: {
    fontWeight: '600',
    color: '#ef4444',
  },

  // Bottom controls
  controlRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  controlButtonText: {
    fontWeight: '800',
    color: '#fff',
  },
  controlPause: {
    backgroundColor: '#f59e0b',
  },
  controlResume: {
    backgroundColor: '#22c55e',
  },
  controlFinish: {
    backgroundColor: '#ef4444',
  },
});
