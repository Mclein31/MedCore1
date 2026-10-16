import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSETS } from '../lib/assets';
import { C, T } from './ui';
import { useReducedMotion } from '../hooks/useReducedMotion';

export default function LaunchScreen() {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const rotation = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    rotation.setValue(0);
    breath.setValue(0);
    if (reduced) return;
    const native = Platform.OS !== 'web';
    const orbit = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: native,
      }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: native,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: native,
        }),
      ]),
    );
    orbit.start();
    pulse.start();
    return () => {
      orbit.stop();
      pulse.stop();
      rotation.setValue(0);
      breath.setValue(0);
    };
  }, [rotation, breath, reduced]);
  const decorative = Platform.OS === 'web' ? { 'aria-hidden': true as const } : { accessible: false };
  const size = Math.min(252, width - 64);
  return (
    <View
      testID="launch-screen"
      style={{
        flex: 1,
        backgroundColor: C.hero,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
      }}
    >
      <StatusBar style="light" />
      <View {...decorative} style={{ position: 'absolute', inset: 0 }}>
        <Svg
          {...decorative}
          width="100%"
          height="100%"
          viewBox="0 0 390 844"
          preserveAspectRatio="xMidYMid slice"
        >
          <Circle cx="15" cy="112" r="150" fill={C.heroLight} />
          <Circle cx="370" cy="770" r="172" fill={C.heroLight} />
          <Path d="M-45 636L425 430" stroke={C.surface} strokeOpacity="0.04" strokeWidth="82" />
          <Path
            d="M41 243h44v-35h38M268 616h40v-36h39"
            fill="none"
            stroke={C.surface}
            strokeOpacity="0.12"
            strokeWidth="1.5"
          />
          <Circle cx="123" cy="208" r="4" fill={C.brand} />
          <Circle cx="347" cy="580" r="4" fill={C.blue} />
        </Svg>
      </View>
      <View style={{ alignItems: 'center', gap: 24 }}>
        <View
          {...decorative}
          style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg
            {...decorative}
            width="100%"
            height="100%"
            viewBox="0 0 252 252"
            style={{ position: 'absolute' }}
          >
            <Circle cx="126" cy="126" r="105" fill="none" stroke={C.surface} strokeOpacity="0.1" />
            <Circle cx="126" cy="126" r="88" fill={C.surface} fillOpacity="0.04" />
            <Circle cx="126" cy="126" r="74" fill={C.surface} fillOpacity="0.04" />
          </Svg>
          <Animated.View
            testID="launch-orbit"
            style={{
              position: 'absolute',
              inset: 0,
              transform: [
                { rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
              ],
            }}
          >
            <Svg {...decorative} width="100%" height="100%" viewBox="0 0 252 252">
              <Circle
                cx="126"
                cy="126"
                r="105"
                fill="none"
                stroke={C.brand}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="155 505"
              />
              <Circle cx="126" cy="21" r="5" fill={C.brandSoft} />
              <Circle cx="126" cy="231" r="4" fill={C.blueSoft} />
            </Svg>
          </Animated.View>
          <Animated.View
            style={{
              width: size * 0.52,
              height: size * 0.52,
              borderRadius: size,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }],
            }}
          >
            <Image
              source={ASSETS.brand.badge}
              resizeMode="contain"
              {...decorative}
              style={{ width: '76%', height: '76%' }}
            />
          </Animated.View>
        </View>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Text
            accessibilityRole="header"
            style={{ color: C.surface, fontSize: 34, fontWeight: '700', letterSpacing: -0.8 }}
          >
            MedCore
          </Text>
          <Text style={[T.body, { color: C.heroSub, textAlign: 'center' }]}>
            Your hospital care, clearly connected.
          </Text>
        </View>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="MedCore is getting ready"
        style={{
          position: 'absolute',
          bottom: Math.max(32, insets.bottom + 24),
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Animated.View
          testID="launch-progress"
          {...decorative}
          style={{ opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }}
        >
          <Svg {...decorative} width="76" height="16" viewBox="0 0 76 16">
            <Line x1="8" y1="8" x2="68" y2="8" stroke={C.surface} strokeOpacity="0.18" strokeWidth="2" />
            <Circle cx="8" cy="8" r="4" fill={C.brandSoft} />
            <Circle cx="38" cy="8" r="4" fill={C.brand} />
            <Circle cx="68" cy="8" r="4" fill={C.blueSoft} />
          </Svg>
        </Animated.View>
        <Text style={[T.meta, { color: C.heroSub }]}>Getting things ready…</Text>
      </View>
    </View>
  );
}
