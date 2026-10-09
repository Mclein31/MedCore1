import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import LaunchScreen from './LaunchScreen';

// Present on each cold launch and background -> active transition. Inactive
// events from system dialogs do not replay it. This overlay preserves forms
// and navigator state; it never grants or changes authenticated access.
export default function LaunchGate({ loading, children }: { loading: boolean; children: ReactNode }) {
  const [presenting, setPresenting] = useState(true);
  const [opening, setOpening] = useState(0);
  const hasOpened = useRef(false);
  useEffect(() => {
    let previous = AppState.currentState;
    let timer: ReturnType<typeof setTimeout>;
    const present = () => {
      clearTimeout(timer);
      setPresenting(true);
      timer = setTimeout(() => setPresenting(false), 1200);
    };
    present();
    const subscription = AppState.addEventListener('change', next => {
      if (previous === 'background' && next === 'active') {
        setOpening(value => value + 1);
        present();
      }
      previous = next;
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  const visible = loading || presenting;
  if (!visible) hasOpened.current = true;
  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1, pointerEvents: visible ? 'none' : 'auto' }} accessibilityElementsHidden={visible} aria-hidden={visible} importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}>
      {hasOpened.current ? children : null}
    </View>
    {visible && <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}><LaunchScreen key={opening} /></View>}
  </View>;
}
