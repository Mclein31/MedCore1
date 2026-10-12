import { Pressable, Text, View } from 'react-native';
import { Icon } from './icons';
import { C, NavigationLayout } from './theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

export interface QuickAction { label: string; icon: string; onPress: () => void; disabled?: boolean }
export default function QuickActions({ actions, integrated = false }: { actions: QuickAction[]; integrated?: boolean }) {
  const reduced = useReducedMotion();
  return <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-between' }}>
    {actions.map(action => <Pressable key={action.label} onPress={action.onPress} disabled={action.disabled} accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={{ disabled: !!action.disabled }} style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: NavigationLayout.shortcutHeight, alignItems: 'center', justifyContent: 'center', opacity: action.disabled ? 0.5 : pressed ? 0.65 : 1, gap: 8, transform: [{ scale: pressed && !reduced ? 0.96 : 1 }] })}>
      <View accessible={false} style={{ width: NavigationLayout.shortcutSize, height: NavigationLayout.shortcutSize, borderRadius: NavigationLayout.shortcutSize / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: integrated ? 'rgba(255,255,255,0.12)' : C.surface }}><Icon name={action.icon} size={NavigationLayout.iconSize} color={integrated ? C.surface : C.secondary} /></View>
      <Text style={{ fontSize: NavigationLayout.labelSize, lineHeight: 18, fontWeight: '500', color: integrated ? C.surface : C.ink, textAlign: 'center' }}>{action.label}</Text>
    </Pressable>)}
  </View>;
}
