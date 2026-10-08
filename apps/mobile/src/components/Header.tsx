import type { ReactNode } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnreadCount } from '../hooks/useUnread';
import Brand from './Brand';
import FocusedStatusBar from './FocusedStatusBar';
import { Icon } from './icons';
import { C, HeaderLayout } from './theme';

export function HeaderBack({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel="Back" accessibilityState={{ disabled: !!disabled }} hitSlop={4} style={({ pressed }) => ({ width: HeaderLayout.actionSize, height: HeaderLayout.actionSize, alignItems: 'center', justifyContent: 'center', opacity: disabled || pressed ? 0.5 : 1 })}>
    <View style={{ width: HeaderLayout.backSize, height: HeaderLayout.backSize, borderRadius: HeaderLayout.backSize / 2, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}><Icon name="back" size={HeaderLayout.iconSize} color={C.ink} /></View>
  </Pressable>;
}

// Shared by tabs and pushed screens. Only title/branding and required actions vary.
export default function MedHeader({ navigation, title = 'Home', leading }: { navigation?: any; title?: string; leading?: ReactNode }) {
  const focused = useIsFocused();
  const unread = useUnreadCount();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const branded = title === 'Home' && !leading;
  const notifications = !leading && (title === 'Home' || title === 'Bill');
  const height = Math.max(HeaderLayout.height, HeaderLayout.titleLineHeight * fontScale * 2 + 4);
  return <View testID={focused ? 'app-header' : 'inactive-app-header'} accessibilityElementsHidden={!focused} importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'} style={{ paddingTop: insets.top, backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }}>
    <FocusedStatusBar style="dark" />
    <View testID={focused ? 'app-header-row' : 'inactive-app-header-row'} style={{ minHeight: height, paddingVertical: 2, paddingLeft: Math.max(HeaderLayout.gutter, insets.left), paddingRight: Math.max(HeaderLayout.gutter, insets.right), width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'center' }}>
      {branded ? <View style={{ flex: 1 }}><Brand size={30} /></View> : <>
        <View style={{ width: HeaderLayout.actionSize, alignItems: 'center' }}>{leading}</View>
        <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: HeaderLayout.titleSize, lineHeight: HeaderLayout.titleLineHeight, fontWeight: '600', color: C.ink }} numberOfLines={2}>{title}</Text>
      </>}
      <View style={{ width: HeaderLayout.actionSize }}>
        {notifications && <Pressable onPress={() => navigation?.navigate('Notifications')} accessibilityRole="button" accessibilityLabel={unread ? `Open notifications, ${unread} unread` : 'Open notifications'} style={({ pressed }) => ({ width: HeaderLayout.actionSize, height: HeaderLayout.actionSize, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}><Icon name="bell" size={HeaderLayout.iconSize} color={C.ink} />{unread > 0 && <View style={{ position: 'absolute', right: 10, top: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: C.brand }} />}</Pressable>}
      </View>
    </View>
  </View>;
}
