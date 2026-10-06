import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { usePatient } from '../hooks/usePatient';
import { C, Card, LedgerRow, LoadingState, RefreshNotice, PrimaryButton, Screen, SectionHeader, T } from '../components/ui';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { patient, currentEncounter, loading, error, refresh } = usePatient();
  const [busy, setBusy] = React.useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  }

  if (loading && !patient) return <LoadingState message="Loading your profile…" />;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <RefreshNotice error={error} onRetry={refresh} />
        <View style={{ marginTop: 14, marginBottom: 4 }}>
          <Text style={T.title}>{patient?.fullName || user?.fullName || 'Your profile'}</Text>
          <Text style={[T.meta, { marginTop: 2 }]}>{user?.email || ''}</Text>
        </View>

        <SectionHeader title="About you" />
        <Card flush>
          <LedgerRow title="Contact number" value={patient?.contactNumber || '—'} />
          <LedgerRow title="Senior citizen" value={patient?.isSeniorCitizen ? '✓ Verified' : 'No'} tone={patient?.isSeniorCitizen ? 'ok' : undefined} />
          <LedgerRow title="PWD" value={patient?.isPwd ? '✓ Verified' : 'No'} tone={patient?.isPwd ? 'ok' : undefined} last />
        </Card>

        <SectionHeader title="Your coverage" />
        <Card flush>
          <LedgerRow title="PhilHealth" value={patient?.philhealthPinMasked || '—'} />
          <LedgerRow title="HMO" sub={currentEncounter?.hmo?.cardMasked || ''} value={currentEncounter?.hmo?.providerName === 'None' ? 'No HMO on file' : currentEncounter?.hmo?.providerName || '—'} last />
        </Card>

        <SectionHeader title="Trust & privacy" />
        <Card>
          <Text style={[T.body, { color: C.secondary }]}>
            Only your own records are visible in this app. Signing out clears your session from this device. For billing questions, visit the hospital financial office.
          </Text>
        </Card>

        {loading ? <LoadingState message="Refreshing…" /> : null}
        <PrimaryButton title={busy ? 'Signing out…' : 'Log out'} onPress={signOut} disabled={busy} />
        <Text style={[T.meta, { textAlign: 'center', marginVertical: 16 }]}>MedCore · Patient financial companion v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}
