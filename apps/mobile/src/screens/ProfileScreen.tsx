import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { isMobileDemoAdmin } from '../lib/mobileAccess';
import { useFacilityName } from '../hooks/useFacility';
import { usePatient } from '../hooks/usePatient';
import {
  C,
  Card,
  ConfirmationModal,
  LedgerRow,
  LoadingState,
  RefreshNotice,
  Screen,
  SectionHeader,
  T,
} from '../components/ui';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuth();
  const admin = isMobileDemoAdmin(user);
  const facility = useFacilityName();
  const { patient, currentEncounter, loading, error, refresh } = usePatient();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const name = (admin ? user?.fullName : patient?.fullName || user?.fullName) || 'Your account';
  const initials = name
    .split(/[ ,]+/)
    .filter(Boolean)
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .map((part) => Array.from(part)[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  }
  if (!admin && loading && !patient) return <LoadingState message="Loading your profile…" />;
  return (
    <Screen gutter={12} safeBottom={false} background={C.paper}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <RefreshNotice error={error} onRetry={refresh} />
        <View
          style={{
            minHeight: 100,
            backgroundColor: C.surface,
            padding: 12,
            marginTop: 8,
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
            borderRadius: 10,
          }}
        >
          <View
            accessible={false}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: C.blueSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '500', color: C.blueDark }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[T.body, { fontSize: 16, fontWeight: '500' }]}>{name}</Text>
            <Text style={[T.meta, { marginTop: 4 }]}>{user?.email || ''}</Text>
            {admin && patient && (
              <Text style={[T.meta, { marginTop: 8 }]}>Viewing patient: {patient.fullName}</Text>
            )}
          </View>
        </View>
        <SectionHeader subtle title="Account" />
        <Card flush>
          {admin ? (
            <>
              <LedgerRow icon="profile" textSize={16} title="Role" value="Administrator" />
              <LedgerRow icon="contact" textSize={16} title="Hospital" value={facility} last />
            </>
          ) : (
            <>
              <LedgerRow
                icon="contact"
                textSize={16}
                title="Contact number"
                value={patient?.contactNumber || '—'}
              />
              <LedgerRow
                icon="profile"
                textSize={16}
                title="Senior citizen"
                value={patient?.isSeniorCitizen ? 'Verified' : 'No'}
                tone={patient?.isSeniorCitizen ? 'ok' : undefined}
              />
              <LedgerRow
                icon="coverage"
                textSize={16}
                title="PWD"
                value={patient?.isPwd ? 'Verified' : 'No'}
                tone={patient?.isPwd ? 'ok' : undefined}
                last
              />
            </>
          )}
        </Card>
        {!admin && (
          <>
            <SectionHeader subtle title="Coverage" topSpacing={8} />
            <Card flush>
              <LedgerRow
                icon="coverage"
                textSize={16}
                title="PhilHealth"
                value={patient?.philhealthPinMasked || '—'}
              />
              <LedgerRow
                icon="file"
                textSize={16}
                title="HMO"
                sub={currentEncounter?.hmo?.cardMasked || ''}
                value={
                  currentEncounter?.hmo?.providerName === 'None'
                    ? 'No HMO on file'
                    : currentEncounter?.hmo?.providerName || '—'
                }
              />
              <LedgerRow
                icon="coverage"
                textSize={16}
                title="Review coverage"
                onPress={() => navigation.navigate('Coverage')}
                last
              />
            </Card>
          </>
        )}
        <SectionHeader subtle title="Records & updates" topSpacing={8} />
        <Card flush>
          <LedgerRow
            icon="file"
            textSize={16}
            title="Documents & receipts"
            onPress={() => navigation.navigate('Documents')}
          />
          <LedgerRow
            icon="bell"
            textSize={16}
            title="Hospital updates"
            onPress={() => navigation.navigate('Notifications')}
            last
          />
        </Card>
        <SectionHeader subtle title="Support & privacy" topSpacing={8} />
        <Text style={[T.meta, { marginHorizontal: 12, marginBottom: 16 }]}>
          {admin
            ? 'Use the dropdown beside Profile to choose a hospital patient. Home, bills and records follow that selection.'
            : 'Only your own hospital records are visible here. For billing questions or account recovery, contact your hospital billing desk.'}
        </Text>
        <Card flush>
          <LedgerRow icon="logout" textSize={16} title="Log out" onPress={() => setConfirm(true)} last />
        </Card>
        <Text style={[T.meta, { textAlign: 'center', marginTop: 16 }]}>
          MedCore · Patient financial companion
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Solar icons by 480 Design, CC BY 4.0 license"
          onPress={() => {
            void Linking.openURL('https://solar-icons.vercel.app/docs/v2/community/license').catch(() => {});
          }}
          style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}
        >
          <Text style={[T.meta, { textAlign: 'center', textDecorationLine: 'underline' }]}>
            Solar icons by 480 Design · CC BY 4.0
          </Text>
        </Pressable>
      </ScrollView>
      <ConfirmationModal
        visible={confirm}
        title="Log out"
        detail="Are you sure you want to log out of MedCore?"
        confirmLabel="Yes, log out"
        onConfirm={() => {
          void signOut();
        }}
        onCancel={() => setConfirm(false)}
        busy={busy}
      />
    </Screen>
  );
}
