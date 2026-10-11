import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { C } from './theme';

interface ModalOverlayProps {
  visible: boolean;
  onRequestClose: () => void;
  onBackdropPress?: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  panelStyle?: StyleProp<ViewStyle>;
  motion?: 'slide' | 'fade';
  avoidKeyboard?: boolean;
  panelTestID?: string;
}

export function ModalOverlay({ visible, onRequestClose, onBackdropPress, children, contentStyle, panelStyle,
  motion = 'slide', avoidKeyboard = false, panelTestID = 'modal-panel' }: ModalOverlayProps) {
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const [present, setPresent] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelProgress = useRef(new Animated.Value(0)).current;
  const lastChildren = useRef(children);
  if (visible) lastChildren.current = children;

  useEffect(() => {
    if (visible) setPresent(true);
    if (reduced) {
      backdropOpacity.setValue(visible ? 1 : 0);
      panelProgress.setValue(visible ? 1 : 0);
      if (!visible) setPresent(false);
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: visible ? 1 : 0, duration: visible ? 180 : 160, useNativeDriver: true }),
      Animated.timing(panelProgress, { toValue: visible ? 1 : 0, duration: visible ? 280 : 200,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic), useNativeDriver: true })
    ]);
    animation.start(({ finished }) => { if (finished && !visible) setPresent(false); });
    return () => { animation.stop(); };
  }, [visible, reduced, backdropOpacity, panelProgress]);

  return (
    <Modal visible={visible || present} transparent animationType="none" presentationStyle="overFullScreen"
      statusBarTranslucent navigationBarTranslucent onRequestClose={onRequestClose}>
      <View style={styles.viewport}>
        <Animated.View testID="modal-backdrop" style={[StyleSheet.absoluteFill, { backgroundColor: C.scrim, opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={visible ? onBackdropPress : undefined}
            disabled={!onBackdropPress || !visible} accessibilityRole="button" accessibilityLabel="Close dialog" accessible={!!onBackdropPress} />
        </Animated.View>
        <KeyboardAvoidingView pointerEvents={visible ? 'box-none' : 'none'} enabled={avoidKeyboard}
          behavior={avoidKeyboard && Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.content, contentStyle]}>
          <Animated.View testID={panelTestID} accessibilityViewIsModal style={[panelStyle, motion === 'slide'
            ? { transform: [{ translateY: panelProgress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }
            : { opacity: panelProgress }]}>
            {visible ? children : lastChildren.current}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  viewport: { flex: 1 },
  content: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' }
});
