import { Image, View } from 'react-native';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { ASSETS } from '../lib/assets';
import { C } from './theme';

// Original financial artwork: the reference's tall arch, diagonal band and
// floating visual mass, using MedCore's own mark instead of clinical photos.
export default function FinancialIllustration({ kind = 'bill' }: { kind?: 'bill' | 'coverage' | 'documents' }) {
  return <View accessible={false} style={{ width: '100%', maxWidth: 400, aspectRatio: 390 / 414, alignSelf: 'center' }}>
    <Svg width="100%" height="100%" viewBox="0 0 360 360" preserveAspectRatio="none">
      <Circle cx="181" cy="174" r="128" fill={C.brandSoft} />
      <Path d="M0 163L360 35V139L0 267Z" fill={C.brand} opacity="0.9" />
      <Path d="M58 135a130 130 0 0 1 260 0v203q0 18-18 18H76q-18 0-18-18z" fill={C.brandSoft} />
      <Path d="M50 132a130 130 0 0 1 260 0v198q0 18-18 18H68q-18 0-18-18z" fill={C.surface} stroke={C.border} strokeWidth="2" />
      <Rect x="104" y="228" width="138" height="8" rx="4" fill={C.elevated} />
      <Rect x="104" y="250" width="102" height="8" rx="4" fill={C.elevated} />
      <Line x1="104" y1="278" x2="242" y2="278" stroke={C.border} strokeDasharray="4 5" />
      <Rect x="104" y="300" width="68" height="9" rx="4" fill={C.brandSoft} />
      <Rect x="196" y="300" width="46" height="9" rx="4" fill={C.blueSoft} />
      <Circle cx="272" cy="305" r="34" fill={kind === 'documents' ? C.blueDark : C.brand} stroke={C.surface} strokeWidth="7" />
      {kind === 'documents' ? <Path transform="translate(0 39)" d="M263 250h12l7 7v25h-20v-32m13 0v8h7m-16 8h12m-12 7h12" fill="none" stroke={C.surface} strokeWidth="3" strokeLinejoin="round" /> : <Path transform="translate(0 39)" d="M259 265l9 9 18-20" fill="none" stroke={C.surface} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
      <Circle cx="62" cy="87" r="7" fill={C.blueSoft} />
      <Circle cx="317" cy="194" r="5" fill={C.brandSoft} />
    </Svg>
    <Image source={ASSETS.brand.badge} resizeMode="contain" style={{ position: 'absolute', top: '20%', left: '34.5%', width: '31%', height: '31%' }} />
  </View>;
}
