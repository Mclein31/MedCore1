import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ASSETS } from '../lib/assets';
import { useAuth } from '../lib/auth';
import { C, Field, PrimaryButton, Screen, T } from '../components/ui';

type Mode = 'login' | 'register' | 'forgot';

export default function AuthScreen() {
  const { login, register, forgotPassword, notice } = useAuth();
  const scroll = useRef<ScrollView>(null);
  const fields = { email: useRef<TextInput>(null), password: useRef<TextInput>(null), fullName: useRef<TextInput>(null), mrn: useRef<TextInput>(null), contactNumber: useRef<TextInput>(null) };
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mrn, setMrn] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function submit() {
    if (locked.current) return;
    setSubmitted(true);
    const invalid = (Object.keys(errors) as Array<keyof typeof errors>).find(key => errors[key]);
    if (invalid) { fields[invalid].current?.focus(); return; }
    locked.current = true;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register({ email, password, fullName, mrn, contactNumber });
      } else {
        const msg = await forgotPassword(email);
        setInfo(msg);
      }
    } catch (e: any) {
      setError(e?.message || 'We could not complete that. Please try again.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  const errors = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? '' : 'Enter a valid email address.',
    password: mode === 'forgot' || (password.length >= 6 && password.length <= 128) ? '' : 'Use a password with 6 to 128 characters.',
    fullName: mode !== 'register' || fullName.trim().length >= 2 ? '' : 'Enter your full name as shown on your admission slip.',
    mrn: mode !== 'register' || mrn.trim().length >= 2 ? '' : 'Enter the MRN printed on your admission slip.',
    contactNumber: mode !== 'register' || contactNumber.trim().length >= 4 ? '' : 'Enter the contact number registered with the hospital.'
  };
  function changeMode(next: Mode) {
    if (locked.current) return;
    setMode(next); setError(null); setInfo(null); setSubmitted(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  return (
    <Screen safeTop keyboard gutter={28} background={C.surface}>
      <ScrollView ref={scroll} contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ height: mode === 'register' ? 148 : 222, justifyContent: 'center', alignItems: 'center' }}>
          <Image source={ASSETS.brand.badge} resizeMode="contain" accessibilityLabel="MedCore" style={{ width: mode === 'register' ? 94 : 128, height: mode === 'register' ? 94 : 128 }} />
        </View>
        <View style={{ marginBottom: 28 }}>
          <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '600', color: C.ink }}>{mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Recover your account' : 'Sign in to your account'}</Text>
          <Text style={[T.body, { color: C.secondary, marginTop: 8 }]}>{mode === 'register' ? 'Use the details from your hospital admission slip.' : mode === 'forgot' ? 'Your hospital billing desk can help you recover access.' : 'Welcome back. Sign in to your account.'}</Text>
        </View>
        {submitted && Object.values(errors).some(Boolean) && <Text style={[T.meta, { color: C.danger, marginBottom: 12 }]} accessibilityRole="alert">Please check the highlighted fields.</Text>}
        <Field hideLabel placeholder="Email" inputRef={fields.email} label="Email" value={email} onChangeText={setEmail} keyboard="email-address" autoComplete="email" editable={!busy} error={submitted ? errors.email : undefined} />
        {mode !== 'forgot' && (
          <Field hideLabel placeholder="Password" inputRef={fields.password} label="Password" value={password} onChangeText={setPassword} secure autoComplete={mode === 'register' ? 'new-password' : 'current-password'} editable={!busy} error={submitted ? errors.password : undefined} />
        )}
        {mode === 'register' && (
          <View>
            <Field inputRef={fields.fullName} label="Full name, as on admission" value={fullName} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" editable={!busy} error={submitted ? errors.fullName : undefined} />
            <Field inputRef={fields.mrn} label="MRN" value={mrn} onChangeText={setMrn} editable={!busy} error={submitted ? errors.mrn : undefined} hint="Printed on your admission slip." />
            <Field
              inputRef={fields.contactNumber}
              label="Contact number, as registered"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboard="phone-pad" autoComplete="tel" editable={!busy} error={submitted ? errors.contactNumber : undefined}
              hint="Use the number on your hospital registration."
            />
          </View>
        )}

        {mode === 'login' && <Pressable disabled={busy} onPress={() => changeMode('forgot')} accessibilityRole="button" accessibilityLabel="Forgot password" style={{ minHeight: 48, alignItems: 'flex-end', justifyContent: 'center', marginTop: -12, marginBottom: 18 }}><Text style={[T.meta, { color: C.brand }]}>Forgot password?</Text></Pressable>}
        {notice && <Text style={[T.meta, { marginBottom: 12 }]} accessibilityRole="alert">{notice}</Text>}
        {error && <Text style={[T.meta, { color: C.danger, marginBottom: 8 }]} accessibilityRole="alert">{error}</Text>}
        {info && <Text style={[T.meta, { color: C.success, marginBottom: 8 }]} accessibilityRole="alert">{info}</Text>}
        <PrimaryButton compact title={busy ? 'Working…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Get recovery help'} onPress={submit} disabled={busy} />
        {mode === 'forgot' && <Text style={[T.meta, { textAlign: 'center', marginTop: 16 }]}>Email password reset is not available yet.</Text>}
        <View style={{ flex: 1, minHeight: 64 }} />
        <Pressable disabled={busy} onPress={() => changeMode(mode === 'login' ? 'register' : 'login')} accessibilityRole="button" accessibilityLabel={mode === 'login' ? 'Create account' : 'Back to sign in'} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={[T.meta, { textAlign: 'center' }]}>{mode === 'login' ? 'Don’t have an account? ' : mode === 'register' ? 'Already have an account? ' : ''}<Text style={{ color: C.brand, fontWeight: '600' }}>{mode === 'login' ? 'Sign up' : 'Sign in'}</Text></Text></Pressable>
      </ScrollView>
    </Screen>
  );
}
