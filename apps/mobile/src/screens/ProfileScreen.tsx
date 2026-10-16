import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { API_BASE_URL } from '../config';
import { api, errorMessage } from '../lib/api';
import { day, peso } from '../lib/format';
import { useSession } from '../lib/session';
import { useCurrentStay } from '../lib/stays';
import { Button, Card, LinkRow, Notice, Row, Screen } from '../ui/kit';
import { S, T } from '../ui/theme';

export function ProfileScreen() {
  const session = useSession();
  const me = useQuery({ queryKey: ['me'], queryFn: api.me });
  const { items, row, select } = useCurrentStay();
  const [signingOut, setSigningOut] = useState(false);

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You will need a new emailed code to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await session.signOut();
        },
      },
    ]);

  return (
    <Screen refreshing={me.isRefetching} onRefresh={() => void me.refetch()}>
      <View style={{ alignItems: 'center', gap: S.sm }}>
        <Image
          source={require('../../assets/MedCore_Badge_Logo.png')}
          style={{ width: 56, height: 52 }}
          accessibilityIgnoresInvertColors
        />
      </View>
      <Card title="Your account">
        {me.isError ? <Notice>{errorMessage(me.error)}</Notice> : null}
        <Row label="Email" value={me.data?.email ?? '…'} />
        <Row label="Hospital" value={me.data?.facility?.name ?? '…'} last />
        <Text style={[T.small, { marginTop: S.sm }]}>
          To change your email, visit the billing desk with a valid ID.
        </Text>
      </Card>

      {items.length > 0 ? (
        <Card title="Stays linked to you" flush>
          {items.map((s, i) => (
            <LinkRow
              key={s.id}
              title={`${s.patientName}${s.id === row?.id ? ' ✓' : ''}`}
              subtitle={`Admitted ${day(s.admittedAt)} · ${s.encounterNumber}`}
              value={s.billReady ? peso(s.balanceCents) : undefined}
              onPress={() => select(s.id)}
              last={i === items.length - 1}
            />
          ))}
        </Card>
      ) : null}

      <Card title="Privacy">
        <Text style={T.meta}>
          Your sign-in is kept in this phone’s secure keychain and never leaves it except to talk to the
          hospital. MedCore never asks for a full card number, CVV or password.
        </Text>
      </Card>

      <Button title="Sign out" variant="danger" busy={signingOut} onPress={confirmSignOut} />
      {__DEV__ ? <Text style={[T.small, { textAlign: 'center' }]}>API {API_BASE_URL}</Text> : null}
    </Screen>
  );
}
