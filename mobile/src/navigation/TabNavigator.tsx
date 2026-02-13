/**
 * TabNavigator — Bottom tab layout with Home stack, Dashboard, and Profile tabs.
 */

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import IntakeScreen from '../screens/IntakeScreen';
import ResultsScreen from '../screens/ResultsScreen';
import PlanScreen from '../screens/PlanScreen';
import AgentDashboard from '../screens/AgentDashboard';
import ProfileScreen from '../screens/ProfileScreen';

import { RaceSimulation } from '../types';

// Home stack param list — replaces RootStackParamList for inner navigation
export type HomeStackParamList = {
  HomeMain: undefined;
  Intake: undefined;
  Results: { simulationId: string; simulation: RaceSimulation };
  Plan: { simulationId: string; simulation: RaceSimulation };
};

export type TabParamList = {
  HomeTab: undefined;
  DashboardTab: undefined;
  ProfileTab: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#111' },
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Intake"
        component={IntakeScreen}
        options={{ title: 'Build Your Profile', presentation: 'modal' }}
      />
      <HomeStack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ title: 'Your Race Prediction' }}
      />
      <HomeStack.Screen
        name="Plan"
        component={PlanScreen}
        options={{ title: 'Race Day Plan' }}
      />
    </HomeStack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#1f2937',
        },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18, fontWeight: '700' }}>H</Text>
          ),
        }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={AgentDashboard}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18, fontWeight: '700' }}>D</Text>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18, fontWeight: '700' }}>P</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
