import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { C } from './theme';

type Kind = 'bill' | 'coverage' | 'documents';

// Original SVG artwork: a distinct story for each introduction page.
// Native-driven view transforms animate SVG layers without JS frame updates.
export default function FinancialIllustration({ kind = 'bill' }: { kind?: Kind }) {
  const reduced = useReducedMotion();
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    motion.setValue(0);
    if (reduced) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(motion, { toValue: 0, duration: 720, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' })
    ]), { iterations: 3 });
    animation.start();
    return () => { animation.stop(); motion.setValue(0); };
  }, [kind, motion, reduced]);
  const illustrationFont = Platform.OS === 'ios' ? 'System' : Platform.OS === 'web' ? 'system-ui' : 'sans-serif';
  const decorative = Platform.OS === 'web' ? { 'aria-hidden': true as const } : { accessible: false };
  return <View {...decorative} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={`onboarding-art-${kind}`} style={{ width: '100%', maxWidth: 400, aspectRatio: 1, alignSelf: 'center' }}>
    <Svg {...decorative} width="100%" height="100%" viewBox="0 0 360 360">
      <Circle cx="180" cy="182" r="143" fill={C.brandSoft} />
      <Circle cx="180" cy="182" r="123" fill="none" stroke={C.surface} strokeWidth="2" />
      <Path d="M10 233L350 111V167L10 289Z" fill={C.brand} opacity="0.12" />
      <Circle cx="40" cy="104" r="8" fill={C.blueSoft} />
      <Circle cx="323" cy="259" r="6" fill={C.blueSoft} />
      <Path d="M301 65v16m-8-8h16M48 286v12m-6-6h12" stroke={C.brand} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </Svg>
    <Animated.View testID={`onboarding-art-body-${kind}`} style={{ position: 'absolute', inset: 0, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }}>
      <Svg {...decorative} width="100%" height="100%" viewBox="0 0 360 360">
        {kind === 'bill' && <G>
          <Rect x="77" y="45" width="220" height="271" rx="16" fill={C.brand} opacity="0.08" />
          <Path d="M75 37h164l47 47v211q0 15-15 15H75q-15 0-15-15V52q0-15 15-15Z" fill={C.surface} stroke={C.border} strokeWidth="2" />
          <Path d="M239 37v32q0 15 15 15h32" fill={C.elevated} stroke={C.border} strokeWidth="2" strokeLinejoin="round" />
          <Rect x="85" y="64" width="32" height="32" rx="9" fill={C.brandSoft} />
          <Path d="M101 71v18m-9-9h18" stroke={C.brand} strokeWidth="4" strokeLinecap="round" />
          <SvgText fontFamily={illustrationFont} x="130" y="81" fontSize="13" fontWeight="700" fill={C.ink}>HOSPITAL BILL</SvgText>
          <Rect x="130" y="90" width="69" height="5" rx="2.5" fill={C.border} />
          <Line x1="85" y1="115" x2="259" y2="115" stroke={C.border} />
          {[140, 166, 192].map((y, i) => <G key={y}>
            <Rect x="86" y={y} width={88 - i * 13} height="7" rx="3.5" fill={C.border} />
            <Rect x="217" y={y} width="41" height="7" rx="3.5" fill={C.faint} opacity="0.6" />
          </G>)}
          <Rect x="85" y="218" width="174" height="28" rx="7" fill={C.brandSoft} />
          <Path d="M94 232h9" stroke={C.brand} strokeWidth="2" strokeLinecap="round" />
          <Rect x="113" y="229" width="64" height="6" rx="3" fill={C.brand} opacity="0.35" />
          <Rect x="216" y="229" width="34" height="6" rx="3" fill={C.brand} />
          <Line x1="86" y1="259" x2="258" y2="259" stroke={C.border} strokeDasharray="3 4" />
          <SvgText fontFamily={illustrationFont} x="86" y="283" fontSize="12" fontWeight="600" fill={C.secondary}>AMOUNT DUE</SvgText>
        </G>}
        {kind === 'coverage' && <G>
          <G transform="translate(177 130) rotate(-7) translate(-177 -130)">
            <Rect x="58" y="61" width="232" height="129" rx="18" fill={C.brandDark} />
            <Circle cx="267" cy="79" r="45" fill={C.surface} opacity="0.06" />
            <SvgText fontFamily={illustrationFont} x="81" y="96" fill={C.surface} fontSize="17" fontWeight="700">PhilHealth</SvgText>
            <Rect x="82" y="112" width="95" height="6" rx="3" fill={C.surface} opacity="0.55" />
            <Path d="M85 144l6 6 11-12" fill="none" stroke={C.surface} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <Rect x="112" y="142" width="112" height="7" rx="3.5" fill={C.surface} opacity="0.8" />
          </G>
          <Rect x="87" y="160" width="224" height="136" rx="18" fill={C.brand} opacity="0.08" />
          <Rect x="77" y="151" width="224" height="136" rx="18" fill={C.surface} stroke={C.border} strokeWidth="2" />
          <Rect x="94" y="169" width="39" height="39" rx="11" fill={C.blueSoft} />
          <Path d="M114 177l12 5v9q0 8-12 13-12-5-12-13v-9Z" fill="none" stroke={C.blueDark} strokeWidth="2.5" strokeLinejoin="round" />
          <SvgText fontFamily={illustrationFont} x="145" y="187" fontSize="17" fontWeight="700" fill={C.ink}>HMO coverage</SvgText>
          <Rect x="145" y="198" width="86" height="6" rx="3" fill={C.border} />
          <Rect x="96" y="227" width="110" height="7" rx="3.5" fill={C.border} />
          <Rect x="96" y="248" width="77" height="7" rx="3.5" fill={C.border} />
          <Circle cx="52" cy="302" r="10" fill={C.brand} /><Path d="M48 302l3 3 5-6" stroke={C.surface} strokeWidth="2" fill="none" />
          <Line x1="67" y1="302" x2="120" y2="302" stroke={C.brand} strokeWidth="3" strokeLinecap="round" />
          <Circle cx="132" cy="302" r="9" fill={C.brandSoft} stroke={C.brand} strokeWidth="2" />
          <Line x1="148" y1="302" x2="201" y2="302" stroke={C.border} strokeWidth="3" strokeLinecap="round" />
          <Circle cx="213" cy="302" r="9" fill={C.surface} stroke={C.border} strokeWidth="2" />
        </G>}
        {kind === 'documents' && <G>
          <Path d="M112 47h170v238l-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8V47Z" fill={C.brand} opacity="0.08" transform="translate(9 10)" />
          <Path d="M112 47h170v238l-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8V47Z" fill={C.surface} stroke={C.border} strokeWidth="2" strokeLinejoin="round" />
          <SvgText fontFamily={illustrationFont} x="135" y="79" fontSize="14" fontWeight="700" fill={C.ink}>PAYMENT RECEIPT</SvgText>
          <Rect x="135" y="92" width="84" height="6" rx="3" fill={C.border} />
          <Line x1="135" y1="112" x2="257" y2="112" stroke={C.border} strokeDasharray="3 4" />
          {[132, 152, 172].map(y => <G key={y}><Rect x="135" y={y} width="65" height="6" rx="3" fill={C.border} /><Rect x="230" y={y} width="26" height="6" rx="3" fill={C.faint} opacity="0.6" /></G>)}
          <G transform="translate(155 256) rotate(-8) translate(-155 -256)">
            <Rect x="43" y="199" width="211" height="126" rx="17" fill={C.blueDark} />
            <Path d="M43 228h211v21H43Z" fill={C.hero} opacity="0.48" />
            <Rect x="65" y="265" width="30" height="23" rx="5" fill={C.blueSoft} />
            <Path d="M80 265v23m-15-12h30" stroke={C.blueDark} strokeWidth="1" />
            <Rect x="65" y="301" width="69" height="5" rx="2.5" fill={C.surface} opacity="0.65" />
            <Circle cx="208" cy="291" r="12" fill={C.surface} opacity="0.35" /><Circle cx="224" cy="291" r="12" fill={C.surface} opacity="0.7" />
          </G>
        </G>}
      </Svg>
    </Animated.View>
    <Animated.View testID={`onboarding-art-accent-${kind}`} style={{ position: 'absolute', inset: 0, transform: [{ translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [0, kind === 'bill' ? -6 : 3] }) }, { translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }}>
      <Svg {...decorative} width="100%" height="100%" viewBox="0 0 360 360">
        {kind === 'bill' ? <G>
          <Circle cx="267" cy="269" r="42" fill={C.brandDark} stroke={C.surface} strokeWidth="7" />
          <Circle cx="261" cy="263" r="17" fill={C.surface} fillOpacity="0.12" stroke={C.surface} strokeWidth="4" />
          <Path d="M274 276l15 15" stroke={C.surface} strokeWidth="6" strokeLinecap="round" />
          <Line x1="252" y1="259" x2="269" y2="259" stroke={C.surface} strokeWidth="2" strokeLinecap="round" />
          <Line x1="252" y1="266" x2="264" y2="266" stroke={C.surface} strokeWidth="2" strokeLinecap="round" />
        </G> : kind === 'coverage' ? <G>
          <Path d="M271 224l40 16v30q0 33-40 53-40-20-40-53v-30Z" fill={C.brand} stroke={C.surface} strokeWidth="6" strokeLinejoin="round" />
          <Path d="M253 269l12 12 23-26" fill="none" stroke={C.surface} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </G> : <G>
          <Circle cx="286" cy="204" r="36" fill={C.brand} stroke={C.surface} strokeWidth="6" />
          <Path d="M271 204l10 10 20-23" fill="none" stroke={C.surface} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </G>}
      </Svg>
    </Animated.View>
  </View>;
}
