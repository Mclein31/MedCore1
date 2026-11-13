import React, { createContext, useContext, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { C, NavigationLayout, Radius } from './theme';
import { Screen } from './ui';

/*
 * First-load placeholders. Each screen skeleton reuses the real screen's containers
 * (Screen gutters, card radii, row paddings) and swaps text for bars of the same line
 * height, so content lands exactly where the placeholders were. Bars use the existing
 * neutral tokens: C.border on the paper/white page, C.elevated inside white cards.
 * One shared opacity pulse runs on the native driver; Reduce Motion keeps it still.
 */

const Pulse = createContext<Animated.Value | null>(null);

export function SkeletonPulse({
  label,
  children,
  style = { flex: 1 },
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    opacity.setValue(1);
    if (reduced) return;
    const ease = Easing.bezier(0.4, 0, 0.6, 1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 1000, easing: ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1000, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, opacity]);
  return (
    <Pulse.Provider value={opacity}>
      <View style={style} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
        {children}
      </View>
    </Pulse.Provider>
  );
}

type Tone = 'page' | 'card' | 'hero';
const TONE: Record<Tone, string> = { page: C.border, card: C.elevated, hero: C.brandSoft };

export function Bone({
  width = '100%',
  height,
  radius = 6,
  tone = 'page',
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const pulse = useContext(Pulse);
  // Bars on the green summary card stay faint so the card still reads as the same surface.
  const opacity = pulse
    ? tone === 'hero'
      ? Animated.multiply(pulse, 0.3)
      : pulse
    : tone === 'hero'
      ? 0.3
      : 1;
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: TONE[tone], opacity }, style]}
    />
  );
}

/** One line of text: a box of the real line height with a shorter bar centred in it. */
export function TextBone({
  lineHeight,
  width,
  tone = 'page',
  style,
}: {
  lineHeight: number;
  width: DimensionValue;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ height: lineHeight, justifyContent: 'center' }, style]}>
      <Bone width={width} height={Math.round(lineHeight * 0.55)} tone={tone} />
    </View>
  );
}

/** Remembers whether a screen has shown its skeleton, so only that first reveal fades in. */
export function useRevealAfterSkeleton(showingSkeleton: boolean) {
  const showed = useRef(false);
  if (showingSkeleton) showed.current = true;
  return showed.current;
}

/**
 * Fades loaded content in over the screen's own background when it replaces a skeleton.
 * Inactive, it renders the children untouched. Skipped under Reduce Motion.
 */
export function FadeIn({
  active,
  background,
  children,
}: {
  active: boolean;
  background: string;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(active ? 0 : 1)).current;
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let animation: Animated.CompositeAnimation | null = null;
    // Safety net: content is never left hidden if the animation cannot run (e.g. a stalled JS clock).
    const settle = setTimeout(() => opacity.setValue(1), 450);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => true)
      .then((reduced) => {
        if (!alive) return;
        if (reduced) return opacity.setValue(1);
        animation = Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
          useNativeDriver: true,
        });
        animation.start();
      });
    return () => {
      alive = false;
      clearTimeout(settle);
      animation?.stop();
      opacity.setValue(1);
    };
    // Runs once per mount: the reveal is a one-time transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!active) return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** QuickActions frame: white 44pt circles with a label underneath, same row geometry. */
function QuickActionsSkeleton({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-between' }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: NavigationLayout.shortcutHeight,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <View
            style={{
              width: NavigationLayout.shortcutSize,
              height: NavigationLayout.shortcutSize,
              borderRadius: NavigationLayout.shortcutSize / 2,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bone width={22} height={22} radius={6} tone="card" />
          </View>
          <TextBone lineHeight={18} width={56} />
        </View>
      ))}
    </View>
  );
}

/** SectionHeader frame (marginTop 24 / bottom 12, section title line). */
function SectionHeaderSkeleton({
  width = 170,
  topSpacing = 24,
  withAction = false,
}: {
  width?: number;
  topSpacing?: number;
  /** The header carries a 44pt text action (e.g. "All updates"), which sets the row height. */
  withAction?: boolean;
}) {
  return (
    <View
      style={{
        marginTop: topSpacing,
        marginBottom: 12,
        minHeight: withAction ? 44 : undefined,
        justifyContent: 'center',
      }}
    >
      <TextBone lineHeight={24} width={width} />
    </View>
  );
}

/** LedgerRow frame inside a flush card: title line, meta line(s), optional value. */
function LedgerRowSkeleton({
  last,
  subLines = 1,
  value = true,
}: {
  last?: boolean;
  subLines?: number;
  value?: boolean;
}) {
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
        gap: 2,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: C.border,
      }}
    >
      <View style={{ flex: 1, paddingRight: 10 }}>
        <TextBone lineHeight={19} width="52%" tone="card" />
        {Array.from({ length: subLines }, (_, i) => (
          <TextBone key={i} lineHeight={19} width={i === subLines - 1 ? '58%' : '88%'} tone="card" />
        ))}
      </View>
      {value && <Bone width={72} height={10} tone="card" />}
    </View>
  );
}

function FlushCardSkeleton({ rows, subLines }: { rows: number; subLines?: number }) {
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: Radius.surface, marginBottom: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <LedgerRowSkeleton key={i} subLines={subLines} last={i === rows - 1} />
      ))}
    </View>
  );
}

/** The green Hero summary (Bill, Payments): same frame, faint bars for its text. */
export function HeroSkeleton({ action, amountLabel }: { action?: boolean; amountLabel?: boolean }) {
  return (
    <View style={{ backgroundColor: C.brand, borderRadius: Radius.summary, padding: 20, minHeight: 153 }}>
      <TextBone lineHeight={22} width="52%" tone="hero" />
      {amountLabel && <TextBone lineHeight={19} width="40%" tone="hero" style={{ marginTop: 16 }} />}
      <TextBone lineHeight={40} width="58%" tone="hero" style={{ marginTop: 4 }} />
      {!amountLabel && <TextBone lineHeight={20} width="86%" tone="hero" style={{ marginTop: 4 }} />}
      {action && (
        <View style={{ gap: 10, marginTop: 24, flexGrow: 1, justifyContent: 'flex-end' }}>
          <View style={{ minHeight: 50, borderRadius: Radius.pill, backgroundColor: C.surface }} />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen skeletons
// ---------------------------------------------------------------------------

/** HomeScreen: greeting, balance card with its button, shortcuts, stay lines, latest updates. */
export function HomeSkeleton({ label }: { label: string }) {
  return (
    <SkeletonPulse label={label}>
      <Screen gutter={0} topSpacing={0} safeBottom={false} background={C.paper}>
        <View style={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20 }}>
          <TextBone lineHeight={19} width={80} />
          <TextBone lineHeight={41} width="78%" style={{ marginTop: 4 }} />
          <TextBone lineHeight={19} width={190} style={{ marginTop: 6 }} />
        </View>
        <View style={{ paddingHorizontal: 22, paddingBottom: 28 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 22, padding: 22, marginBottom: 12 }}>
            <TextBone lineHeight={19} width="52%" tone="card" />
            <TextBone lineHeight={42} width="56%" tone="card" style={{ marginTop: 8 }} />
            <TextBone lineHeight={19} width="88%" tone="card" style={{ marginTop: 8 }} />
            <TextBone lineHeight={19} width="30%" tone="card" />
            <Bone height={50} radius={Radius.pill} tone="card" style={{ marginTop: 12 }} />
          </View>
          <QuickActionsSkeleton count={4} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Bone width={17} height={17} radius={9} />
            <TextBone lineHeight={19} width="64%" />
          </View>
          <TextBone lineHeight={19} width="72%" style={{ marginTop: 8 }} />
          <SectionHeaderSkeleton width={210} withAction />
          {[0, 1].map((i) => (
            <View key={i} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <TextBone lineHeight={22} width="46%" />
              <TextBone lineHeight={19} width="70%" style={{ marginTop: 4 }} />
              <TextBone lineHeight={19} width="44%" style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </Screen>
    </SkeletonPulse>
  );
}

/** BillScreen: mint band with the green summary and three shortcuts, then the bill header lines. */
export function BillSkeleton({ label }: { label: string }) {
  return (
    <SkeletonPulse label={label}>
      <Screen gutter={0} topSpacing={0} safeBottom={false}>
        <View
          style={{
            backgroundColor: C.brandSoft,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            padding: 22,
            paddingTop: 16,
            paddingBottom: 36,
          }}
        >
          <View style={{ marginBottom: 24 }}>
            <HeroSkeleton amountLabel />
          </View>
          <QuickActionsSkeleton count={3} />
        </View>
        <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
          <TextBone lineHeight={19} width="86%" />
          <TextBone lineHeight={19} width="40%" />
          <Bone width={128} height={30} radius={Radius.badge} style={{ marginTop: 12 }} />
          <Bone height={50} radius={Radius.pill} style={{ marginTop: 12 }} />
          <Bone height={48} radius={Radius.control} style={{ marginTop: 14, marginBottom: 10 }} />
        </View>
      </Screen>
    </SkeletonPulse>
  );
}

/** PaymentsScreen: balance summary with its action, then the payments list. */
export function PaymentsSkeleton({ label }: { label: string }) {
  return (
    <SkeletonPulse label={label}>
      <Screen safeBottom={false}>
        <View style={{ marginTop: 8 }}>
          <HeroSkeleton action />
        </View>
        <SectionHeaderSkeleton width={130} />
        <FlushCardSkeleton rows={1} subLines={2} />
        <SectionHeaderSkeleton width={120} />
        <FlushCardSkeleton rows={1} />
      </Screen>
    </SkeletonPulse>
  );
}

/** DocumentsScreen: intro line, then grouped flush cards of document rows. */
export function DocumentsSkeleton({ label }: { label: string }) {
  return (
    <SkeletonPulse label={label}>
      <Screen>
        <TextBone lineHeight={19} width="92%" style={{ marginTop: 8 }} />
        <TextBone lineHeight={19} width="34%" />
        <SectionHeaderSkeleton width={140} />
        <FlushCardSkeleton rows={2} subLines={2} />
        <SectionHeaderSkeleton width={120} />
        <FlushCardSkeleton rows={1} subLines={2} />
      </Screen>
    </SkeletonPulse>
  );
}

/** ClaimsScreen: count line, then bordered claim cards (title + badge, detail rows). */
export function ClaimsSkeleton({ label }: { label: string }) {
  return (
    <SkeletonPulse label={label}>
      <Screen>
        <TextBone lineHeight={19} width="58%" style={{ marginTop: 10 }} />
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{
              backgroundColor: C.surface,
              borderColor: C.border,
              borderWidth: 1,
              borderRadius: Radius.surface,
              padding: 16,
              marginBottom: 12,
              marginTop: i === 0 ? 12 : 0,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TextBone lineHeight={24} width="48%" tone="card" />
              <Bone width={96} height={30} radius={Radius.badge} tone="card" />
            </View>
            <TextBone lineHeight={19} width="90%" tone="card" style={{ marginTop: 10 }} />
            <TextBone lineHeight={19} width="64%" tone="card" />
          </View>
        ))}
      </Screen>
    </SkeletonPulse>
  );
}

/** NotificationsScreen: heading, summary line, then divided update items. */
export function NotificationsSkeleton({ label }: { label: string }) {
  return (
    <SkeletonPulse label={label}>
      <Screen>
        <TextBone lineHeight={26} width={180} style={{ marginTop: 12 }} />
        <TextBone lineHeight={19} width="62%" style={{ marginVertical: 8 }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <TextBone lineHeight={24} width="52%" />
            <TextBone lineHeight={23} width="84%" style={{ marginTop: 6 }} />
            <TextBone lineHeight={19} width="58%" style={{ marginTop: 8 }} />
          </View>
        ))}
      </Screen>
    </SkeletonPulse>
  );
}
