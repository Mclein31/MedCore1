import type { NavigatorScreenParams } from '@react-navigation/native';
export type TabParamList = { Home: undefined; Bill: undefined; Coverage: undefined; Payments: undefined; Profile: undefined };
export type RootStackParamList = {
  Auth: undefined; Main: NavigatorScreenParams<TabParamList> | undefined; PaymentFlow: { encounterId: string } | undefined;
  Claims: undefined; Documents: undefined; Notifications: undefined;
  RecordDetail: { encounterId: string; documentKind?: string; documentId?: string };
};
