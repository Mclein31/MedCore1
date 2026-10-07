import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ASSETS } from '../lib/assets';
import { C, T } from './ui';
import { useReducedMotion } from '../hooks/useReducedMotion';
export default function LaunchScreen() {
  const reduced = useReducedMotion();
  const breath = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) { breath.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
      Animated.timing(breath, { toValue: 1, duration: 1000, useNativeDriver: true })
    ]), { iterations: 2 });
    animation.start();
    return () => { animation.stop(); breath.setValue(1); };
  }, [breath, reduced]);
  return <View style={{ flex: 1, backgroundColor: C.hero, alignItems: 'center', justifyContent: 'center', padding: 28, overflow: 'hidden' }}>
    <StatusBar style="light" />
    <View accessible={false} style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.06)', left: -140, top: -100 }} />
    <View accessible={false} style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.06)', right: -120, bottom: -70 }} />
    <Animated.View style={{ alignItems: 'center', gap: 18, transform: [{ scale: breath }] }}>
      <Image source={ASSETS.brand.badge} resizeMode="contain" accessibilityLabel="MedCore" style={{ width: 128, height: 128 }} />
      <Image source={ASSETS.brand.wordmark} resizeMode="contain" accessible={false} style={{ width: 168, height: 66 }} />
    </Animated.View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Restoring your account" style={{ position: 'absolute', bottom: 72, alignItems: 'center', gap: 10 }}><ActivityIndicator color={C.surface} /><Text style={[T.meta, { color: C.surface }]}>Getting things ready…</Text></View>
  </View>;
}
