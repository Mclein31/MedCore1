import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { PaymentAttemptStore } from './paymentAttemptStore';

const key = (account: string) => `medcore_pending_payment.${account}`;
// Native attempts use encrypted storage. Web preview uses session memory;
// backend authorization and idempotency protect the presentation processor.
export const paymentAttempts = new PaymentAttemptStore({
  read: (account) => (Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(key(account))),
  write: (account, value) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync(key(account), value),
  remove: (account) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(key(account)),
});
