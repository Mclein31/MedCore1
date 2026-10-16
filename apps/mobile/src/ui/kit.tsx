import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ChevronRight, type IconComponent } from './icons';
import { C, R, S, T } from './theme';

/** Scrolling screen body. Tabs default to the grey "paper" canvas; detail screens use white, as in v1. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  background = C.paper,
  gutter = S.gutter,
  gap = S.lg,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  background?: string;
  gutter?: number;
  gap?: number;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: background }}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 20, paddingBottom: 48, gap }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={C.brand} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  title,
  children,
  style,
  flush,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  flush?: boolean;
}) {
  return (
    <View style={[styles.card, flush && { paddingVertical: 0 }, style]}>
      {title ? (
        <Text
          accessibilityRole="header"
          style={[T.cardTitle, { marginBottom: S.sm, marginTop: flush ? S.lg : 0 }]}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm }}
    >
      <Text accessibilityRole="header" style={T.section}>
        {title}
      </Text>
      {action}
    </View>
  );
}

/** Small grey group label above a grouped card (v1 Profile). */
export function GroupLabel({ children }: { children: string }) {
  return <Text style={[T.meta, { marginTop: S.sm, marginBottom: -S.sm, marginLeft: 2 }]}>{children}</Text>;
}

type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  busy,
  disabled,
  icon: Icon,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  busy?: boolean;
  disabled?: boolean;
  icon?: IconComponent;
  accessibilityHint?: string;
}) {
  const inactive = disabled || busy;
  const palette = {
    primary: { bg: C.brand, fg: '#FFFFFF', border: C.brand },
    secondary: { bg: C.brandSoft, fg: C.brandDark, border: C.brandBorder },
    inverse: { bg: '#FFFFFF', fg: C.ink, border: '#FFFFFF' },
    ghost: { bg: 'transparent', fg: C.brandDark, border: 'transparent' },
    danger: { bg: C.surface, fg: C.danger, border: C.danger },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(busy) }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' && { minHeight: 44, paddingHorizontal: S.sm },
        { backgroundColor: palette.bg, borderColor: palette.border },
        inactive && { opacity: 0.45 },
        pressed && !inactive && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          {Icon ? <Icon size={20} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontSize: variant === 'ghost' ? 15 : 17, fontWeight: '600' }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  ...input
}: { label: string; hint?: string; error?: string | null } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[T.meta, { fontWeight: '600', color: C.ink }]}>{label}</Text>
      <TextInput
        placeholderTextColor={C.faint}
        accessibilityLabel={label}
        accessibilityHint={hint}
        {...input}
        style={[styles.input, error ? { borderColor: C.danger } : null, input.style]}
      />
      {error ? (
        <Text style={[T.small, { color: C.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={T.small}>{hint}</Text>
      ) : null}
    </View>
  );
}

type Tone = 'danger' | 'info' | 'good' | 'warn';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  danger: { bg: C.dangerBg, fg: C.danger },
  info: { bg: C.infoBg, fg: C.info },
  good: { bg: C.successBg, fg: C.success },
  warn: { bg: C.warningBg, fg: C.warning },
};

export function Notice({ tone = 'danger', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={{ backgroundColor: t.bg, borderRadius: R.control, padding: S.md }}
    >
      <Text style={[T.meta, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

/** v1 status pill: "✓ Approved", "● Final bill ready". */
export function Badge({ tone = 'info', label }: { tone?: Tone | 'neutral' | 'brand'; label: string }) {
  const t =
    tone === 'neutral'
      ? { bg: C.elevated, fg: C.secondary }
      : tone === 'brand'
        ? { bg: C.brandSoft, fg: C.ink }
        : TONES[tone];
  const glyph = tone === 'good' ? '✓' : tone === 'danger' || tone === 'warn' ? '!' : '●';
  return (
    <View
      accessibilityLabel={label}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: t.bg,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: t.fg, fontSize: 13, fontWeight: '700' }}>{`${glyph}  ${label}`}</Text>
    </View>
  );
}

/** Label/value line with a hairline under it (v1 breakdown rows). */
export function Row({
  label,
  value,
  hint,
  bold,
  last,
}: {
  label: string;
  value: string;
  hint?: string;
  bold?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[T.row, bold && { fontWeight: '700' }]}>{label}</Text>
        {hint ? <Text style={T.small}>{hint}</Text> : null}
      </View>
      <Text style={[T.money, bold && { fontWeight: '700', fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

/** Tappable ledger row inside a card: optional icon, two lines of text, value, chevron. */
export function LinkRow({
  title,
  subtitle,
  value,
  icon: Icon,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconComponent;
  onPress?: () => void;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.linkRow, !last && styles.divider]}>
      {Icon ? (
        <View style={{ width: 26, marginRight: 10 }}>
          <Icon size={20} color={C.secondary} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[T.body, { fontSize: 16 }]}>{title}</Text>
        {subtitle ? <Text style={T.meta}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[T.money, { fontWeight: '600', marginLeft: S.sm }]}>{value}</Text> : null}
      {onPress ? <ChevronRight size={17} color={C.faint} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {body}
    </Pressable>
  );
}

/** One-of-many choice rendered as wrapping chips (radio semantics). */
export function Choice<V extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <View style={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={[T.meta, { fontWeight: '600', color: C.ink }]}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && { borderColor: C.brand, backgroundColor: C.brandSoft }]}
            >
              <Text style={{ color: selected ? C.brandDark : C.ink, fontWeight: selected ? '600' : '400' }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Round white shortcut buttons under the balance (v1 QuickActions). */
export function QuickActions({
  actions,
  onTeal,
}: {
  actions: { label: string; icon: IconComponent; onPress: () => void }[];
  onTeal?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'space-between' }}>
      {actions.map(({ label, icon: Icon, onPress }) => (
        <Pressable
          key={label}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 84,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.65 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <View style={styles.shortcut}>
            <Icon size={24} color={C.secondary} />
          </View>
          <Text style={{ fontSize: 12, lineHeight: 18, fontWeight: '500', color: onTeal ? C.ink : C.ink }}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Brand({ size = 30 }: { size?: number }) {
  return (
    <View
      accessible
      accessibilityLabel="MedCore"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <Image
        source={require('../../assets/MedCore_Badge_Logo.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Image
        source={require('../../assets/wordmark.png')}
        style={{ width: size * 3.6, height: (size * 3.6 * 110) / 600 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

export function Loading({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={C.brand} />
      <Text style={[T.meta, { marginTop: S.md }]}>{message}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={[styles.center, { gap: S.md }]} accessibilityRole="alert">
      <Text style={[T.title, { color: C.danger }]}>Something needs attention</Text>
      <Text style={[T.meta, { textAlign: 'center' }]}>{message}</Text>
      <View style={{ alignSelf: 'stretch' }}>
        <Button title="Try again" onPress={onRetry} />
      </View>
    </View>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.xl }}>
      <View style={styles.emptyGlyph}>
        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2.5, borderColor: C.brand }} />
      </View>
      <Text style={[T.title, { textAlign: 'center' }]}>{title}</Text>
      {detail ? <Text style={[T.meta, { textAlign: 'center' }]}>{detail}</Text> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.card, paddingHorizontal: S.lg, paddingVertical: S.lg },
  button: {
    minHeight: 50,
    borderRadius: R.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.lg,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: R.control,
    paddingHorizontal: 14,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.input,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: S.md,
    borderRadius: R.control,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  shortcut: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  emptyGlyph: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.brandSoft,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xl,
    backgroundColor: C.paper,
  },
});
