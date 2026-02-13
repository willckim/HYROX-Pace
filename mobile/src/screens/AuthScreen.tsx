/**
 * Auth Screen — Sign in / Create account with email + password.
 * Google OAuth available only when EXPO_PUBLIC_GOOGLE_*_CLIENT_ID env vars are set.
 * Dark theme (#111) matching existing screens.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/authStore';

// ---------------------------------------------------------------------------
// Google OAuth — gate everything behind env-var presence
// ---------------------------------------------------------------------------

const GOOGLE_IOS_CLIENT_ID =
  typeof process !== 'undefined' &&
  process.env &&
  typeof process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID === 'string' &&
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.length > 0
    ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    : null;

const GOOGLE_ANDROID_CLIENT_ID =
  typeof process !== 'undefined' &&
  process.env &&
  typeof process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID === 'string' &&
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.length > 0
    ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
    : null;

const GOOGLE_WEB_CLIENT_ID =
  typeof process !== 'undefined' &&
  process.env &&
  typeof process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID === 'string' &&
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.length > 0
    ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    : null;

const GOOGLE_ENABLED = !!(GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID);

// Conditionally import Google auth only when client IDs exist.
// Static imports of expo-auth-session are fine — it's the *hook call* with an
// undefined clientId that crashes.  We lazily call the hook inside a wrapper
// component that is only mounted when GOOGLE_ENABLED is true.
let GoogleModule: typeof import('expo-auth-session/providers/google') | null = null;
let WebBrowserModule: typeof import('expo-web-browser') | null = null;

if (GOOGLE_ENABLED) {
  try {
    GoogleModule = require('expo-auth-session/providers/google');
    WebBrowserModule = require('expo-web-browser');
    WebBrowserModule?.maybeCompleteAuthSession();
  } catch {
    // expo-auth-session not resolvable — keep null
  }
}

// ---------------------------------------------------------------------------
// Google Sign-In button (separate component so the hook is only called when
// GOOGLE_ENABLED is true AND the component is mounted)
// ---------------------------------------------------------------------------

function GoogleSignInButton({
  onToken,
  onError,
  disabled,
}: {
  onToken: (idToken: string) => void;
  onError: (msg: string) => void;
  disabled: boolean;
}) {
  if (!GoogleModule) return null;

  const config: Record<string, string> = {};
  if (GOOGLE_IOS_CLIENT_ID) config.iosClientId = GOOGLE_IOS_CLIENT_ID;
  if (GOOGLE_ANDROID_CLIENT_ID) config.androidClientId = GOOGLE_ANDROID_CLIENT_ID;
  if (GOOGLE_WEB_CLIENT_ID) config.webClientId = GOOGLE_WEB_CLIENT_ID;

  // Safe to call — we only render this component when IDs are verified present
  const [, response, promptAsync] = GoogleModule.useAuthRequest(config);

  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        onToken(idToken);
      } else {
        onError('No id_token received from Google');
      }
    } else if (response?.type === 'error') {
      onError(response.error?.message || 'Google sign-in failed');
    }
  }, [response]);

  return (
    <TouchableOpacity
      style={[styles.googleButton, disabled && styles.buttonDisabled]}
      onPress={() => promptAsync()}
      disabled={disabled}
    >
      <Text style={styles.googleButtonText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Auth Screen
// ---------------------------------------------------------------------------

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, googleSignIn } = useAuthStore();

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, displayName.trim() || undefined);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    setError('');
    setLoading(true);
    try {
      await googleSignIn(idToken);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>HYROXPace</Text>
            <Text style={styles.subtitle}>Know your race before you race it.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'register' && (
              <TextInput
                style={styles.input}
                placeholder="Display Name (optional)"
                placeholderTextColor="#6b7280"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Google — entirely absent from tree when not configured */}
            {GOOGLE_ENABLED && (
              <GoogleSignInButton
                onToken={handleGoogleToken}
                onError={setError}
                disabled={loading}
              />
            )}

            {/* Toggle mode */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
            >
              <Text style={styles.toggleText}>
                {mode === 'login'
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    color: '#f97316',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleText: {
    color: '#f97316',
    fontSize: 14,
  },
});
