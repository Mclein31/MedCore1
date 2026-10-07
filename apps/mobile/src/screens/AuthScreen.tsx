import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Brand from '../components/Brand';
import { useAuth } from '../lib/auth';
import { C, Field, PrimaryButton, Screen, SegControl, T } from '../components/ui';

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
    <Screen safeTop keyboard>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 24, marginBottom: 28 }}>
          <Brand size={52} />
          <Text accessibilityRole="header" style={[T.display, { marginTop: 24 }]}>{mode === 'register' ? 'A clearer hospital journey' : mode === 'forgot' ? 'Let’s get you help' : 'Welcome back'}</Text>
          <Text style={[T.body, { color: C.secondary, marginTop: 12 }]}>
            {mode === 'register'
              ? 'Create your account with the MRN and contact number on your admission slip.'
              : mode === 'forgot'
                ? 'Contact the hospital billing desk for help recovering your account. Email reset is not available yet.'
                : 'See your hospital bill, coverage, and discharge status — in plain language.'}
          </Text>
        </View>

        {mode !== 'forgot' && (
          <SegControl
            options={[
              { key: 'login', label: 'Log in' },
              { key: 'register', label: 'Create account' }
            ]}
            value={mode}
            disabled={busy} onChange={(k) => changeMode(k as Mode)}
          />
        )}

        {submitted && Object.values(errors).some(Boolean) && <Text style={[T.meta, { color: C.danger, marginBottom: 12 }]} accessibilityRole="alert">Please check the highlighted fields.</Text>}
        <Field inputRef={fields.email} label="Email" value={email} onChangeText={setEmail} keyboard="email-address" autoComplete="email" editable={!busy} error={submitted ? errors.email : undefined} />
        {mode !== 'forgot' && (
          <Field inputRef={fields.password} label="Password" value={password} onChangeText={setPassword} secure autoComplete={mode === 'register' ? 'new-password' : 'current-password'} editable={!busy} error={submitted ? errors.password : undefined} />
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

        {notice && <Text style={[T.meta, { marginBottom: 12 }]} accessibilityRole="alert">{notice}</Text>}
        {error && <Text style={{ color: C.danger, marginTop: 4 }} accessibilityRole="alert">{error}</Text>}
        {info && <Text style={{ color: C.success, marginTop: 4 }}>{info}</Text>}

        <PrimaryButton
          title={busy ? 'Working…' : mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Get recovery help'}
          onPress={submit}
          disabled={busy}
        />

        {mode === 'login' ? (
          <Pressable disabled={busy} onPress={() => changeMode('forgot')} accessibilityRole="button" accessibilityLabel="Forgot password" style={{ marginTop: 8, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.brand }}>Forgot password?</Text>
          </Pressable>
        ) : (
          <Pressable disabled={busy} onPress={() => changeMode('login')} accessibilityRole="button" accessibilityLabel="Back to log in" style={{ marginTop: 8, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.brand }}>Back to log in</Text>
          </Pressable>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}
