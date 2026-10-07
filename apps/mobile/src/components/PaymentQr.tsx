import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { QR_PATTERNS, qrPath, type QrRail } from '../lib/qrPatterns';

// Vector modules keep their original proportions and quiet zone at every size.
// Integer layout sizes avoid fractional module edges; no logo overlays.
export default function PaymentQr({ rail = 'QR_PH' }: { rail?: QrRail }) {
  const [available, setAvailable] = useState(225);
  const rows = QR_PATTERNS[rail].rows;
  const size = Math.max(45, Math.floor(Math.min(270, available) / rows.length) * rows.length);
  return <View onLayout={event => setAvailable(event.nativeEvent.layout.width)} style={{ width: '100%', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <Svg width={size} height={size} viewBox={`0 0 ${rows.length} ${rows.length}`} accessibilityRole="image" accessibilityLabel={`${rail === 'QR_PH' ? 'QR Ph' : rail} payment QR code`}>
      <Rect width={rows.length} height={rows.length} fill="#FFFFFF" />
      <Path d={qrPath(rows)} fill="#000000" />
    </Svg>
  </View>;
}
