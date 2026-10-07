import { useId } from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { C } from './theme';

// Existing SVG dependency; this is a background layer, never a QR overlay.
export default function GradientSurface({ children, style, start = C.brand, end = C.blueDark }: {
  children?: React.ReactNode; style?: StyleProp<ViewStyle>; start?: string; end?: string;
}) {
  const id = useId().replace(/:/g, '');
  return <View style={[{ backgroundColor: start, overflow: 'hidden' }, style]}>
    <Svg pointerEvents="none" accessible={false} width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100"><Defs><LinearGradient id={id} x1="0" y1="1" x2="1" y2="0"><Stop offset="0" stopColor={start} /><Stop offset="1" stopColor={end} /></LinearGradient></Defs><Rect width="100" height="100" fill={`url(#${id})`} /></Svg>
    {children}
  </View>;
}
