import { usePullRefresh } from '../hooks/usePullRefresh';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { isMobileDemoAdmin } from '../lib/mobileAccess';
import { usePatient } from '../hooks/usePatient';
import { useResource } from '../hooks/useResource';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { createPatientApi } from '../services/patientApi';
import { Icon } from './icons';
import { C, EmptyState, ErrorState, LoadingState, RefreshNotice, T } from './ui';

function PatientDirectory({ currentId, onSelect }: { currentId: string | null; onSelect: (id: string) => void }) {
  const { client } = useAuth();
  const load = useCallback(() => createPatientApi(client).listHospitalPatients(), [client]);
  const { data, loading, error, refresh } = useResource(load);
  const pullRefresh = usePullRefresh(refresh);
  const [search, setSearch] = useState('');
  const patients = useMemo(() => (data?.items || []).filter(patient =>
    `${patient.fullName} ${patient.mrn}`.toLowerCase().includes(search.trim().toLowerCase())), [data, search]);
  if (loading && !data) return <LoadingState message="Loading hospital patients…" />;
  if (!data) return <ErrorState message={error || 'We could not load hospital patients.'} onRetry={refresh} />;
  return <>
    <Text style={[T.meta, { marginBottom: 12 }]}>{data.total} patient records</Text>
    <TextInput value={search} onChangeText={setSearch} placeholder="Search name or MRN" accessibilityLabel="Search hospital patients by name or MRN" autoCapitalize="none" autoCorrect={false} style={{ minHeight: 48, backgroundColor: C.paper, borderColor: C.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginBottom: 12, color: C.ink, fontSize: 16 }} />
    <RefreshNotice error={error} onRetry={refresh} />
    <FlatList data={patients} keyExtractor={patient => patient.id} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} tintColor={C.brand} />}
      contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}
      ListEmptyComponent={<EmptyState title="No matching patients" detail="Try another name or medical record number." />}
      renderItem={({ item }) => <Pressable onPress={() => onSelect(item.id)} accessibilityRole="radio" accessibilityLabel={`${item.fullName}, ${item.mrn}`} accessibilityState={{ checked: item.id === currentId }} aria-checked={item.id === currentId} style={({ pressed }) => ({ paddingVertical: 14, paddingHorizontal: 10, marginBottom: 4, borderRadius: 10, backgroundColor: item.id === currentId ? C.brandSoft : pressed ? C.paper : C.surface, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
        <Icon name="profile" size={20} color={item.id === currentId ? C.brand : C.secondary} />
        <View style={{ flex: 1 }}><Text style={[T.body, { fontSize: 16, fontWeight: '600' }]}>{item.fullName}</Text><Text style={[T.meta, { marginTop: 4 }]}>{item.mrn}</Text></View>
        {item.id === currentId && <Icon name="check" size={20} color={C.brand} />}
      </Pressable>} />
  </>;
}

function AdministratorSelector() {
  const { selectedPatientId, selectPatient } = useAuth();
  const { patient } = usePatient();
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return <>
    <Pressable testID="profile-patient-dropdown" onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Choose hospital patient${patient ? `, currently ${patient.fullName}` : ''}`} accessibilityState={{ expanded: open }} aria-expanded={open} style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Icon name="chevronDown" size={20} color={C.brand} />
    </Pressable>
    <Modal visible={open} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: C.scrim, paddingTop: insets.top + 64, paddingBottom: insets.bottom + 16, paddingHorizontal: 16, alignItems: 'center' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Dismiss patient selection" />
        <View testID="profile-patient-menu" accessibilityViewIsModal style={{ width: '100%', maxWidth: 520, height: Math.max(220, Math.min(580, height - insets.top - insets.bottom - 96)), backgroundColor: C.surface, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text accessibilityRole="header" style={[T.section, { flex: 1 }]}>Choose patient</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close patient selection" style={{ minHeight: 48, minWidth: 60, alignItems: 'center', justifyContent: 'center' }}><Text style={[T.body, { color: C.brand, fontWeight: '600' }]}>Done</Text></Pressable>
          </View>
          {open && <PatientDirectory currentId={selectedPatientId || patient?.id || null} onSelect={id => {
            setOpen(false);
            if (id !== selectedPatientId) selectPatient(id);
          }} />}
        </View>
      </View>
    </Modal>
  </>;
}

export default function PatientSelector() {
  const { user } = useAuth();
  return isMobileDemoAdmin(user) ? <AdministratorSelector /> : null;
}
