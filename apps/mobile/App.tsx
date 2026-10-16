import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/lib/auth';
import { useNotificationSetup } from './src/lib/notifications';
import RootNavigator from './src/navigation/Tabs';
import { C } from './src/components/theme';

function NotificationsInit() {
  useNotificationSetup();
  return null;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError() {
    return { error: 'Something went wrong while starting the app.' };
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: C.paper,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            gap: 10,
          }}
        >
          <StatusBar style="dark" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, textAlign: 'center' }}>
            MedCore could not start
          </Text>
          <Text style={{ fontSize: 14, color: C.secondary, textAlign: 'center' }}>{this.state.error}</Text>
          <Text style={{ fontSize: 13, color: C.secondary, textAlign: 'center' }}>
            Try again. If this persists, contact your hospital for help.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => this.setState({ error: null })}
            style={{ minHeight: 48, justifyContent: 'center', padding: 16 }}
          >
            <Text style={{ color: C.brand, fontWeight: '700' }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <NotificationsInit />
          <RootNavigator />
        </AuthProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
