import { Text, View } from 'react-native';
import { when } from '../lib/format';
import { Empty, Screen } from '../ui/kit';
import { C, S, T } from '../ui/theme';
import { WithStay } from './common';

/** v1 "Hospital updates": every timeline event on the current stay, newest first. */
export function UpdatesScreen() {
  return (
    <WithStay requireBill={false}>
      {({ d, refreshing, refresh }) => (
        <Screen refreshing={refreshing} onRefresh={refresh} background={C.surface} gap={0}>
          {(d.timeline?.length ?? 0) === 0 ? (
            <Empty
              title="No updates yet"
              detail="Bill, payment and discharge updates from the hospital appear here."
            />
          ) : (
            d.timeline!.map((t, i) => (
              <View
                key={`${t.createdAt}-${i}`}
                style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 4 }}
              >
                <Text style={T.cardTitle}>{t.title}</Text>
                {t.detail ? <Text style={T.meta}>{t.detail}</Text> : null}
                <Text style={[T.small, { marginTop: S.xs }]}>{when(t.createdAt)}</Text>
              </View>
            ))
          )}
        </Screen>
      )}
    </WithStay>
  );
}
