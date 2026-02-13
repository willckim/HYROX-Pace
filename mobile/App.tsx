/**
 * HYROXPace Mobile App
 * Know your race before you race it.
 */

import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import AuthScreen from './src/screens/AuthScreen';

// Navigation
import TabNavigator from './src/navigation/TabNavigator';

// Store
import { useAuthStore } from './src/store/authStore';

type AuthStackParamList = {
  Auth: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

export default function App() {
  const { isAuthenticated, isLoading, loadToken } = useAuthStore();

  useEffect(() => {
    loadToken();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {!isAuthenticated ? (
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Auth" component={AuthScreen} />
          </AuthStack.Navigator>
        ) : (
          <TabNavigator />
        )}
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
