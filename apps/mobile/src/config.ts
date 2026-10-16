import { Platform } from 'react-native';

/**
 * Where the API lives. EXPO_PUBLIC_API_URL wins. Otherwise the app assumes the
 * development API on this computer: the iOS simulator reaches it at localhost,
 * the Android emulator at 10.0.2.2. A physical phone needs EXPO_PUBLIC_API_URL
 * set to the computer's LAN address and the API started with HOST=0.0.0.0.
 */
function apiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit;
  const port = process.env.EXPO_PUBLIC_API_PORT ?? '8787';
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:${port}`;
}

export const API_BASE_URL = apiBaseUrl();
export const DEFAULT_FACILITY_CODE = process.env.EXPO_PUBLIC_FACILITY_CODE ?? 'SJMC-MNL';
