import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Home, Receipt, ShieldCheck, User, type IconComponent } from './icons';
import { Brand } from './kit';
import { C, S } from './theme';

/** v1 header: the brand on Home, a centred title elsewhere, a round back button on pushed screens. */
export function AppHeader({
  title,
  branded,
  onBack,
  background = C.surface,
}: {
  title: string;
  branded?: boolean;
  onBack?: () => void;
  background?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: background,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <View
        style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.gutter }}
      >
        {branded ? (
          <View style={{ flex: 1 }}>
            <Brand size={30} />
          </View>
        ) : (
          <>
            <View style={{ width: 48 }}>{onBack ? <BackButton onPress={onBack} /> : null}</View>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 20,
                lineHeight: 26,
                fontWeight: '600',
                color: C.ink,
              }}
            >
              {title}
            </Text>
            <View style={{ width: 48 }} />
          </>
        )}
      </View>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={4}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        justifyContent: 'center',
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          borderWidth: 1,
          borderColor: C.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ArrowLeft size={20} color={C.ink} />
      </View>
    </Pressable>
  );
}

const TAB_ICONS: Record<string, IconComponent> = {
  Home,
  Bill: Receipt,
  Coverage: ShieldCheck,
  Payments: CreditCard,
  Profile: User,
};

/** v1 floating pill tab bar: icons only, the active tab grows a mint pill with its label. */
export function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: 4,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingHorizontal: 12,
        backgroundColor: C.paper,
      }}
    >
      <View accessibilityRole="tablist" style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key]?.options.title ?? route.name;
          return (
            <TabItem
              key={route.key}
              label={label}
              icon={TAB_ICONS[route.name] ?? Home}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (focused || event.defaultPrevented) return;
                LayoutAnimation.configureNext({
                  duration: 180,
                  update: { type: LayoutAnimation.Types.easeOut },
                });
                navigation.navigate(route.name, route.params);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  label,
  icon: Icon,
  focused,
  onPress,
}: {
  label: string;
  icon: IconComponent;
  focused: boolean;
  onPress: () => void;
}) {
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [focused, progress]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={({ pressed }) => [styles.item, focused && styles.active, pressed && { opacity: 0.65 }]}
    >
      <Icon size={24} color={focused ? C.brandDark : C.secondary} weight={focused ? 'Bold' : 'Linear'} />
      {focused ? (
        <Animated.Text style={[styles.label, { opacity: progress }]} numberOfLines={1}>
          {label}
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}

export function TealHero({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: C.brand, borderRadius: 22, padding: 20, gap: 4 }}>{children}</View>;
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingVertical: 8,
    borderRadius: 32,
    backgroundColor: C.surface,
    shadowColor: C.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  item: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 24,
    paddingHorizontal: 4,
  },
  active: { flex: 2.3, backgroundColor: C.brandSoft },
  label: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: C.brandDark },
});
