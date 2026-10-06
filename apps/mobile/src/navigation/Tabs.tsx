import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../lib/auth';
import LaunchScreen from '../components/LaunchScreen';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import BillScreen from '../screens/BillScreen';
import CoverageScreen from '../screens/CoverageScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import PaymentFlowScreen from '../screens/PaymentFlowScreen';
import ClaimsScreen from '../screens/ClaimsScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MedHeader from '../components/Header';
import { TabGlyph } from '../components/icons';
import { C } from '../components/ui';
import { ErrorState, Screen, SecondaryButton } from '../components/ui';
import { PatientProvider } from '../hooks/PatientProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RecordDetailScreen from '../screens/RecordDetailScreen';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ navigation }: any) => ({
        header: () => <MedHeader navigation={navigation} />,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopWidth: 1,
          borderTopColor: C.border,
          paddingTop: 6,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8)
        }
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ focused }: { focused: boolean }) => <TabGlyph name="home" focused={focused} /> }}
      />
      <Tab.Screen
        name="Bill"
        component={BillScreen}
        options={{ tabBarLabel: 'Bill', tabBarIcon: ({ focused }: { focused: boolean }) => <TabGlyph name="bill" focused={focused} /> }}
      />
      <Tab.Screen
        name="Coverage"
        component={CoverageScreen}
        options={{ tabBarLabel: 'Coverage', tabBarIcon: ({ focused }: { focused: boolean }) => <TabGlyph name="coverage" focused={focused} /> }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{ tabBarLabel: 'Payments', tabBarIcon: ({ focused }: { focused: boolean }) => <TabGlyph name="payments" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile', tabBarIcon: ({ focused }: { focused: boolean }) => <TabGlyph name="profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading, sessionError, retrySession, logout } = useAuth();
  if (loading) return <LaunchScreen />;
  if (sessionError) return <Screen safeTop><ErrorState message={sessionError} onRetry={retrySession} /><SecondaryButton title="Back to log in" onPress={() => { void logout(); }} /></Screen>;
  return (
    <PatientProvider key={user?.id || 'signed-out'}>
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: C.surface },
          headerTintColor: C.ink,
          headerTitleStyle: { fontSize: 17, fontWeight: '700' },
          headerShadowVisible: true
        }}
      >
        {user ? (
          <React.Fragment>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="RecordDetail" component={RecordDetailScreen} options={{ title: 'Hospital record' }} />
            <Stack.Screen name="PaymentFlow" component={PaymentFlowScreen} options={{ title: 'Pay balance' }} />
            <Stack.Screen name="Claims" component={ClaimsScreen} options={{ title: 'Insurance claims' }} />
            <Stack.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Documents' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Updates' }} />
          </React.Fragment>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </PatientProvider>
  );
}
