import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../lib/auth';
import LaunchGate from '../components/LaunchGate';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { useOnboarding } from '../hooks/useOnboarding';
import { launchDestination } from '../lib/onboarding';
import HomeScreen from '../screens/HomeScreen';
import BillScreen from '../screens/BillScreen';
import CoverageScreen from '../screens/CoverageScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import PaymentFlowScreen from '../screens/PaymentFlowScreen';
import ClaimsScreen from '../screens/ClaimsScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MedHeader, { HeaderBack } from '../components/Header';
import PatientSelector from '../components/PatientSelector';
import MedTabBar from '../components/MedTabBar';
import { C } from '../components/ui';
import { HeaderLayout } from '../components/theme';
import { ErrorState, Screen, SecondaryButton } from '../components/ui';
import { PatientProvider } from '../hooks/PatientProvider';

import RecordDetailScreen from '../screens/RecordDetailScreen';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <MedTabBar {...props} />}
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ navigation, route }) => ({
        header: () => (
          <MedHeader
            navigation={navigation}
            title={route.name}
            titleAccessory={route.name === 'Profile' ? <PatientSelector /> : undefined}
          />
        ),
        sceneStyle: { backgroundColor: C.paper },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bill" component={BillScreen} />
      <Tab.Screen name="Coverage" component={CoverageScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading, sessionError, retrySession, logout, selectedPatientId } = useAuth();
  const verifiedThisLaunch = React.useRef(false);
  if (user) verifiedThisLaunch.current = true;
  const onboarding = useOnboarding(verifiedThisLaunch.current);
  const destination = launchDestination({
    sessionLoading: loading,
    onboardingLoading: onboarding.loading,
    sessionError,
    user,
    onboardingError: onboarding.loadError,
    completed: onboarding.progress.completed,
    verifiedThisLaunch: verifiedThisLaunch.current,
  });
  function renderDestination() {
    if (destination === 'preload') return null;
    if (destination === 'session-recovery')
      return (
        <Screen safeTop>
          <StatusBar style="dark" />
          <ErrorState message={sessionError!} onRetry={retrySession} />
          <SecondaryButton
            title="Back to log in"
            onPress={() => {
              void logout();
            }}
          />
        </Screen>
      );
    if (destination === 'onboarding-recovery')
      return (
        <Screen safeTop>
          <StatusBar style="dark" />
          <ErrorState message={onboarding.loadError!} onRetry={onboarding.restore} />
        </Screen>
      );
    if (destination === 'onboarding')
      return (
        <OnboardingScreen
          progress={onboarding.progress}
          saving={onboarding.saving}
          error={onboarding.saveError}
          onSave={onboarding.save}
        />
      );
    return (
      <PatientProvider
        key={`${user?.id || 'signed-out'}:${user?.role || ''}:${selectedPatientId || 'default'}`}
      >
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            screenOptions={({ navigation }) => ({
              header: ({ navigation: screenNavigation, route, options }) => (
                <MedHeader
                  title={options.title || route.name}
                  leading={options.headerLeft?.({
                    tintColor: C.ink,
                    canGoBack: screenNavigation.canGoBack(),
                  })}
                />
              ),
              headerTitleAlign: 'center',
              headerLeft: () => <HeaderBack onPress={() => navigation.goBack()} />,
              headerBackVisible: false,
              headerStyle: { backgroundColor: C.surface },
              headerTintColor: C.ink,
              headerTitleStyle: { fontSize: HeaderLayout.titleSize, fontWeight: '600' },
              headerShadowVisible: false,
            })}
          >
            {user ? (
              <React.Fragment>
                <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
                <Stack.Screen
                  name="RecordDetail"
                  component={RecordDetailScreen}
                  options={{ title: 'Hospital record' }}
                />
                <Stack.Screen
                  name="PaymentFlow"
                  component={PaymentFlowScreen}
                  options={{ title: 'Pay balance' }}
                />
                <Stack.Screen
                  name="Claims"
                  component={ClaimsScreen}
                  options={{ title: 'Insurance claims' }}
                />
                <Stack.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Documents' }} />
                <Stack.Screen
                  name="Notifications"
                  component={NotificationsScreen}
                  options={{ title: 'Updates' }}
                />
              </React.Fragment>
            ) : (
              <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PatientProvider>
    );
  }
  return <LaunchGate loading={destination === 'preload'}>{renderDestination()}</LaunchGate>;
}
