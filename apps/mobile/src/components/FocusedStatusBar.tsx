import { useIsFocused } from '@react-navigation/native';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';

// Expo Go and Expo's default iOS builds use the global status-bar manager.
// Inactive navigation screens must not override the visible screen's style.
export default function FocusedStatusBar({ style }: { style: StatusBarStyle }) {
  const focused = useIsFocused();
  return focused ? <StatusBar style={style} /> : null;
}
