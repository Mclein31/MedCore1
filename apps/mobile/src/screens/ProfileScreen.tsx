import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { API_BASE_URL } from '../config';
import { api, errorMessage } from '../lib/api';
import { day, peso } from '../lib/format';
import { useSession } from '../lib/session';
import { useCurrentStay } from '../lib/stays';
import type { RootParams, TabParams } from '../navigation';
import { Bell, Building2, FileText, Lock, ShieldCheck, User } from '../ui/icons';
import { Button, Card, GroupLabel, LinkRow, Notice, Screen } from '../ui/kit';
import { C, R, S, T } from '../ui/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParams, 'Profile'>,
  NativeStackScreenProps<RootParams>
>;

const DISCOUNT = { NONE: 'None', SENIOR: 'Senior citizen', PWD: 'PWD' } as const;

export function ProfileScreen({ navigation }: Props) {
  const session = useSession();
  const me = useQuery({ queryKey: ['me'], queryFn: api.me });
  const { items, row, detail, select } = useCurrentStay();
  const [signingOut, setSigningOut] = useState(false);
  const name = row?.patientName ?? me.data?.email ?? '';
  const initials = name
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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

  const l = detail.data?.ledger;
  return (
    <Screen refreshing={me.isRefetching} onRefresh={() => void me.refetch()} gutter={12} gap={S.lg}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: C.infoBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '600', color: C.info }}>{initials || '–'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={T.cardTitle} numberOfLines={2}>
              {name || '…'}
            </Text>
            <Text style={T.meta} numberOfLines={1}>
              {me.data?.email ?? ''}
            </Text>
          </View>
        </View>
      </Card>
      {me.isError ? <Notice>{errorMessage(me.error)}</Notice> : null}

      <GroupLabel>Account</GroupLabel>
      <Card flush>
        <LinkRow icon={Building2} title="Hospital" value={me.data?.facility?.name ?? '…'} />
        <LinkRow
          icon={User}
          title="Discount on file"
          value={detail.data ? DISCOUNT[detail.data.stay.discountKind] : '…'}
          last
        />
      </Card>

      {l ? (
        <>
          <GroupLabel>Coverage</GroupLabel>
          <Card flush>
            <LinkRow icon={ShieldCheck} title="PhilHealth" value={peso(l.philhealthCents)} />
            <LinkRow icon={FileText} title="HMO" value={peso(l.hmoCents)} />
            <LinkRow
              icon={ShieldCheck}
              title="Review coverage"
              onPress={() => navigation.navigate('Coverage')}
              last
            />
          </Card>
        </>
      ) : null}

      <GroupLabel>Records</GroupLabel>
      <Card flush>
        <LinkRow
          icon={FileText}
          title="Documents & receipts"
          onPress={() => navigation.navigate('Documents')}
        />
        <LinkRow
          icon={Bell}
          title="Hospital updates"
          onPress={() => navigation.navigate('Updates')}
          last={items.length < 2}
        />
        {items.length > 1
          ? items.map((s, i) => (
              <LinkRow
                key={s.id}
                title={`${s.encounterNumber}${s.id === row?.id ? ' ✓' : ''}`}
                subtitle={`${s.patientName} · admitted ${day(s.admittedAt)}`}
                value={s.billReady ? peso(s.balanceCents) : undefined}
                onPress={() => select(s.id)}
                last={i === items.length - 1}
              />
            ))
          : null}
      </Card>

      <GroupLabel>Privacy</GroupLabel>
      <Card flush>
        <LinkRow
          icon={Lock}
          title="Your sign-in stays on this phone"
          subtitle="Kept in the secure keychain. MedCore never asks for a full card number, CVV or password."
          last
        />
      </Card>
      <Text style={[T.small, { marginLeft: 2 }]}>
        To change your email, visit the billing desk with a valid ID.
      </Text>

      <View style={{ borderRadius: R.pill }}>
        <Button title="Sign out" variant="danger" busy={signingOut} onPress={confirmSignOut} />
      </View>
      {__DEV__ ? <Text style={[T.small, { textAlign: 'center' }]}>API {API_BASE_URL}</Text> : null}
    </Screen>
  );
}
