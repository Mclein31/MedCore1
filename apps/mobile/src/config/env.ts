// Central environment resolution. Never hard-code production URLs.
// Configure via EXPO_PUBLIC_API_BASE_URL (see .env.example).

import { resolveApiConfig } from './apiConfig';
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const config = resolveApiConfig(process.env.EXPO_PUBLIC_API_BASE_URL, isDev);
const ROOT = config.root;

export const ENV = {
  apiRoot: ROOT,
  apiBase: `${ROOT}/api/v1`,
  healthUrl: `${ROOT}/api/health`,
  facilityCode: (process.env.EXPO_PUBLIC_FACILITY_CODE || 'SJMC-MNL').trim() || 'SJMC-MNL',
  dataMode: (process.env.EXPO_PUBLIC_DATA_MODE || 'live').trim() || 'live',
  isDev,
  configurationError: config.error
} as const;
