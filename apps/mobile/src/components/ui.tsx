import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TextInputProps } from 'react-native';

// MedCore "Calm Ledger" design language.
// One hue family (brand blue) carries emphasis; a deep-blue hero panel
// answers each screen's core question; everything else is quiet paper and
// ledger rows separated by hairlines. Status is always words plus a glyph,
// never color alone.

export const C = {
  paper: '#F5F6F8',
  surface: '#FFFFFF',
  border: '#E3E9F1',
  ink: '#101E33',
  secondary: '#5C6C84',
  faint: '#64748B',
  brand: '#2563EB',
  hero: '#17324F',
  heroSub: 'rgba(255,255,255,0.78)',
  brandSoft: '#E9EFFE',
  success: '#157F3D',
  successBg: '#E9F7EF',
  warning: '#B45309',
  warningBg: '#FDF3E3',
  danger: '#B91C1C',
  dangerBg: '#FDECEC',
  // Backwards-compatible aliases used across screens
  bg: '#F5F6F8',
  surfaceAlias: '#FFFFFF',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  text: '#101E33'
} as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, section: 32 } as const;
export const Radius = { control: 12, surface: 16, badge: 8 } as const;

export const T = StyleSheet.create({
  display: { fontSize: 30, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  heroFigure: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  heroEyebrow: { fontSize: 14, fontWeight: '600', color: C.heroSub },
  heroSub: { fontSize: 14, color: C.heroSub, marginTop: 4 },
  title: { fontSize: 19, fontWeight: '700', color: C.ink, letterSpacing: -0.2 },
  section: { fontSize: 15, fontWeight: '700', color: C.ink },
  body: { fontSize: 15, color: C.ink, lineHeight: 22 },
  meta: { fontSize: 13, color: C.secondary, lineHeight: 18 },
  eyebrow: { fontSize: 12, fontWeight: '700', color: C.secondary, letterSpacing: 1.1, textTransform: 'uppercase' },
  numeral: { fontVariant: ['tabular-nums'] }
});

export function Screen({ children, safeTop = false, keyboard = false, keyboardOffset = 0 }: {
  children: React.ReactNode; safeTop?: boolean; keyboard?: boolean; keyboardOffset?: number;
}) {
  const insets = useSafeAreaInsets();
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper }} enabled={keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardOffset}>
    <View style={[s.screen, { paddingTop: safeTop ? insets.top + 8 : 8, paddingLeft: Math.max(16, insets.left), paddingRight: Math.max(16, insets.right) }]}>{children}</View>
  </KeyboardAvoidingView>;
}

export function RefreshNotice({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return null;
  return <View style={{ backgroundColor: C.warningBg, borderRadius: Radius.control, padding: 12, marginVertical: 8 }}>
    <Text style={[T.meta, { color: C.warning }]} accessibilityRole="alert">{error} Previously loaded information may be out of date.</Text>
    <Pressable onPress={onRetry} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: C.ink, fontWeight: '700' }}>Retry refresh</Text></Pressable>
  </View>;
}

// Deep-blue answer panel: one question, one figure, its actions.
export function Hero({ eyebrow, figure, sub, children }: {
  eyebrow: string; figure: string; sub?: string; children?: React.ReactNode;
}) {
  return (
    <View style={s.hero}>
      <Text style={T.heroEyebrow}>{eyebrow}</Text>
      <Text style={T.heroFigure} accessibilityRole="header">{figure}</Text>
      {sub ? <Text style={T.heroSub}>{sub}</Text> : null}
      {children ? <View style={s.heroActions}>{children}</View> : null}
    </View>
  );
}

export function HeroBtn({ title, onPress, ghost, disabled, a11y }: {
  title: string; onPress: () => void; ghost?: boolean; disabled?: boolean; a11y?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.heroBtn, ghost ? s.heroBtnGhost : s.heroBtnSolid, (disabled || pressed) && s.dimmed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y || title}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={[s.heroBtnText, ghost && s.heroBtnGhostText]}>{title}</Text>
    </Pressable>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={T.section}>{title}</Text>
      {action}
    </View>
  );
}

export function LoadingState({ message }: { message: string }) {
  return (
    <View style={s.center} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={C.brand} />
      <Text style={T.meta}>{message}</Text>
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={s.center}>
      <View style={s.emptyGlyph}><Text style={s.emptyGlyphText}>○</Text></View>
      <Text style={T.title}>{title}</Text>
      <Text style={[T.meta, s.centerText]}>{detail}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center} accessibilityRole="alert">
      <Text style={[T.title, { color: C.danger }]}>Something needs attention</Text>
      <Text style={[T.meta, s.centerText]}>{message}</Text>
      {onRetry && <PrimaryButton title="Try again" onPress={onRetry} />}
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, a11y }: { title: string; onPress: () => void; disabled?: boolean; a11y?: string }) {
  return (
    <Pressable
      style={({ pressed }) => [s.primaryBtn, (disabled || pressed) && s.dimmed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y || title}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={s.primaryBtnText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [s.secondaryBtn, (disabled || pressed) && s.dimmed]} disabled={disabled} accessibilityState={{ disabled: !!disabled }} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <Text style={s.secondaryBtnText}>{title}</Text>
    </Pressable>
  );
}

// Segmented mode switch (e.g. Log in | Create account).
export function SegControl({ options, value, onChange, disabled }: {
  options: Array<{ key: string; label: string }>; value: string; onChange: (k: string) => void; disabled?: boolean;
}) {
  return (
    <View style={s.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            style={[s.segOpt, active && s.segOptActive]}
            onPress={() => onChange(o.key)}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
          >
            <Text style={[s.segText, active && s.segTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, value, onChangeText, secure, keyboard, a11y, hint, error, editable = true, autoComplete, autoCapitalize = 'none' }: {
  label: string; value: string; onChangeText: (t: string) => void; secure?: boolean;
  keyboard?: TextInputProps['keyboardType']; a11y?: string; hint?: string; error?: string;
  editable?: boolean; autoComplete?: TextInputProps['autoComplete']; autoCapitalize?: TextInputProps['autoCapitalize'];
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <View style={s.field}>
    <Text style={s.fieldLabel}>{label}</Text>
    <View style={[s.inputWrap, focused && s.inputFocused, error && { borderColor: C.danger }]}>
      <TextInput style={s.input} value={value} onChangeText={onChangeText} secureTextEntry={secure && !visible}
        keyboardType={keyboard || 'default'} autoCapitalize={autoCapitalize} autoComplete={autoComplete} autoCorrect={false}
        editable={editable} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        accessibilityLabel={a11y || label} accessibilityHint={error || hint} />
      {secure && <Pressable onPress={() => setVisible((v) => !v)} disabled={!editable} accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} style={{ paddingHorizontal: 12, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: C.brand, fontWeight: '600' }}>{visible ? 'Hide' : 'Show'}</Text></Pressable>}
    </View>
    {error ? <Text style={[T.meta, { color: C.danger, marginTop: 6 }]} accessibilityRole="alert">{error}</Text> : hint ? <Text style={[T.meta, { marginTop: 6 }]}>{hint}</Text> : null}
  </View>;
}

export function StatusBadge({ tone, text }: { tone: 'ok' | 'warn' | 'bad' | 'info'; text: string }) {
  const bg = tone === 'ok' ? C.successBg : tone === 'warn' ? C.warningBg : tone === 'bad' ? C.dangerBg : C.brandSoft;
  const fg = tone === 'ok' ? C.success : tone === 'warn' ? C.warning : tone === 'bad' ? C.danger : C.hero;
  const glyph = tone === 'ok' ? '✓' : tone === 'info' ? '●' : '!';
  return (
    <View style={[s.badge, { backgroundColor: bg }]} accessibilityLabel={text}>
      <Text style={[s.badgeText, { color: fg }]}>{`${glyph}  ${text}`}</Text>
    </View>
  );
}

export function Card({ children, flush }: { children: React.ReactNode; flush?: boolean }) {
  return <View style={[s.card, flush && s.cardFlush]}>{children}</View>;
}

export function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, bold && s.rowBold]}>{value}</Text>
    </View>
  );
}

// A ledger row inside a Card: two-line text left, tabular value right,
// hairline separators, chevron only when tappable.
export function LedgerRow({ title, sub, value, tone, onPress, last }: {
  title: string; sub?: string; value?: string; tone?: 'ok' | 'warn' | 'bad' | 'info';
  onPress?: () => void; last?: boolean;
}) {
  const color = tone === 'ok' ? C.success : tone === 'warn' ? C.warning : tone === 'bad' ? C.danger : C.ink;
  const body = (
    <View style={[s.ledger, !last && s.ledgerDiv]}>
      <View style={s.ledgerMain}>
        <Text style={s.ledgerTitle}>{title}</Text>
        {sub ? <Text style={T.meta}>{sub}</Text> : null}
      </View>
      {value ? <Text style={[s.ledgerValue, { color }]}>{value}</Text> : null}
      {onPress ? <Text style={s.chev}>›</Text> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable style={({ pressed }) => pressed && s.dimmed} onPress={onPress} accessibilityRole="button" accessibilityLabel={[title, sub, value].filter(Boolean).join(", ")}>
      {body}
    </Pressable>
  );
}

// Vertical journey: a left rail connects nodes so patients see where they
// are in a multi-step process (discharge, coverage chain).
export function Stepper({ steps }: {
  steps: Array<{ title: string; sub?: string; state: 'done' | 'now' | 'todo' }>;
}) {
  return (
    <View>
      {steps.map((st, i) => {
        const last = i === steps.length - 1;
        return (
          <View key={i} style={s.stepRow} accessible accessibilityLabel={`${st.title}, ${st.state === 'done' ? 'done' : st.state === 'now' ? 'in progress' : 'upcoming'}`}>
            <View style={s.rail}>
              <View style={[s.node, st.state === 'done' && s.nodeDone, st.state === 'now' && s.nodeNow]}>
                <Text style={[s.nodeText, (st.state === 'done' || st.state === 'now') && s.nodeTextLight]}>
                  {st.state === 'done' ? '✓' : st.state === 'now' ? '●' : `${i + 1}`}
                </Text>
              </View>
              {!last && <View style={[s.link, st.state === 'done' && s.linkDone]} />}
            </View>
            <View style={s.stepBody}>
              <Text style={[s.stepTitle, st.state === 'todo' && s.stepTodo]}>{st.title}</Text>
              {st.sub ? <Text style={T.meta}>{st.sub}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function ConfirmationModal({ visible, title, detail, confirmLabel, onConfirm, onCancel, busy }: {
  visible: boolean; title: string; detail: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
      <View style={s.modalWrap}>
        <ScrollView style={s.modal} contentContainerStyle={{ padding: 22 }} accessibilityViewIsModal>
          <Text style={T.title}>{title}</Text>
          <Text style={[T.body, { color: C.secondary, marginTop: 8 }]}>{detail}</Text>
          <View style={s.modalBtns}>
            <SecondaryButton title="Go back" onPress={onCancel} disabled={busy} />
            <PrimaryButton title={busy ? 'Working…' : confirmLabel} onPress={onConfirm} disabled={busy} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function Expandable({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.expand}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${title}, ${open ? 'collapse' : 'expand'}`}>
        <View style={s.expandHead}>
          <View style={s.expandMain}>
            <Text style={T.section}>{title}</Text>
            <Text style={[T.meta, { marginTop: 2 }]}>{subtitle}</Text>
          </View>
          <Text style={s.expandGlyph}>{open ? '−' : '+'}</Text>
        </View>
      </Pressable>
      {open && <View style={s.expandBody}>{children}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', backgroundColor: C.paper },
  hero: { backgroundColor: C.hero, borderRadius: Radius.surface, padding: 20, marginTop: 8, marginBottom: 16 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  heroBtn: { flexGrow: 1, flexBasis: 130, borderRadius: Radius.control, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  heroBtnSolid: { backgroundColor: '#FFFFFF' },
  heroBtnGhost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.65)' },
  heroBtnText: { textAlign: 'center', color: C.hero, fontSize: 15, fontWeight: '700' },
  heroBtnGhostText: { color: '#FFFFFF' },
  dimmed: { opacity: 0.55 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  centerText: { textAlign: 'center' },
  emptyGlyph: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  emptyGlyphText: { fontSize: 26, color: C.brand },
  sectionHeader: { marginTop: 24, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  card: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: Radius.surface, padding: 18, marginBottom: 12 },
  cardFlush: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7, gap: 12 },
  rowLabel: { fontSize: 14, color: C.secondary, flex: 1, minWidth: 0 },
  rowValue: { flexShrink: 1, maxWidth: '55%', textAlign: 'right', fontSize: 15, color: C.ink, fontVariant: ['tabular-nums'] },
  rowBold: { fontWeight: '800', fontSize: 16 },
  ledger: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 18 },
  ledgerDiv: { borderBottomWidth: 1, borderBottomColor: C.border },
  ledgerMain: { flex: 1, paddingRight: 10 },
  ledgerTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  ledgerValue: { flexShrink: 1, maxWidth: '48%', textAlign: 'right', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chev: { fontSize: 20, color: C.faint, marginLeft: 8, fontWeight: '600' },
  badge: { borderRadius: Radius.badge, maxWidth: '100%', paddingHorizontal: 13, paddingVertical: 7, alignSelf: 'flex-start' },
  badgeText: { fontSize: 13, fontWeight: '700' },
  primaryBtn: { backgroundColor: C.brand, borderRadius: Radius.control, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', marginTop: 12, minHeight: 54, justifyContent: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { borderColor: C.border, borderWidth: 1, backgroundColor: C.surface, borderRadius: Radius.control, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', marginTop: 12, minHeight: 54, justifyContent: 'center' },
  secondaryBtnText: { color: C.ink, fontSize: 15, fontWeight: '600' },
  seg: { flexDirection: 'row', backgroundColor: '#E6EBF3', borderRadius: Radius.control, padding: 4, marginBottom: 18 },
  segOpt: { flex: 1, borderRadius: 11, paddingVertical: 11, alignItems: 'center' },
  segOptActive: { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  segText: { fontSize: 14, fontWeight: '600', color: C.secondary },
  segTextActive: { color: C.ink, fontWeight: '700' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 7 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderColor: C.border, borderWidth: 1.5, borderRadius: Radius.control },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 15, paddingVertical: 13, fontSize: 16, color: C.ink, minHeight: 54 },
  inputFocused: { borderColor: C.brand },
  modalWrap: { flex: 1, backgroundColor: 'rgba(16,30,51,0.5)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  modal: { backgroundColor: C.surface, borderRadius: Radius.surface, width: '100%', maxWidth: 480, maxHeight: '90%', flexGrow: 0 },
  modalBtns: { flexDirection: 'column', justifyContent: 'flex-end', gap: 6, marginTop: 10 },
  stepRow: { flexDirection: 'row' },
  rail: { width: 30, alignItems: 'center' },
  node: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E6EBF3', alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: C.success },
  nodeNow: { backgroundColor: C.brand },
  nodeText: { fontSize: 12, fontWeight: '800', color: C.secondary },
  nodeTextLight: { color: '#FFFFFF' },
  link: { width: 2.5, flex: 1, minHeight: 22, backgroundColor: '#E6EBF3', borderRadius: 2, marginVertical: 3 },
  linkDone: { backgroundColor: C.success },
  stepBody: { flex: 1, paddingBottom: 20, paddingLeft: 8 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  stepTodo: { color: C.secondary, fontWeight: '600' },
  expand: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: Radius.surface, padding: 18, marginBottom: 12 },
  expandHead: { flexDirection: 'row', alignItems: 'center' },
  expandMain: { flex: 1, paddingRight: 10 },
  expandGlyph: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.brandSoft, color: C.brand, fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  expandBody: { marginTop: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 }
});
