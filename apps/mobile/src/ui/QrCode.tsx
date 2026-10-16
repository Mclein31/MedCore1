import QRCode from 'qrcode';
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

/** Drawn on the device from the pass number; nothing is sent to a QR service. */
export function QrCode({ value, size = 180, label }: { value: string; size?: number; label: string }) {
  const { path, count } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.modules.get(y, x)) d += `M${x + 1} ${y + 1}h1v1h-1z`;
      }
    }
    return { path: d, count: n + 2 };
  }, [value]);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 12 }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`}>
        <Rect width={count} height={count} fill="#FFFFFF" />
        <Path d={path} fill="#0F172A" />
      </Svg>
    </View>
  );
}
