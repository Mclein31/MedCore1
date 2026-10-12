import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { CORA_TYPING_LABELS, type CoraLanguage } from '../../../shared/coraLanguage';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { C } from './theme';

export default function CoraTypingDots({ language }: { language: CoraLanguage }) {
  const reduced = useReducedMotion();
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  useEffect(() => {
    dots.forEach(dot => dot.setValue(0));
    if (reduced) return;
    const animation = Animated.loop(Animated.stagger(150, dots.map(dot => Animated.sequence([
      Animated.timing(dot, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true })
    ]))));
    animation.start();
    return () => { animation.stop(); };
  }, [reduced, dots]);
  return <View testID="cora-typing" accessible accessibilityRole="progressbar" accessibilityLabel={CORA_TYPING_LABELS[language]}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 20, paddingHorizontal: 2 }}>
    {dots.map((dot, index) => <Animated.View key={index} accessible={false} testID={`cora-typing-dot-${index}`}
      style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.brand,
        opacity: reduced ? 0.7 : dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
        transform: [{ scale: reduced ? 1 : dot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }} />)}
  </View>;
}
