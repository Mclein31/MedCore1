import { useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Icon } from './icons';
import { C, NavigationLayout, TabBarLayout } from './theme';

function TabItem({
  label,
  iconName,
  focused,
  width,
  reduced,
  largeText,
  stacked,
  onPress,
  onLongPress,
  testID,
}: {
  label: string;
  iconName: string;
  focused: boolean;
  width: number;
  reduced: boolean;
  largeText: boolean;
  stacked: boolean;
  onPress: () => void;
  onLongPress: () => void;
  testID: string;
}) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      progress.stopAnimation();
      progress.setValue(focused ? 1 : 0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: TabBarLayout.duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [focused, reduced, progress]);
  const widthTransition =
    Platform.OS === 'web' && !reduced
      ? ({
          transitionProperty: 'width',
          transitionDuration: `${TabBarLayout.duration}ms`,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        } as ViewStyle)
      : undefined;
  return (
    <View style={[{ width }, widthTransition]}>
      <Pressable
        testID={testID}
        tabIndex={Platform.OS === 'web' ? (focused ? 0 : -1) : undefined}
        accessibilityRole="tab"
        accessibilityLabel={label}
        aria-selected={focused}
        accessibilityState={{ selected: focused }}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          s.item,
          focused && s.active,
          stacked && focused && s.stacked,
          pressed && { opacity: 0.65 },
        ]}
      >
        <Animated.View
          accessible={false}
          style={{
            transform: [
              {
                translateX:
                  reduced || stacked
                    ? 0
                    : progress.interpolate({ inputRange: [0, 1], outputRange: [0, -TabBarLayout.nudge] }),
              },
            ],
          }}
        >
          <Icon
            name={iconName.toLowerCase()}
            size={NavigationLayout.iconSize}
            color={focused ? C.brandDark : C.secondary}
            weight={focused ? 'Bold' : 'Linear'}
          />
        </Animated.View>
        {focused && (
          <Animated.View
            testID="active-tab-label"
            accessible={false}
            style={{ flexShrink: 1, opacity: reduced ? 1 : progress }}
          >
            <Text style={s.label} numberOfLines={largeText ? 2 : 1}>
              {label}
            </Text>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
}

export default function MedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const [barWidth, setBarWidth] = useState(Math.min(TabBarLayout.maxWidth, width - 2 * TabBarLayout.gutter));
  const available = barWidth - 2 * TabBarLayout.padding;
  const activeWidth = Math.min(
    TabBarLayout.activeWidth,
    available - TabBarLayout.target * (state.routes.length - 1),
  );
  const otherWidth = (available - activeWidth) / (state.routes.length - 1);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const list = document.querySelector('[role="tablist"][aria-label="Primary navigation"]');
      if (!list?.contains(document.activeElement)) return;
      const tabs = list.querySelectorAll<HTMLElement>('[role="tab"]');
      const focusedIndex = Array.from(tabs).indexOf(document.activeElement as HTMLElement);
      if (focusedIndex < 0) return;
      let nextIndex = -1;
      if (event.key === 'ArrowRight') nextIndex = (focusedIndex + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (focusedIndex - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex < 0) return;
      event.preventDefault();
      const nextRoute = state.routes[nextIndex];
      const tabEvent = navigation.emit({ type: 'tabPress', target: nextRoute.key, canPreventDefault: true });
      if (!tabEvent.defaultPrevented && nextIndex !== state.index)
        navigation.navigate(nextRoute.name, nextRoute.params);
      requestAnimationFrame(() => tabs[nextIndex]?.focus());
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigation, state.index, state.routes]);
  return (
    <View
      testID="mobile-tab-bar"
      onLayout={(event) => reportHeight?.(event.nativeEvent.layout.height)}
      style={{
        paddingTop: 4,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingLeft: Math.max(insets.left, TabBarLayout.gutter),
        paddingRight: Math.max(insets.right, TabBarLayout.gutter),
        backgroundColor: C.paper,
      }}
    >
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Primary navigation"
        style={[s.bar, { minHeight: TabBarLayout.height + Math.max(0, (fontScale - 1) * 32) }]}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index,
            options = descriptors[route.key].options;
          return (
            <TabItem
              key={route.key}
              label={options.tabBarAccessibilityLabel || route.name}
              iconName={route.name}
              focused={focused}
              width={focused ? activeWidth : otherWidth}
              reduced={reduced}
              largeText={fontScale > 1.35}
              stacked={fontScale > 1.15 || activeWidth < 112}
              testID={options.tabBarButtonTestID || `tab-button-${route.name}`}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (focused || event.defaultPrevented) return;
                if (!reduced && Platform.OS !== 'web')
                  LayoutAnimation.configureNext({
                    duration: TabBarLayout.duration,
                    update: { type: LayoutAnimation.Types.easeOut },
                  });
                navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    width: '100%',
    maxWidth: TabBarLayout.maxWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TabBarLayout.padding,
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
    minHeight: TabBarLayout.target,
    minWidth: TabBarLayout.target,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 3,
    borderRadius: 24,
  },
  active: { backgroundColor: C.brandSoft },
  stacked: { flexDirection: 'column', gap: 4 },
  label: {
    fontSize: NavigationLayout.labelSize,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: C.brandDark,
  },
});
