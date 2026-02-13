/**
 * Home Screen
 * Landing page with CTA to start simulation
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/TabNavigator';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View style={styles.brandSection}>
          <Text style={styles.logo}>HYROX</Text>
          <Text style={styles.logoAccent}>Pace</Text>
          <Text style={styles.tagline}>Know your race before you race it.</Text>
        </View>

        {/* Value Props */}
        <View style={styles.valueProps}>
          <ValueProp 
            emoji="🎯" 
            text="Personalized finish time prediction"
          />
          <ValueProp 
            emoji="⚠️" 
            text="Know where you'll struggle most"
          />
          <ValueProp 
            emoji="📋" 
            text="Segment-by-segment pacing plan"
          />
          <ValueProp 
            emoji="💡" 
            text="Execution cues for race day"
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Intake')}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>Build My Race Plan</Text>
          <Text style={styles.ctaSubtext}>Takes 3-5 minutes</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          Not a training app. A race execution app.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function ValueProp({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.valuePropRow}>
      <Text style={styles.valuePropEmoji}>{emoji}</Text>
      <Text style={styles.valuePropText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  brandSection: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  logoAccent: {
    fontSize: 48,
    fontWeight: '300',
    color: '#f97316', // Orange accent
    marginTop: -10,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    fontStyle: 'italic',
  },
  valueProps: {
    marginVertical: 40,
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  valuePropEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  valuePropText: {
    fontSize: 16,
    color: '#e5e7eb',
    flex: 1,
  },
  ctaButton: {
    backgroundColor: '#f97316',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '700',
  },
  ctaSubtext: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
  },
});