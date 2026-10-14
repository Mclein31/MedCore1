import { ModalOverlay } from './ModalOverlay';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TextInputProps } from 'react-native';

import { C, Radius } from './theme';
export { C, Spacing, Radius } from './theme';
import { Icon } from './icons';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const T = StyleSheet.create({
  display: { fontSize: 34, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'], letterSpacing: -0.8 },
  heroFigure: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  heroEyebrow: { fontSize: 14, fontWeight: '600', color: C.heroSub },
  heroSub: { fontSize: 14, color: C.heroSub, marginTop: 4 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: C.ink, letterSpacing: -0.2 },
  section: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: C.ink },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: C.ink },
  body: { fontSize: 16, color: C.ink, lineHeight: 23 },
  meta: { fontSize: 13, color: C.secondary, lineHeight: 19 },
  eyebrow: { fontSize: 12, fontWeight: '500', color: C.secondary },
  numeral: { fontVariant: ['tabular-nums'] }
});

export function Screen({ children, safeTop = false, safeBottom = true, keyboard = false, keyboardOffset = 0, gutter = 22, background = C.surface, topSpacing = 8 }: {
  children: React.ReactNode; safeTop?: boolean; safeBottom?: boolean; keyboard?: boolean; keyboardOffset?: number; gutter?: number; background?: string; topSpacing?: number;
}) {
  const insets = useSafeAreaInsets();
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: background }} enabled={keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardOffset}>
    <View style={[s.screen, { paddingTop: (safeTop ? insets.top : 0) + topSpacing, paddingBottom: safeBottom ? insets.bottom : 0, backgroundColor: background, paddingLeft: Math.max(gutter, insets.left), paddingRight: Math.max(gutter, insets.right) }]}>{children}</View>
  </KeyboardAvoidingView>;
}

export function RefreshNotice({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) return null;
  return <View style={{ backgroundColor: C.warningBg, borderRadius: Radius.control, padding: 12, marginVertical: 8 }}>
    <Text style={[T.meta, { color: C.warning }]} accessibilityRole="alert">{error} Previously loaded information may be out of date.</Text>
    <Pressable onPress={onRetry} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: C.ink, fontWeight: '700' }}>Retry refresh</Text></Pressable>
  </View>;
}

// Shared solid-green financial summary. Its actions stay separate from values.
export function Hero({ eyebrow, figure, sub, children, trailing, amountLabel, onPress, a11y, minHeight = 153 }: {
  eyebrow: string; figure: string; sub?: string; children?: React.ReactNode; trailing?: React.ReactNode;
  amountLabel?: string; onPress?: () => void; a11y?: string; minHeight?: number;
}) {
  const heading = <>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={[T.cardTitle, { color: C.surface, flex: 1 }]}>{eyebrow}</Text>{trailing}</View>
    {amountLabel && <Text style={[T.meta, { color: C.surface, marginTop: 16 }]}>{amountLabel}</Text>}
    <Text style={[T.heroFigure, { lineHeight: 40, marginTop: 4 }]} accessibilityRole="header">{figure}</Text>
    {sub ? <Text style={[T.heroSub, { color: C.surface }]}>{sub}</Text> : null}
  </>;
  return (
    <View testID="financial-summary" style={[s.hero, { minHeight }]}>
      {onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>{heading}</Pressable> : heading}
      {children ? <View style={s.heroActions}>{children}</View> : null}
    </View>
  );
}

export function HeroBtn({ title, onPress, ghost, disabled, a11y }: {
  title: string; onPress: () => void; ghost?: boolean; disabled?: boolean; a11y?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.heroBtn, ghost ? s.heroBtnGhost : s.heroBtnSolid, disabled && s.dimmed, pressed && !disabled && (ghost ? s.heroBtnGhostPressed : s.heroBtnSolidPressed)]}
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

export function SectionHeader({ title, action, subtle = false, topSpacing = 24 }: { title: string; action?: React.ReactNode; subtle?: boolean; topSpacing?: number }) {
  return (
    <View style={[s.sectionHeader, { marginTop: topSpacing }]}>
      <Text accessibilityRole="header" style={[T.section, subtle && { fontSize: 14, fontWeight: '400', color: C.faint }]}>{title}</Text>
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

export function PrimaryButton({ title, onPress, disabled, a11y, compact = false, minHeight = 50 }: { title: string; onPress: () => void; disabled?: boolean; a11y?: string; compact?: boolean; minHeight?: number }) {
  const reduced = useReducedMotion();
  return (
    <Pressable
      style={({ pressed }) => [s.primaryBtn, { minHeight }, compact && { borderRadius: Radius.control }, disabled && s.dimmed, pressed && !disabled && s.primaryPressed, pressed && !reduced && { transform: [{ scale: 0.98 }] }]}
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
  const reduced = useReducedMotion();
  return (
    <Pressable style={({ pressed }) => [s.secondaryBtn, disabled && s.dimmed, pressed && !disabled && s.secondaryPressed, pressed && !reduced && { transform: [{ scale: 0.98 }] }]} disabled={disabled} accessibilityState={{ disabled: !!disabled }} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <Text style={s.secondaryBtnText}>{title}</Text>
    </Pressable>
  );
}

// Compact secondary actions share geometry, semantic color and press feedback.
export function ActionButton({ title, onPress, icon, tone = 'brand', a11y, stretch = false }: {
  title: string; onPress: () => void; icon: React.ReactNode; tone?: 'brand' | 'blue'; a11y?: string; stretch?: boolean;
}) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y || title}
    style={({ pressed }) => [s.actionButton, { backgroundColor: tone === 'blue' ? C.blueSoft : C.brandSoft, borderColor: tone === 'blue' ? C.blueBorder : C.brandBorder }, stretch && { flex: 1 }, pressed && { opacity: 0.65 }]}>
    {icon}<Text style={{ flexShrink: 1, textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '600', color: tone === 'blue' ? C.blueDark : C.brandDark }}>{title}</Text>
  </Pressable>;
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
            accessibilityState={{ selected: active, disabled: !!disabled }}
            accessibilityLabel={o.label}
          >
            <Text style={[s.segText, active && s.segTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, value, onChangeText, secure, secureLabel = 'password', keyboard, a11y, hint, error, editable = true, inputRef, hideLabel = false, placeholder, trailingIcon, autoComplete, autoCapitalize = 'none' }: {
  label: string; value: string; onChangeText: (t: string) => void; secure?: boolean; secureLabel?: string;
  keyboard?: TextInputProps['keyboardType']; a11y?: string; hint?: string; error?: string;
  editable?: boolean; hideLabel?: boolean; placeholder?: string; trailingIcon?: string; inputRef?: React.Ref<TextInput>; autoComplete?: TextInputProps['autoComplete']; autoCapitalize?: TextInputProps['autoCapitalize'];
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <View style={s.field}>
    {!hideLabel && <Text style={s.fieldLabel}>{label}</Text>}
    <View style={[s.inputWrap, trailingIcon && { borderColor: C.border }, focused && s.inputFocused, error && { borderColor: C.danger }]}>
      <TextInput ref={inputRef} style={s.input} value={value} onChangeText={onChangeText} secureTextEntry={secure && !visible}
        keyboardType={keyboard || 'default'} autoCapitalize={autoCapitalize} autoComplete={autoComplete} autoCorrect={false}
        editable={editable} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder} placeholderTextColor={C.faint} accessibilityLabel={a11y || label} accessibilityHint={error || hint} />
      {secure && <Pressable onPress={() => setVisible((v) => !v)} disabled={!editable} accessibilityRole="button" accessibilityLabel={visible ? `Hide ${secureLabel}` : `Show ${secureLabel}`} style={{ paddingHorizontal: 12, minHeight: 48, justifyContent: 'center' }}><Icon name={visible ? "eye" : "eyeOff"} size={20} color={C.secondary} /></Pressable>}
      {!secure && trailingIcon && <View accessible={false} style={{ paddingHorizontal: 14 }}><Icon name={trailingIcon} size={20} color={C.secondary} /></View>}
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
export function LedgerRow({ title, sub, value, tone, onPress, last, icon, textSize = 14 }: {
  title: string; sub?: string; value?: string; tone?: 'ok' | 'warn' | 'bad' | 'info';
  onPress?: () => void; last?: boolean; icon?: string; textSize?: number;
}) {
  const color = tone === 'ok' ? C.success : tone === 'warn' ? C.warning : tone === 'bad' ? C.danger : C.ink;
  const body = (
    <View style={[s.ledger, !last && s.ledgerDiv]}>
      {icon && <View accessible={false} style={{ width: 26, marginRight: 10 }}><Icon name={icon} size={20} color={C.secondary} /></View>}
      <View style={s.ledgerMain}>
        <Text style={[s.ledgerTitle, { fontSize: textSize }]}>{title}</Text>
        {sub ? <Text style={T.meta}>{sub}</Text> : null}
      </View>
      {value ? <Text style={[s.ledgerValue, { color }]}>{value}</Text> : null}
      {onPress ? <Icon name="chevron" size={17} color={C.faint} /> : null}
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
  const insets = useSafeAreaInsets();
  return (
    <ModalOverlay visible={visible} onRequestClose={() => { if (!busy) onCancel(); }} panelStyle={s.modal}>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 22, paddingBottom: 22 + insets.bottom }} accessibilityViewIsModal>
          <View accessible={false} style={{ width: 126, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={[T.title, { fontSize: 20, textAlign: 'center' }]}>{title}</Text>
          <Text style={[T.body, { fontSize: 16, lineHeight: 24, color: C.secondary, textAlign: 'center', marginTop: 12 }]}>{detail}</Text>
          <View style={s.modalBtns}>
            <View style={{ flex: 1 }}><SecondaryButton title="Cancel" onPress={onCancel} disabled={busy} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title={busy ? 'Working…' : confirmLabel} onPress={onConfirm} disabled={busy} /></View>
          </View>
        </ScrollView>
    </ModalOverlay>
  );
}

export function Expandable({ title, subtitle, children, inset = false }: { title: string; subtitle: string; children: React.ReactNode; inset?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[s.expand, inset && s.expandInset]}>
      <Pressable style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.65 : 1 })} onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${title}, ${open ? 'collapse' : 'expand'}`}>
        <View style={s.expandHead}>
          <View style={s.expandMain}>
            <Text accessibilityRole="header" style={T.cardTitle}>{title}</Text>
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
  screen: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hero: { backgroundColor: C.brand, borderRadius: Radius.summary, padding: 20 },
  heroActions: { gap: 10, marginTop: 24, flexGrow: 1, justifyContent: 'flex-end' },
  heroBtn: { width: '100%', borderRadius: Radius.pill, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  heroBtnSolid: { backgroundColor: '#FFFFFF' },
  heroBtnSolidPressed: { backgroundColor: C.brandSoft },
  heroBtnGhost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.65)' },
  heroBtnGhostPressed: { backgroundColor: 'rgba(255,255,255,0.16)' },
  heroBtnText: { textAlign: 'center', color: C.hero, fontSize: 15, fontWeight: '700' },
  heroBtnGhostText: { color: '#FFFFFF' },
  dimmed: { opacity: 0.55 },
  primaryPressed: { backgroundColor: C.brandDark },
  secondaryPressed: { backgroundColor: C.elevated, borderColor: C.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  centerText: { textAlign: 'center' },
  emptyGlyph: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  emptyGlyphText: { fontSize: 26, color: C.brand },
  sectionHeader: { marginTop: 24, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  card: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: Radius.surface, padding: 16, marginBottom: 12 },
  cardFlush: { padding: 0, borderWidth: 0, borderRadius: Radius.surface },
  row: { minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rowLabel: { fontSize: 14, color: C.secondary, flex: 1, minWidth: 0 },
  rowValue: { flexShrink: 1, maxWidth: '55%', textAlign: 'right', fontSize: 15, color: C.ink, fontVariant: ['tabular-nums'] },
  rowBold: { fontWeight: '800', fontSize: 16 },
  ledger: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, gap: 2 },
  ledgerDiv: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  ledgerMain: { flex: 1, paddingRight: 10 },
  ledgerTitle: { fontSize: 14, fontWeight: '400', color: C.ink },
  ledgerValue: { flexShrink: 1, maxWidth: '48%', textAlign: 'right', fontSize: 14, fontWeight: '500', fontVariant: ['tabular-nums'] },
  chev: { fontSize: 20, color: C.faint, marginLeft: 8, fontWeight: '600' },
  badge: { borderRadius: Radius.badge, maxWidth: '100%', paddingHorizontal: 13, paddingVertical: 7, alignSelf: 'flex-start' },
  badgeText: { fontSize: 13, fontWeight: '700' },
  primaryBtn: { backgroundColor: C.brand, borderRadius: Radius.pill, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', marginTop: 12, minHeight: 50, justifyContent: 'center' },
  primaryBtnText: { textAlign: 'center', color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  secondaryBtn: { borderColor: C.border, borderWidth: 1, backgroundColor: C.surface, borderRadius: Radius.pill, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', marginTop: 12, minHeight: 50, justifyContent: 'center' },
  secondaryBtnText: { textAlign: 'center', color: C.ink, fontSize: 17, fontWeight: '600' },
  actionButton: { minHeight: 48, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: Radius.control },
  seg: { flexDirection: 'row', backgroundColor: C.elevated, borderRadius: Radius.control, padding: 4, marginBottom: 18 },
  segOpt: { minHeight: 48, justifyContent: 'center', flex: 1, borderRadius: 11, paddingVertical: 11, alignItems: 'center' },
  segOptActive: { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  segText: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: C.secondary },
  segTextActive: { color: C.ink, fontWeight: '700' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '500', color: C.ink, marginBottom: 7 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderColor: C.inputBorder, borderWidth: 1, borderRadius: Radius.control },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: C.ink, minHeight: 50 },
  inputFocused: { borderColor: C.brand },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet, width: '100%', maxWidth: 560, maxHeight: '85%', flexGrow: 0 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 18 },
  stepRow: { flexDirection: 'row' },
  rail: { width: 30, alignItems: 'center' },
  node: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: C.success },
  nodeNow: { backgroundColor: C.brand },
  nodeText: { fontSize: 12, fontWeight: '800', color: C.secondary },
  nodeTextLight: { color: '#FFFFFF' },
  link: { width: 2.5, flex: 1, minHeight: 22, backgroundColor: C.elevated, borderRadius: 2, marginVertical: 3 },
  linkDone: { backgroundColor: C.success },
  stepBody: { flex: 1, paddingBottom: 20, paddingLeft: 8 },
  stepTitle: { fontSize: 16, fontWeight: '600', color: C.ink },
  stepTodo: { color: C.secondary, fontWeight: '600' },
  expand: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: Radius.surface, padding: 16, marginBottom: 12 },
  expandInset: { borderWidth: 0, borderRadius: 0, padding: 0, paddingVertical: 8, marginBottom: 0 },
  expandHead: { flexDirection: 'row', alignItems: 'center' },
  expandMain: { flex: 1, paddingRight: 10 },
  expandGlyph: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.brandSoft, color: C.brand, fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  expandBody: { marginTop: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 }
});
