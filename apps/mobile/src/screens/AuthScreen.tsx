import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { C, Field, PrimaryButton, Screen, SegControl, T } from '../components/ui';

type Mode = 'login' | 'register' | 'forgot';

export default function AuthScreen() {
  const { login, register, forgotPassword, notice } = useAuth();
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
    if (Object.values(errors).some(Boolean)) return;
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
  }
  return (
    <Screen safeTop keyboard>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 36, marginBottom: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>+</Text>
            </View>
            <Text style={[T.title, { fontSize: 22 }]}>MedCore</Text>
          </View>
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

        <Field label="Email" value={email} onChangeText={setEmail} keyboard="email-address" autoComplete="email" editable={!busy} error={submitted ? errors.email : undefined} />
        {mode !== 'forgot' && (
          <Field label="Password" value={password} onChangeText={setPassword} secure autoComplete={mode === 'register' ? 'new-password' : 'current-password'} editable={!busy} error={submitted ? errors.password : undefined} />
        )}
        {mode === 'register' && (
          <View>
            <Field label="Full name, as on admission" value={fullName} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" editable={!busy} error={submitted ? errors.fullName : undefined} />
            <Field label="MRN" value={mrn} onChangeText={setMrn} editable={!busy} error={submitted ? errors.mrn : undefined} hint="Printed on your admission slip." />
            <Field
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
