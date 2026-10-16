import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ASSETS } from '../lib/assets';
import { useAuth, type CodeTarget } from '../lib/auth';
import { C, Field, PrimaryButton, Screen, T } from '../components/ui';

// Patients sign in with a 6-digit email code: email (or MRN + phone to link a stay) → code.
// Password sign-in stays available for hospital demo accounts.
type Mode = 'email' | 'register' | 'code' | 'password';
const RESEND_SECONDS = 30;

const COPY: Record<Mode, { title: string; body: string }> = {
  email: { title: 'Sign in to your account', body: 'Enter your email and we’ll send you a 6-digit code.' },
  register: { title: 'Link your hospital stay', body: 'Use the MRN and contact number on your admission slip. We’ll email a code to the address the hospital has on file.' },
  code: { title: 'Enter your code', body: '' },
  password: { title: 'Sign in with password', body: 'For hospital demo accounts.' }
};

export default function AuthScreen() {
  const { login, requestCode, verifyCode, notice } = useAuth();
  const scroll = useRef<ScrollView>(null);
  const fields = { email: useRef<TextInput>(null), password: useRef<TextInput>(null), mrn: useRef<TextInput>(null), contactNumber: useRef<TextInput>(null), code: useRef<TextInput>(null) };
  const [mode, setMode] = useState<Mode>('email');
  const [back, setBack] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mrn, setMrn] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [code, setCode] = useState('');
  const [target, setTarget] = useState<CodeTarget | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const locked = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const errors = {
    email: (mode !== 'email' && mode !== 'password') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? '' : 'Enter a valid email address.',
    password: mode !== 'password' || (password.length >= 6 && password.length <= 128) ? '' : 'Use a password with 6 to 128 characters.',
    mrn: mode !== 'register' || mrn.trim().length >= 2 ? '' : 'Enter the MRN printed on your admission slip.',
    contactNumber: mode !== 'register' || contactNumber.trim().length >= 4 ? '' : 'Enter the contact number registered with the hospital.',
    code: mode !== 'code' || /^\d{6}$/.test(code) ? '' : 'Enter the 6-digit code from the email.'
  };

  async function run(task: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(null); setInfo(null);
    try { await task(); } catch (e: any) {
      setError(e?.message || 'We could not complete that. Please try again.');
    } finally { locked.current = false; setBusy(false); }
  }

  async function sendCode(next: CodeTarget) {
    const res = await requestCode(next);
    if (!res.sent) { setInfo(res.message || 'Please visit the hospital billing desk for help.'); return; }
    setTarget(next);
    setSentTo(res.sentTo || (next.purpose === 'LOGIN' ? next.email.trim().toLowerCase() : null));
    setCode(''); setSubmitted(false); setResendIn(RESEND_SECONDS);
    setBack(mode === 'code' ? back : mode);
    setMode('code');
    if (res.devNote) setInfo(res.devNote);
    scroll.current?.scrollTo({ y: 0, animated: false });
    setTimeout(() => fields.code.current?.focus(), 50);
  }

  function submit(otp = code) {
    if (locked.current) return;
    setSubmitted(true);
    const invalid = (Object.keys(errors) as Array<keyof typeof errors>).find(key => key === 'code' ? !/^\d{6}$/.test(otp) && mode === 'code' : errors[key]);
    if (invalid) { fields[invalid].current?.focus(); return; }
    void run(async () => {
      if (mode === 'email') await sendCode({ purpose: 'LOGIN', email });
      else if (mode === 'register') await sendCode({ purpose: 'REGISTER', mrn, contactNumber });
      else if (mode === 'code' && target) await verifyCode(target, otp);
      else if (mode === 'password') await login(email, password);
    });
  }

  function onCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    // Submit as soon as the sixth digit lands (paste or autofill included).
    if (digits.length === 6 && code.length < 6) submit(digits);
  }

  function changeMode(next: Mode) {
    if (locked.current) return;
    setMode(next); setError(null); setInfo(null); setSubmitted(false); setCode('');
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  const copy = COPY[mode];
  const body = mode === 'code' ? `We sent a 6-digit code to ${sentTo || 'your email'}. It works once and expires in 10 minutes.` : copy.body;
  const compact = mode === 'register';
  const button = busy ? 'Working…' : mode === 'email' ? 'Email me a code' : mode === 'register' ? 'Send my code' : mode === 'code' ? 'Verify and sign in' : 'Sign in';
  const link = (label: string, onPress: () => void, align: 'center' | 'flex-end' = 'center', disabled = busy) => (
    <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 48, alignItems: align, justifyContent: 'center' }}>
      <Text style={[T.meta, { color: disabled && !busy ? C.faint : C.brand, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen safeTop keyboard gutter={28} background={C.surface}>
      <ScrollView ref={scroll} contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ height: compact ? 148 : 222, justifyContent: 'center', alignItems: 'center' }}>
          <Image source={ASSETS.brand.badge} resizeMode="contain" accessibilityLabel="MedCore" style={{ width: compact ? 94 : 128, height: compact ? 94 : 128 }} />
        </View>
        <View style={{ marginBottom: 28 }}>
          <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '600', color: C.ink }}>{copy.title}</Text>
          <Text style={[T.body, { color: C.secondary, marginTop: 8 }]}>{body}</Text>
        </View>
        {submitted && Object.values(errors).some(Boolean) && <Text style={[T.meta, { color: C.danger, marginBottom: 12 }]} accessibilityRole="alert">Please check the highlighted fields.</Text>}

        {(mode === 'email' || mode === 'password') && (
          <Field hideLabel placeholder="Email" inputRef={fields.email} label="Email" value={email} onChangeText={setEmail} keyboard="email-address" autoComplete="email" editable={!busy} error={submitted ? errors.email : undefined} />
        )}
        {mode === 'password' && (
          <Field hideLabel placeholder="Password" inputRef={fields.password} label="Password" value={password} onChangeText={setPassword} secure autoComplete="current-password" editable={!busy} error={submitted ? errors.password : undefined} />
        )}
        {mode === 'register' && (
          <View>
            <Field inputRef={fields.mrn} label="MRN" value={mrn} onChangeText={setMrn} editable={!busy} error={submitted ? errors.mrn : undefined} hint="Printed on your admission slip." />
            <Field inputRef={fields.contactNumber} label="Contact number, as registered" value={contactNumber} onChangeText={setContactNumber}
              keyboard="phone-pad" autoComplete="tel" editable={!busy} error={submitted ? errors.contactNumber : undefined} hint="Use the number on your hospital registration." />
          </View>
        )}
        {mode === 'code' && (
          <Field inputRef={fields.code} label="6-digit code" value={code} onChangeText={onCodeChange} keyboard="number-pad" autoComplete="one-time-code"
            editable={!busy} error={submitted ? errors.code : undefined} hint="Never share this code, including with hospital staff." />
        )}

        {notice && <Text style={[T.meta, { marginBottom: 12 }]} accessibilityRole="alert">{notice}</Text>}
        {error && <Text style={[T.meta, { color: C.danger, marginBottom: 8 }]} accessibilityRole="alert">{error}</Text>}
        {info && <Text style={[T.meta, { color: C.success, marginBottom: 8 }]} accessibilityRole="alert">{info}</Text>}
        <PrimaryButton compact title={button} onPress={() => submit()} disabled={busy} />

        {mode === 'code' && target && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {link(back === 'register' ? 'Change details' : 'Use a different email', () => changeMode(back))}
            {link(resendIn > 0 ? `Send a new code (${resendIn}s)` : 'Send a new code', () => void run(() => sendCode(target)), 'flex-end', busy || resendIn > 0)}
          </View>
        )}
        {mode === 'email' && link('Sign in with password instead', () => changeMode('password'))}
        {mode === 'password' && link('Email me a code instead', () => changeMode('email'))}

        <View style={{ flex: 1, minHeight: 64 }} />
        {mode !== 'code' && (
          <Pressable disabled={busy} onPress={() => changeMode(mode === 'register' ? 'email' : 'register')} accessibilityRole="button" accessibilityLabel={mode === 'register' ? 'Back to sign in' : 'Link your hospital stay'} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[T.meta, { textAlign: 'center' }]}>{mode === 'register' ? 'Already linked? ' : 'First time here? '}<Text style={{ color: C.brand, fontWeight: '600' }}>{mode === 'register' ? 'Sign in' : 'Link your hospital stay'}</Text></Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}
