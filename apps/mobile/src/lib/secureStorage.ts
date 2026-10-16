import * as SecureStore from 'expo-secure-store';
import type { SecureStorage } from './tokenStore';

const KEY = 'medcore.patient.session.v2';
// Never synced to iCloud or restored onto another device, and unreadable while the phone is locked.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const keychainStorage: SecureStorage = {
  read: () => SecureStore.getItemAsync(KEY, OPTIONS),
  write: (token) => SecureStore.setItemAsync(KEY, token, OPTIONS),
  remove: () => SecureStore.deleteItemAsync(KEY, OPTIONS),
};
