import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePatient } from '../hooks/usePatient';
import { useUnreadCount } from '../hooks/useUnread';
import { getFacilityName } from '../lib/facility';
import { Icon } from './icons';
import { ASSETS } from '../lib/assets';
import { C } from './ui';

const ROOM_LABELS: Record<string, string> = {
  WARD: 'Ward',
  SEMI_PRIVATE: 'Semi-Private',
  REGULAR_PRIVATE: 'Regular Private',
  SUITE: 'Suite',
  ICU: 'ICU',
  NICU: 'NICU'
};

// WHO I AM + WHERE I AM ADMITTED on the left, notifications on the right.
// Names truncate; height derives from content + safe-area inset.
export default function MedHeader({ navigation }: { navigation: any }) {
  const { patient, currentEncounter, loading, error } = usePatient();
  const unread = useUnreadCount();
  const insets = useSafeAreaInsets();
  const [facility, setFacility] = useState('Your hospital');

  useEffect(() => {
    getFacilityName().then(setFacility).catch(() => {});
  }, []);

  const admitted = !!currentEncounter;
  const cleared = currentEncounter?.stage === 'CLEARED_GATE_PASS';
  const line2 = !admitted
    ? loading ? 'Loading your account…' : error ? 'Account information unavailable' : 'No active admission'
    : cleared
      ? `Cleared · Room ${currentEncounter.roomBed}`
      : `Room ${currentEncounter.roomBed} · ${ROOM_LABELS[currentEncounter.roomCategory] || currentEncounter.roomCategory}`;

  return (
    <View style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 12 }}>
        <Image source={ASSETS.brand.badge} resizeMode="contain" accessibilityLabel="MedCore" style={{ width: 42, height: 42 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>
            {patient?.fullName || 'Your account'}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 12.5, color: C.secondary, marginTop: 1 }}>
            {admitted ? `${facility} · ${line2}` : line2}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Open notifications, ${unread} unread` : 'Open notifications'}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' })}
        >
          <View>
            <Icon name="bell" size={23} color={C.ink} />
            {unread > 0 && (
              <View
                style={{
                  position: 'absolute', top: -2, right: -3,
                  minWidth: 17, height: 17, borderRadius: 8.5,
                  backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 4, borderWidth: 2, borderColor: C.surface
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                  {unread > 9 ? '9+' : String(unread)}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
