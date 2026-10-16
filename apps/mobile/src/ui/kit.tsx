import type { ReactNode } from 'react';
import {
  ActivityIndicator,
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
import { C, R, S, T } from './theme';

export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.paper }}
      contentContainerStyle={{ padding: S.gutter, paddingBottom: 48, gap: S.lg }}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
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
    <View style={[styles.card, flush && { paddingVertical: S.xs }, style]}>
      {title ? (
        <Text accessibilityRole="header" style={[T.section, { marginBottom: S.md }]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  busy,
  disabled,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  busy?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const inactive = disabled || busy;
  const palette = {
    primary: { bg: C.brand, fg: '#FFFFFF', border: C.brand },
    secondary: { bg: C.surface, fg: C.brandDark, border: C.brand },
    ghost: { bg: 'transparent', fg: C.brandDark, border: 'transparent' },
    danger: { bg: C.surface, fg: C.danger, border: C.danger },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(busy) }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        inactive && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={{ color: palette.fg, fontSize: 16, fontWeight: '600' }}>{title}</Text>
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
      <Text style={T.label}>{label}</Text>
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

export function Badge({ tone = 'info', label }: { tone?: Tone | 'neutral'; label: string }) {
  const t = tone === 'neutral' ? { bg: C.elevated, fg: C.secondary } : TONES[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: t.bg,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

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
        <Text style={[T.body, bold && { fontWeight: '700' }]}>{label}</Text>
        {hint ? <Text style={T.small}>{hint}</Text> : null}
      </View>
      <Text style={[T.money, bold && { fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

export function LinkRow({
  title,
  subtitle,
  value,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, last && { borderBottomWidth: 0 }, pressed && { opacity: 0.6 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={T.label}>{title}</Text>
        {subtitle ? <Text style={T.meta}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={T.money}>{value}</Text> : null}
      <Text style={{ color: C.faint, fontSize: 22, marginLeft: S.sm }}>›</Text>
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
      <Text style={T.label}>{label}</Text>
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

export function Loading({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={C.brand} />
      <Text style={[T.meta, { marginTop: S.md }]}>{message}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={[styles.center, { gap: S.lg }]}>
      <Text style={[T.body, { textAlign: 'center' }]}>{message}</Text>
      <Button title="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={[styles.card, { alignItems: 'center', gap: S.sm, paddingVertical: S.xl }]}>
      <Text style={[T.section, { textAlign: 'center' }]}>{title}</Text>
      {detail ? <Text style={[T.meta, { textAlign: 'center' }]}>{detail}</Text> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.card, padding: S.lg },
  button: {
    minHeight: 50,
    borderRadius: R.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.lg,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: R.control,
    paddingHorizontal: S.md,
    fontSize: 17,
    color: C.ink,
    backgroundColor: C.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: S.md,
    borderRadius: R.control,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xl,
    backgroundColor: C.paper,
  },
});
