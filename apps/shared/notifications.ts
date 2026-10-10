export interface StaffNotification {
  id: string;
  type: 'PAYMENT' | 'STAGE' | 'GATE_PASS' | 'HMO' | 'DISPUTE';
  title: string;
  message: string;
  encounterId: string;
  timestamp: string;
  read: boolean;
  severity: 'SUCCESS' | 'INFO' | 'WARNING' | 'CRITICAL';
}
export interface StaffNotificationFeed { notifications: StaffNotification[]; unreadCount: number }
