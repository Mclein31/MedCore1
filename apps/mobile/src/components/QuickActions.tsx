import { Pressable, Text, View } from 'react-native';
import { Icon } from './icons';
import { C } from './theme';

export interface QuickAction { label: string; icon: string; onPress: () => void; disabled?: boolean }
export default function QuickActions({ actions, integrated = false }: { actions: QuickAction[]; integrated?: boolean }) {
  return <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-between' }}>
    {actions.map(action => <Pressable key={action.label} onPress={action.onPress} disabled={action.disabled} accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={{ disabled: !!action.disabled }} style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 76, alignItems: 'center', justifyContent: 'center', opacity: action.disabled || pressed ? 0.5 : 1, gap: 8 })}>
      <View accessible={false} style={{ width: integrated ? 42 : 52, height: integrated ? 42 : 52, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: integrated ? 'rgba(255,255,255,0.1)' : C.surface }}><Icon name={action.icon} size={integrated ? 21 : 22} color={integrated ? C.surface : C.brand} /></View>
      <Text style={{ fontSize: integrated ? 11 : 12, lineHeight: 17, color: integrated ? C.surface : C.ink, textAlign: 'center' }}>{action.label}</Text>
    </Pressable>)}
  </View>;
}
