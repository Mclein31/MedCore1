import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Pressable, StyleSheet } from 'react-native';
import { ASSETS } from '../lib/assets';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function CoraFloatingMascot({ onPress, active = true }: { onPress: () => void; active?: boolean }) {
  const reduced = useReducedMotion();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [blinkReady, setBlinkReady] = useState(false);
  const blink = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    blink.setValue(0);
    tilt.setValue(0);
    if (reduced || !active || !foreground || !blinkReady) return;
    const timing = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
        isInteraction: false,
      });
    const blinking = Animated.loop(
      Animated.sequence([
        Animated.delay(2800),
        timing(blink, 1, 45),
        Animated.delay(70),
        timing(blink, 0, 70),
        Animated.delay(4200),
        timing(blink, 1, 45),
        Animated.delay(70),
        timing(blink, 0, 70),
      ]),
    );
    const tilting = Animated.loop(
      Animated.sequence([
        Animated.delay(5100),
        timing(tilt, -1, 420),
        Animated.delay(500),
        timing(tilt, 0, 500),
        Animated.delay(6500),
        timing(tilt, 0.8, 420),
        Animated.delay(500),
        timing(tilt, 0, 500),
      ]),
    );
    blinking.start();
    tilting.start();
    return () => {
      blinking.stop();
      tilting.stop();
    };
  }, [active, foreground, reduced, blinkReady, blink, tilt]);

  return (
    <Pressable
      testID="cora-mascot-button"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ask Cora AI"
      accessibilityHint="Open your billing concierge"
      style={({ pressed }) => [
        styles.button,
        pressed && { opacity: 0.8 },
        pressed && !reduced && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <Animated.View
        testID="cora-mascot-motion"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.artwork,
          {
            transform: [
              {
                rotate: reduced
                  ? '0deg'
                  : tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] }),
              },
            ],
          },
        ]}
      >
        <Animated.Image
          testID="cora-mascot-open"
          source={ASSETS.brand.cora}
          resizeMode="contain"
          accessible={false}
          style={[
            styles.frame,
            { opacity: reduced ? 1 : blink.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
          ]}
        />
        <Animated.Image
          testID="cora-mascot-blink"
          source={ASSETS.brand.coraBlink}
          resizeMode="contain"
          accessible={false}
          onLoad={() => setBlinkReady(true)}
          style={[styles.frame, { opacity: reduced ? 0 : blink }]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  artwork: { width: 64, height: 64 },
  frame: { position: 'absolute', left: 0, top: 0, width: 64, height: 64 },
});
