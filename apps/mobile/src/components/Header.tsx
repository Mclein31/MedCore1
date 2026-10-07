import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePatient } from '../hooks/usePatient';
import { useUnreadCount } from '../hooks/useUnread';
import Brand from './Brand';
import { Icon } from './icons';
import { C } from './theme';

export function HeaderBack({ onPress, disabled, dark = false }: { onPress: () => void; disabled?: boolean; dark?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel="Back" accessibilityState={{ disabled: !!disabled }} hitSlop={4} style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled || pressed ? 0.5 : 1 })}>
    <View style={{ width: 42, height: 42, borderRadius: 20, borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.3)' : C.border, alignItems: 'center', justifyContent: 'center' }}><Icon name="back" size={18} color={dark ? C.surface : C.ink} /></View>
  </Pressable>;
}
export default function MedHeader({ navigation, title = 'Home' }: { navigation: any; title?: string }) {
  const { patient } = usePatient();
  const unread = useUnreadCount();
  const insets = useSafeAreaInsets();
  const dark = title === 'Home';
  const name = patient?.fullName?.split(/[ ,]+/).filter(Boolean)[0] || 'there';
  return <View style={{ paddingTop: insets.top, backgroundColor: dark ? C.hero : C.surface }}>
    <View style={{ minHeight: dark ? 64 : title === 'Bill' ? 72 : 56, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center' }}>
      {dark ? <View style={{ flex: 1 }}><Brand size={30} /></View> : title === 'Bill' ? <Text style={{ flex: 1, fontSize: 22, fontWeight: '600', color: C.ink }}>Hi, {name}!</Text> : <Text accessibilityRole="header" style={{ flex: 1, textAlign: 'center', fontSize: title === 'Profile' ? 20 : 18, fontWeight: '600', color: C.ink }}>{title}</Text>}
      {(dark || title === 'Bill') && <>
        <Pressable onPress={() => navigation.navigate('Notifications')} accessibilityRole="button" accessibilityLabel={unread ? `Open notifications, ${unread} unread` : 'Open notifications'} style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}><Icon name="bell" size={21} color={dark ? C.surface : C.ink} />{unread > 0 && <View style={{ position: 'absolute', right: 10, top: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: C.brand }} />}</Pressable>
        <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Open profile" style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}><View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: dark ? C.heroLight : C.brandSoft, justifyContent: 'center', alignItems: 'center' }}><Icon name="profile" size={18} color={dark ? C.surface : C.brandDark} /></View></Pressable>
      </>}
    </View>
  </View>;
}
