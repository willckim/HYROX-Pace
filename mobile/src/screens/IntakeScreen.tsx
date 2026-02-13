/**
 * Intake Screen
 * Multi-step form to collect athlete profile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/TabNavigator';
import { 
  IntakeFormState, 
  DEFAULT_FORM_STATE,
  SwimBackground,
  SledComfort,
  LungeTolerance,
  Gender,
  Division,
  RaceStrategy,
  DIVISIONS,
  AGE_GROUPS,
} from '../types';
import { runSimulation, formStateToProfile } from '../lib/api';

type IntakeScreenProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Intake'>;
};

type WeightUnit = 'kg' | 'lbs';
type AerobicInputType = '5k' | 'mile' | '1k_row' | '800m' | 'weekly_hours' | 'none';
type SwimLevel = 'none' | 'learned' | 'fitness' | 'competitive_past' | 'competitive_current' | 'elite';

export default function IntakeScreen({ navigation }: IntakeScreenProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<IntakeFormState>(DEFAULT_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs');
  const [weightInput, setWeightInput] = useState('');
  
  // Aerobic input state
  const [aerobicInputType, setAerobicInputType] = useState<AerobicInputType>('5k');
  const [aerobicMinutes, setAerobicMinutes] = useState('');
  const [aerobicSeconds, setAerobicSeconds] = useState('');
  const [weeklyAerobicHours, setWeeklyAerobicHours] = useState('');
  
  // Swimming state
  const [swimLevel, setSwimLevel] = useState<SwimLevel>('none');
  const [swimYears, setSwimYears] = useState('');
  const [currentSwimHours, setCurrentSwimHours] = useState('0');
  
  // Race strategy state
  const [hasGoalTime, setHasGoalTime] = useState(false);
  const [goalTimeHours, setGoalTimeHours] = useState('1');
  const [goalTimeMinutes, setGoalTimeMinutes] = useState('30');
  const [goalTimeSeconds, setGoalTimeSeconds] = useState('00');

  // Auto-select appropriate division when gender changes
  useEffect(() => {
    const currentDiv = form.division;
    const isMale = form.gender === 'male';
    
    const needsUpdate = isMale 
      ? (currentDiv.startsWith('womens_') || currentDiv === 'doubles_women')
      : (currentDiv.startsWith('mens_') || currentDiv === 'doubles_men');
    
    if (needsUpdate) {
      const newDivision = isMale ? 'mens_open' : 'womens_open';
      setForm(prev => ({ ...prev, division: newDivision as Division }));
    }
  }, [form.gender]);

  // Convert any aerobic input to estimated 5K time
  const calculateFiveKTime = (): number => {
    const mins = parseInt(aerobicMinutes) || 0;
    const secs = parseInt(aerobicSeconds) || 0;
    const totalSeconds = mins * 60 + secs;
    
    switch (aerobicInputType) {
      case '5k':
        return totalSeconds || 1500; // Default 25:00
      case 'mile':
        // 5K ≈ mile time × 3.6 (accounts for pace slowdown)
        return Math.round(totalSeconds * 3.6);
      case '800m':
        // 5K ≈ 800m time × 7.5 (rough estimate)
        return Math.round(totalSeconds * 7.5);
      case '1k_row':
        // 1K row to 5K run conversion
        // Sub-3:30 = elite (~18min 5K), 4:00 = ~24min 5K, 4:30 = ~28min 5K
        return Math.round(totalSeconds * 6.5);
      case 'weekly_hours':
        // Estimate based on training volume
        const hours = parseFloat(weeklyAerobicHours) || 0;
        if (hours >= 10) return 18 * 60; // Elite
        if (hours >= 7) return 21 * 60;  // Advanced
        if (hours >= 4) return 25 * 60;  // Intermediate
        if (hours >= 2) return 28 * 60;  // Beginner
        return 32 * 60; // Recreational
      case 'none':
        return 30 * 60; // Conservative default
      default:
        return 1500;
    }
  };

  // Convert swim inputs to swim_background enum
  const calculateSwimBackground = (): SwimBackground => {
    // Elite or current competitive = competitive
    if (swimLevel === 'elite' || swimLevel === 'competitive_current') {
      return 'competitive';
    }
    // Past competitive with recent swimming = competitive
    if (swimLevel === 'competitive_past' && parseFloat(currentSwimHours) >= 2) {
      return 'competitive';
    }
    // Past competitive or fitness swimmer = recreational
    if (swimLevel === 'competitive_past' || swimLevel === 'fitness') {
      return 'recreational';
    }
    // Learned to swim but doesn't swim = none
    if (swimLevel === 'learned' && parseFloat(currentSwimHours) < 1) {
      return 'none';
    }
    // Learned and swims occasionally = recreational
    if (swimLevel === 'learned') {
      return 'recreational';
    }
    return 'none';
  };

  const updateForm = (key: keyof IntakeFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
    const numValue = parseFloat(value) || 0;
    const kgValue = weightUnit === 'lbs' ? numValue / 2.205 : numValue;
    updateForm('weight_kg', kgValue.toFixed(1));
  };

  const toggleWeightUnit = () => {
    const currentValue = parseFloat(weightInput) || 0;
    if (weightUnit === 'kg') {
      setWeightUnit('lbs');
      setWeightInput((currentValue * 2.205).toFixed(0));
    } else {
      setWeightUnit('kg');
      setWeightInput((currentValue / 2.205).toFixed(1));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Calculate 5K time from whatever input method was used
      const fiveKSeconds = calculateFiveKTime();
      const swimBackground = calculateSwimBackground();

      const profile = formStateToProfile({
        ...form,
        five_k_minutes: Math.floor(fiveKSeconds / 60).toString(),
        five_k_seconds: (fiveKSeconds % 60).toString(),
        swim_background: swimBackground,
      });

      // Calculate goal time in seconds if in goal mode
      let goalSeconds: number | undefined = undefined;
      if (hasGoalTime) {
        const hours = parseInt(goalTimeHours) || 0;
        const mins = parseInt(goalTimeMinutes) || 0;
        const secs = parseInt(goalTimeSeconds) || 0;
        goalSeconds = hours * 3600 + mins * 60 + secs;
      }

      const response = await runSimulation(profile, goalSeconds);
      const sim = response.simulation;

      // Check for goal impossibility
      if (sim.goal_impossibility?.is_impossible) {
        Alert.alert(
          'Goal May Be Unreachable',
          sim.goal_impossibility.reason,
          [
            { text: 'Adjust Goal', style: 'cancel' },
            {
              text: 'See Plan Anyway',
              onPress: () => navigation.replace('Results', { simulationId: sim.id, simulation: sim }),
            },
          ],
        );
        return;
      }

      navigation.replace('Results', { simulationId: sim.id, simulation: sim });
    } catch (error: any) {
      const message = error?.status
        ? `Request failed (${error.status}): ${error.message}`
        : error?.message || 'Failed to run simulation. Please try again.';
      Alert.alert('Error', message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDivisions = () => {
    return DIVISIONS.filter(d => {
      if (form.gender === 'male') {
        return d.value.startsWith('mens_') || 
               d.value === 'doubles_men' || 
               d.value === 'doubles_mixed';
      } else {
        return d.value.startsWith('womens_') || 
               d.value === 'doubles_women' || 
               d.value === 'doubles_mixed';
      }
    });
  };

  const getAerobicPlaceholder = (): { mins: string; secs: string; label: string } => {
    switch (aerobicInputType) {
      case '5k': return { mins: '25', secs: '00', label: '5K Run Time' };
      case 'mile': return { mins: '7', secs: '30', label: 'Mile Run Time' };
      case '800m': return { mins: '3', secs: '00', label: '800m Run Time' };
      case '1k_row': return { mins: '3', secs: '45', label: '1K Row Time' };
      default: return { mins: 'MM', secs: 'SS', label: 'Time' };
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Engine 🏃</Text>
            <Text style={styles.stepDescription}>
              Let's understand your aerobic capacity
            </Text>

            {/* Aerobic Input Type Selection */}
            <Text style={styles.label}>I know my...</Text>
            <View style={styles.optionGroupWrap}>
              {[
                { value: '5k', label: '5K Time', emoji: '🏃' },
                { value: 'mile', label: 'Mile Time', emoji: '🏃‍♂️' },
                { value: '800m', label: '800m Time', emoji: '⚡' },
                { value: '1k_row', label: '1K Row', emoji: '🚣' },
                { value: 'weekly_hours', label: 'Training Hours', emoji: '📅' },
                { value: 'none', label: "I Don't Know", emoji: '🤷' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionButtonSmall,
                    aerobicInputType === opt.value && styles.optionButtonActive,
                  ]}
                  onPress={() => setAerobicInputType(opt.value as AerobicInputType)}
                >
                  <Text style={[
                    styles.optionText,
                    aerobicInputType === opt.value && styles.optionTextActive,
                  ]}>
                    {opt.emoji} {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Input (for 5K, Mile, 800m, 1K Row) */}
            {['5k', 'mile', '800m', '1k_row'].includes(aerobicInputType) && (
              <>
                <Text style={styles.label}>{getAerobicPlaceholder().label}</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    placeholder={getAerobicPlaceholder().mins}
                    placeholderTextColor="#6b7280"
                    keyboardType="number-pad"
                    value={aerobicMinutes}
                    onChangeText={setAerobicMinutes}
                    maxLength={2}
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    placeholder={getAerobicPlaceholder().secs}
                    placeholderTextColor="#6b7280"
                    keyboardType="number-pad"
                    value={aerobicSeconds}
                    onChangeText={setAerobicSeconds}
                    maxLength={2}
                  />
                </View>
                {aerobicInputType === '1k_row' && (
                  <Text style={styles.hint}>
                    Your Concept2 or similar erg time
                  </Text>
                )}
                {aerobicInputType === '800m' && (
                  <Text style={styles.hint}>
                    Track or treadmill time
                  </Text>
                )}
              </>
            )}

            {/* Weekly Hours Input */}
            {aerobicInputType === 'weekly_hours' && (
              <>
                <Text style={styles.label}>Weekly Aerobic Training Hours</Text>
                <Text style={styles.sublabel}>Running, cycling, swimming, rowing, etc.</Text>
                <View style={styles.optionGroup}>
                  {[
                    { value: '1', label: '0-2 hrs' },
                    { value: '3', label: '2-4 hrs' },
                    { value: '5', label: '4-6 hrs' },
                    { value: '7', label: '6-8 hrs' },
                    { value: '10', label: '8+ hrs' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionButton,
                        weeklyAerobicHours === opt.value && styles.optionButtonActive,
                      ]}
                      onPress={() => setWeeklyAerobicHours(opt.value)}
                    >
                      <Text style={[
                        styles.optionText,
                        weeklyAerobicHours === opt.value && styles.optionTextActive,
                      ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* No Data Input */}
            {aerobicInputType === 'none' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  No problem! We'll use conservative estimates. For better accuracy, 
                  consider doing a time trial for any of the above options.
                </Text>
              </View>
            )}

            {/* Swimming Background - Detailed */}
            <Text style={[styles.label, { marginTop: 28 }]}>Swimming Background</Text>
            <Text style={styles.sublabel}>Swimmers recover faster between efforts</Text>
            
            <View style={styles.optionGroupWrap}>
              {[
                { value: 'none', label: 'Never learned', emoji: '❌' },
                { value: 'learned', label: 'Can swim', emoji: '💧' },
                { value: 'fitness', label: 'Fitness swimmer', emoji: '🏊' },
                { value: 'competitive_past', label: 'Competed (past)', emoji: '🏅' },
                { value: 'competitive_current', label: 'Compete now', emoji: '🎖️' },
                { value: 'elite', label: 'D1/Pro/National', emoji: '🏆' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionButtonSmall,
                    swimLevel === opt.value && styles.optionButtonActive,
                  ]}
                  onPress={() => setSwimLevel(opt.value as SwimLevel)}
                >
                  <Text style={[
                    styles.optionText,
                    swimLevel === opt.value && styles.optionTextActive,
                  ]}>
                    {opt.emoji} {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Follow-up questions for swimmers */}
            {swimLevel !== 'none' && swimLevel !== 'learned' && (
              <>
                <Text style={styles.label}>Years of Swim Training</Text>
                <View style={styles.optionGroup}>
                  {['1-2', '3-5', '6-10', '10+'].map((years) => (
                    <TouchableOpacity
                      key={years}
                      style={[
                        styles.optionButton,
                        swimYears === years && styles.optionButtonActive,
                      ]}
                      onPress={() => setSwimYears(years)}
                    >
                      <Text style={[
                        styles.optionText,
                        swimYears === years && styles.optionTextActive,
                      ]}>
                        {years} yrs
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Current swimming for past competitive or fitness swimmers */}
            {(swimLevel === 'competitive_past' || swimLevel === 'fitness' || swimLevel === 'learned') && (
              <>
                <Text style={styles.label}>Current Swimming (hrs/week)</Text>
                <View style={styles.optionGroup}>
                  {[
                    { value: '0', label: 'None' },
                    { value: '1', label: '1-2' },
                    { value: '3', label: '3-4' },
                    { value: '5', label: '5+' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionButton,
                        currentSwimHours === opt.value && styles.optionButtonActive,
                      ]}
                      onPress={() => setCurrentSwimHours(opt.value)}
                    >
                      <Text style={[
                        styles.optionText,
                        currentSwimHours === opt.value && styles.optionTextActive,
                      ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Strength 💪</Text>
            <Text style={styles.stepDescription}>
              How do you handle the functional work?
            </Text>

            <Text style={styles.label}>How do sleds feel?</Text>
            <Text style={styles.sublabel}>At HYROX race weights</Text>
            <View style={styles.optionGroup}>
              {([
                { value: 'comfortable', label: '💪 Comfortable', desc: 'Can push/pull without stopping' },
                { value: 'manageable', label: '😐 Manageable', desc: 'Challenging but doable' },
                { value: 'soul_crushing', label: '😰 Soul Crushing', desc: 'Hardest part of the race' },
              ]).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionButtonWide,
                    form.sled_comfort === opt.value && styles.optionButtonActive,
                  ]}
                  onPress={() => updateForm('sled_comfort', opt.value)}
                >
                  <Text style={[
                    styles.optionText,
                    form.sled_comfort === opt.value && styles.optionTextActive,
                  ]}>
                    {opt.label}
                  </Text>
                  <Text style={[
                    styles.optionDesc,
                    form.sled_comfort === opt.value && styles.optionDescActive,
                  ]}>
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Wall Ball Unbroken Max (fresh)</Text>
            <Text style={styles.sublabel}>How many can you do without dropping?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 25"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              value={form.wall_ball_max}
              onChangeText={(v) => updateForm('wall_ball_max', v)}
            />

            <Text style={styles.label}>Lunge Tolerance</Text>
            <Text style={styles.sublabel}>100m weighted walking lunges</Text>
            <View style={styles.optionGroup}>
              {([
                { value: 'strong', label: 'Strong', desc: 'No problem' },
                { value: 'moderate', label: 'Moderate', desc: 'Manageable' },
                { value: 'weak', label: 'Weak', desc: 'My legs die' },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionButton,
                    form.lunge_tolerance === opt.value && styles.optionButtonActive,
                  ]}
                  onPress={() => updateForm('lunge_tolerance', opt.value)}
                >
                  <Text style={[
                    styles.optionText,
                    form.lunge_tolerance === opt.value && styles.optionTextActive,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>About You 📊</Text>
            <Text style={styles.stepDescription}>
              Final details for accurate predictions
            </Text>

            <Text style={styles.label}>Weight</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={[styles.input, styles.weightInput]}
                placeholder={weightUnit === 'lbs' ? 'e.g., 165' : 'e.g., 75'}
                placeholderTextColor="#6b7280"
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={handleWeightChange}
              />
              <TouchableOpacity 
                style={styles.unitToggle}
                onPress={toggleWeightUnit}
              >
                <Text style={[
                  styles.unitText,
                  weightUnit === 'kg' && styles.unitTextActive
                ]}>kg</Text>
                <Text style={styles.unitDivider}>/</Text>
                <Text style={[
                  styles.unitText,
                  weightUnit === 'lbs' && styles.unitTextActive
                ]}>lbs</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Gender</Text>
            <View style={styles.optionGroup}>
              {(['male', 'female'] as Gender[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionButton,
                    form.gender === opt && styles.optionButtonActive,
                  ]}
                  onPress={() => updateForm('gender', opt)}
                >
                  <Text style={[
                    styles.optionText,
                    form.gender === opt && styles.optionTextActive,
                  ]}>
                    {opt === 'male' ? '♂️ Male' : '♀️ Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Division</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.optionGroup}>
                {getFilteredDivisions().map((div) => (
                  <TouchableOpacity
                    key={div.value}
                    style={[
                      styles.optionButton,
                      form.division === div.value && styles.optionButtonActive,
                    ]}
                    onPress={() => updateForm('division', div.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      form.division === div.value && styles.optionTextActive,
                    ]}>
                      {div.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Race Strategy</Text>
            <View style={styles.optionGroupWrap}>
              <TouchableOpacity
                style={[
                  styles.optionButtonWide,
                  !hasGoalTime && styles.optionButtonActive,
                ]}
                onPress={() => {
                  setHasGoalTime(false);
                  updateForm('race_strategy', 'finish_strong');
                }}
              >
                <Text style={[
                  styles.optionText,
                  !hasGoalTime && styles.optionTextActive,
                ]}>
                  🎯 Just Finish
                </Text>
                <Text style={[
                  styles.optionDesc,
                  !hasGoalTime && styles.optionDescActive,
                ]}>
                  My goal is to complete the race
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButtonWide,
                  hasGoalTime && styles.optionButtonActive,
                ]}
                onPress={() => {
                  setHasGoalTime(true);
                  updateForm('race_strategy', 'send_it');
                }}
              >
                <Text style={[
                  styles.optionText,
                  hasGoalTime && styles.optionTextActive,
                ]}>
                  🏆 I Have a Goal Time
                </Text>
                <Text style={[
                  styles.optionDesc,
                  hasGoalTime && styles.optionDescActive,
                ]}>
                  I'm targeting a specific finish time
                </Text>
              </TouchableOpacity>
            </View>

            {/* Goal Time Input */}
            {hasGoalTime && (
              <>
                <Text style={styles.label}>Target Finish Time</Text>
                <View style={styles.goalTimeRow}>
                  <View style={styles.goalTimeInput}>
                    <TextInput
                      style={[styles.input, styles.goalTimeField]}
                      placeholder="1"
                      placeholderTextColor="#6b7280"
                      keyboardType="number-pad"
                      value={goalTimeHours}
                      onChangeText={setGoalTimeHours}
                      maxLength={1}
                    />
                    <Text style={styles.goalTimeLabel}>hr</Text>
                  </View>
                  <Text style={styles.timeSeparator}>:</Text>
                  <View style={styles.goalTimeInput}>
                    <TextInput
                      style={[styles.input, styles.goalTimeField]}
                      placeholder="30"
                      placeholderTextColor="#6b7280"
                      keyboardType="number-pad"
                      value={goalTimeMinutes}
                      onChangeText={setGoalTimeMinutes}
                      maxLength={2}
                    />
                    <Text style={styles.goalTimeLabel}>min</Text>
                  </View>
                  <Text style={styles.timeSeparator}>:</Text>
                  <View style={styles.goalTimeInput}>
                    <TextInput
                      style={[styles.input, styles.goalTimeField]}
                      placeholder="00"
                      placeholderTextColor="#6b7280"
                      keyboardType="number-pad"
                      value={goalTimeSeconds}
                      onChangeText={setGoalTimeSeconds}
                      maxLength={2}
                    />
                    <Text style={styles.goalTimeLabel}>sec</Text>
                  </View>
                </View>
                <Text style={styles.hint}>
                  We'll pace you to hit this target
                </Text>
              </>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {renderStep()}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navRow}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={() => {
            if (step < 3) {
              setStep(step + 1);
            } else {
              handleSubmit();
            }
          }}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? 'Simulating...' : step === 3 ? 'Get My Race Plan' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  progressDotActive: {
    backgroundColor: '#f97316',
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 8,
    marginTop: 20,
  },
  sublabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    width: 80,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 24,
    color: '#fff',
    marginHorizontal: 8,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weightInput: {
    flex: 1,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  unitText: {
    fontSize: 16,
    color: '#6b7280',
  },
  unitTextActive: {
    color: '#f97316',
    fontWeight: '700',
  },
  unitDivider: {
    fontSize: 16,
    color: '#374151',
    marginHorizontal: 8,
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionGroupWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  optionButtonSmall: {
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  optionButtonWide: {
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    width: '100%',
    marginBottom: 4,
  },
  optionButtonActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  optionText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  optionDesc: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  optionDescActive: {
    color: 'rgba(0,0,0,0.6)',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  infoText: {
    color: '#93c5fd',
    fontSize: 14,
    lineHeight: 20,
  },
  goalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTimeInput: {
    alignItems: 'center',
  },
  goalTimeField: {
    width: 60,
    textAlign: 'center',
  },
  goalTimeLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});