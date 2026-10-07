import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Text, View } from 'react-native';
import Brand from './Brand';
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
  return <View style={{ flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 24 }}>
    <Animated.View style={{ transform: [{ scale: breath }] }}><Brand size={112} stacked /></Animated.View>
    <Text style={[T.body, { color: C.secondary, textAlign: 'center' }]}>Clarity for your hospital journey</Text>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Restoring your account" style={{ alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={C.brand} />
      <Text style={T.meta}>Getting things ready…</Text>
    </View>
  </View>;
}
