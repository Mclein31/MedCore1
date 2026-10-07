import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { usePatient } from '../hooks/usePatient';
import Brand from '../components/Brand';
import { Icon } from '../components/icons';
import { C, Card, LedgerRow, LoadingState, RefreshNotice, SecondaryButton, Screen, SectionHeader, T } from '../components/ui';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuth();
  const { patient, currentEncounter, loading, error, refresh } = usePatient();
  const [busy, setBusy] = React.useState(false);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    try { await logout(); } finally { setBusy(false); }
  }
  if (loading && !patient) return <LoadingState message="Loading your profile…" />;
  return <Screen><ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
    <RefreshNotice error={error} onRetry={refresh} />
    <Text accessibilityRole="header" style={[T.title, { marginTop: 12 }]}>Profile</Text>
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', paddingVertical: 24 }}>
      <View accessible={false} style={{ width: 64, height: 64, borderRadius: 24, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="profile" size={28} color={C.brand} /></View>
      <View style={{ flex: 1 }}><Text style={T.section}>{patient?.fullName || user?.fullName || 'Your account'}</Text><Text style={[T.meta, { marginTop: 4 }]}>{user?.email || ''}</Text></View>
    </View>
    <SectionHeader title="Account" />
    <Card flush>
      <LedgerRow title="Contact number" value={patient?.contactNumber || '—'} />
      <LedgerRow title="Senior citizen" value={patient?.isSeniorCitizen ? 'Verified' : 'No'} tone={patient?.isSeniorCitizen ? 'ok' : undefined} />
      <LedgerRow title="PWD" value={patient?.isPwd ? 'Verified' : 'No'} tone={patient?.isPwd ? 'ok' : undefined} last />
    </Card>
    <SectionHeader title="Coverage" />
    <Card flush>
      <LedgerRow title="PhilHealth" value={patient?.philhealthPinMasked || '—'} />
      <LedgerRow title="HMO" sub={currentEncounter?.hmo?.cardMasked || ''} value={currentEncounter?.hmo?.providerName === 'None' ? 'No HMO on file' : currentEncounter?.hmo?.providerName || '—'} />
      <LedgerRow title="Review coverage" onPress={() => navigation.navigate('Coverage')} last />
    </Card>
    <SectionHeader title="Records & updates" />
    <Card flush>
      <LedgerRow title="Documents & receipts" onPress={() => navigation.navigate('Documents')} />
      <LedgerRow title="Hospital updates" onPress={() => navigation.navigate('Notifications')} last />
    </Card>
    <SectionHeader title="Support & privacy" />
    <Text style={[T.body, { color: C.secondary, marginBottom: 12 }]}>Only your own hospital records are visible here. For billing questions or account recovery, contact your hospital billing desk.</Text>
    <SecondaryButton title={busy ? 'Signing out…' : 'Log out'} onPress={signOut} disabled={busy} />
    <View style={{ alignItems: 'center', marginTop: 28, gap: 4 }}><Brand size={28} /><Text style={T.meta}>Patient financial companion · v1.0.0</Text></View>
  </ScrollView></Screen>;
}
