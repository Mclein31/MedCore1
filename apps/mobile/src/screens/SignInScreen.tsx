import { IsoDate, Mrn, SixDigitCode } from '@medcore/domain';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_FACILITY_CODE } from '../config';
import { api, errorMessage } from '../lib/api';
import type { CodeIdentity } from '../lib/apiClient';
import { useSession } from '../lib/session';
import { Button, Choice, Field, Notice } from '../ui/kit';
import { C, S, T } from '../ui/theme';

type Mode = 'REGISTER' | 'LOGIN';

/**
 * Patients prove who they are with a 6-digit code emailed to the address the
 * hospital recorded at admission. The app never asks where to send it.
 */
export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [mode, setMode] = useState<Mode>('REGISTER');
  const [facilityCode, setFacilityCode] = useState(DEFAULT_FACILITY_CODE);
  const [showFacility, setShowFacility] = useState(false);
  const [email, setEmail] = useState('');
  const [mrn, setMrn] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sentTo, setSentTo] = useState<CodeIdentity | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const identity: CodeIdentity =
    mode === 'LOGIN'
      ? { purpose: 'LOGIN', facilityCode: facilityCode.trim(), email: email.trim() }
      : {
          purpose: 'REGISTER',
          facilityCode: facilityCode.trim(),
          mrn: mrn.trim().toUpperCase(),
          dateOfBirth,
        };
  const detailsValid =
    mode === 'LOGIN'
      ? /^\S+@\S+\.\S+$/.test(email.trim())
      : Mrn.safeParse(mrn).success && IsoDate.safeParse(dateOfBirth).success;

  const request = async (target: CodeIdentity) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.requestCode(target);
      setSentTo(target);
      setNotice(result.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    try {
      await session.verify(sentTo, code);
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 28,
          gap: S.xl,
        }}
      >
        <View style={{ alignItems: 'center', paddingVertical: S.md }}>
          <Image
            source={require('../../assets/MedCore_Badge_Logo.png')}
            style={{ width: 110, height: 104 }}
            resizeMode="contain"
            accessibilityLabel="MedCore"
          />
        </View>

        <View style={{ gap: S.lg }}>
          {session.expired && !sentTo ? (
            <Notice tone="info">Your session ended. Please sign in again.</Notice>
          ) : null}
          {!sentTo ? (
            <>
              <View style={{ gap: 6 }}>
                <Text
                  accessibilityRole="header"
                  style={{ fontSize: 24, lineHeight: 30, fontWeight: '700', color: C.ink }}
                >
                  Sign in to your account
                </Text>
                <Text style={[T.body, { color: C.secondary }]}>
                  See your hospital bill, coverage and exit pass.
                </Text>
              </View>
              <Choice
                label="Have you used MedCore before?"
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setError(null);
                }}
                options={[
                  { value: 'REGISTER', label: 'First time' },
                  { value: 'LOGIN', label: 'Returning' },
                ]}
              />
              {error ? <Notice>{error}</Notice> : null}
              {mode === 'REGISTER' ? (
                <>
                  <Text style={T.meta}>
                    Use the record number on your admission slip or wristband. We email a code to the address
                    the hospital has on file.
                  </Text>
                  <Field
                    label="Hospital record number (MRN)"
                    value={mrn}
                    onChangeText={setMrn}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={32}
                  />
                  <Field
                    label="Patient’s date of birth"
                    hint="Year-month-day, for example 1958-03-21"
                    value={dateOfBirth}
                    onChangeText={(v) => setDateOfBirth(formatDateInput(v))}
                    keyboardType="number-pad"
                    placeholder="YYYY-MM-DD"
                    maxLength={10}
                  />
                </>
              ) : (
                <Field
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  maxLength={254}
                />
              )}
              {showFacility ? (
                <Field
                  label="Hospital code"
                  value={facilityCode}
                  onChangeText={(v) => setFacilityCode(v.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={32}
                />
              ) : (
                <Pressable
                  onPress={() => setShowFacility(true)}
                  accessibilityRole="button"
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={[T.meta, { color: C.brandDark }]}>Different hospital?</Text>
                </Pressable>
              )}
              <Button
                title="Email me a code"
                busy={busy}
                disabled={!detailsValid}
                onPress={() => request(identity)}
              />
            </>
          ) : (
            <>
              <Text
                accessibilityRole="header"
                style={{ fontSize: 24, lineHeight: 30, fontWeight: '700', color: C.ink }}
              >
                Check your email
              </Text>
              <Text style={T.meta}>
                {notice ?? 'If the details match the hospital’s records, a 6-digit code is on its way.'} It
                expires in 10 minutes.
              </Text>
              {error ? <Notice>{error}</Notice> : null}
              <Field
                label="6-digit code"
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                style={{ letterSpacing: 8, fontSize: 22, fontVariant: ['tabular-nums'] }}
              />
              <Button
                title="Sign in"
                busy={busy}
                disabled={!SixDigitCode.safeParse(code).success}
                onPress={verify}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Button
                  title="Send a new code"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => request(sentTo)}
                />
                <Button
                  title="Change details"
                  variant="ghost"
                  onPress={() => {
                    setSentTo(null);
                    setCode('');
                    setError(null);
                  }}
                />
              </View>
              <Text style={T.small}>
                No email? The billing desk can add or correct it after checking your ID.
              </Text>
            </>
          )}
        </View>
        <Text style={[T.small, { textAlign: 'center' }]}>
          Hospital staff will never ask you for this code.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Insert the hyphens of YYYY-MM-DD as the patient types digits. */
function formatDateInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}
