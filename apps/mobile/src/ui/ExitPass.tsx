import { CheckCircle2 } from './icons';
import { Text, View } from 'react-native';
import { when } from '../lib/format';
import type { GatePass } from '../lib/types';
import { QrCode } from './QrCode';
import { C, R, S, T } from './theme';

export function ExitPass({ pass }: { pass: GatePass }) {
  return (
    <View
      style={{
        backgroundColor: C.successBg,
        borderColor: C.successBorder,
        borderWidth: 2,
        borderRadius: R.hero,
        padding: S.xl,
        gap: S.lg,
        alignItems: 'center',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <CheckCircle2 color={C.success} size={22} />
        <Text accessibilityRole="header" style={[T.section, { color: C.success }]}>
          You are cleared to go home
        </Text>
      </View>
      <QrCode value={pass.passNumber} size={200} label={`Exit pass QR code ${pass.passNumber}`} />
      <Text style={[T.meta, { textAlign: 'center' }]}>
        Show this at the lobby, then tell the guard your PIN.
      </Text>
      <Text selectable style={{ fontFamily: 'Menlo', fontSize: 18, fontWeight: '600', color: C.ink }}>
        {pass.passNumber}
      </Text>
      <View style={{ alignItems: 'center' }}>
        <Text style={T.small}>PIN</Text>
        <Text
          accessibilityLabel={`PIN ${pass.pin.split('').join(' ')}`}
          style={{ fontFamily: 'Menlo', fontSize: 34, fontWeight: '700', letterSpacing: 8, color: C.ink }}
        >
          {pass.pin}
        </Text>
      </View>
      <Text style={[T.small, { textAlign: 'center' }]}>
        Valid until {when(pass.expiresAt)}. Do not share the PIN with anyone else.
      </Text>
    </View>
  );
}
