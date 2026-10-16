import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradientSurface from './GradientSurface';
import { Icon } from './icons';
import { C, PrimaryButton, T } from './ui';
import { formatPeso } from '../lib/format';
import { applyAmountKey } from '../lib/amountEntry';

export default function PaymentAmountEntry({
  balance,
  mode,
  partial,
  onMode,
  onPartial,
  onContinue,
  error,
  disabled,
  onRetry,
}: {
  balance: number;
  mode: 'FULL' | 'PARTIAL';
  partial: string;
  onMode: (mode: 'FULL' | 'PARTIAL') => void;
  onPartial: (value: string) => void;
  onContinue: () => void;
  error: string | null;
  disabled: boolean;
  onRetry?: () => void;
}) {
  const [keyboard, setKeyboard] = useState(false);
  const input = useRef<TextInput>(null);
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keySize = Math.min(78, (Math.min(width, 720) - 48) / 4 - 6);
  useEffect(() => {
    if (keyboard) input.current?.focus();
  }, [keyboard]);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '.', '9', '0', 'backspace'];
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <GradientSurface style={{ height: 148 }}>
        <View
          style={{
            position: 'absolute',
            top: 24,
            left: 20,
            right: 20,
            borderRadius: 28,
            padding: 12,
            backgroundColor: 'rgba(15,42,74,0.24)',
          }}
        >
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['FULL', 'PARTIAL'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => {
                  onMode(value);
                  if (value === 'FULL') {
                    Keyboard.dismiss();
                    setKeyboard(false);
                  }
                }}
                accessibilityRole="radio"
                accessibilityLabel={value === 'FULL' ? 'Full settlement' : 'Partial amount'}
                accessibilityState={{ checked: mode === value }}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 22,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed ? 0.6 : 1,
                  backgroundColor: mode === value ? C.surface : 'transparent',
                })}
              >
                <Text style={{ fontSize: 13, color: mode === value ? C.brandDark : C.surface }}>
                  {value === 'FULL' ? 'Full settlement' : 'Partial amount'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </GradientSurface>
      <View
        style={{
          flex: 1,
          marginTop: -56,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          backgroundColor: C.surface,
          overflow: 'hidden',
        }}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 }}
        >
          <Text style={T.meta}>Current hospital balance</Text>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '600',
              color: C.ink,
              fontVariant: ['tabular-nums'],
              marginTop: 4,
            }}
          >
            {formatPeso(balance)}
          </Text>
          <View style={{ marginTop: 58, alignItems: 'center' }}>
            <Text style={T.meta}>Amount to pay</Text>
            <View
              style={{
                minHeight: 72 * fontScale,
                marginTop: 8,
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {mode === 'FULL' ? (
                <Text
                  style={{
                    fontSize: 44,
                    fontWeight: '600',
                    color: C.brandDark,
                    fontVariant: ['tabular-nums'],
                    textAlign: 'center',
                  }}
                >
                  {formatPeso(balance)}
                </Text>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 44, color: C.brandDark, flexShrink: 0 }}>₱</Text>
                  <TextInput
                    ref={input}
                    value={partial}
                    onChangeText={onPartial}
                    keyboardType="decimal-pad"
                    showSoftInputOnFocus={keyboard}
                    accessibilityLabel="Amount in pesos"
                    accessibilityHint={error || 'Enter a positive amount with up to two decimal places.'}
                    placeholder="0.00"
                    placeholderTextColor={C.brandDark}
                    autoCorrect={false}
                    style={{
                      width: Math.max(112, (Math.max(partial.length, 4) * 26 + 8) * fontScale),
                      maxWidth: '88%',
                      flexShrink: 1,
                      minHeight: 64 * fontScale,
                      fontSize: 44,
                      fontWeight: '600',
                      fontVariant: ['tabular-nums'],
                      color: C.brandDark,
                      textAlign: 'center',
                      padding: 0,
                      outlineColor: C.brand,
                    }}
                  />
                </View>
              )}
            </View>
          </View>
          {error && (
            <Text
              accessibilityRole="alert"
              style={[T.meta, { color: C.danger, textAlign: 'center', marginTop: 10 }]}
            >
              {error}
            </Text>
          )}
          {onRetry && (
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry balance refresh"
              style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={[T.meta, { color: C.brandDark }]}>Retry balance refresh</Text>
            </Pressable>
          )}
          {!keyboard && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 22 }}>
              {keys.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    if (mode === 'FULL') {
                      onMode('PARTIAL');
                      onPartial(applyAmountKey('', key));
                    } else onPartial(applyAmountKey(partial, key));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    key === 'backspace' ? 'Delete last digit' : key === '.' ? 'Decimal point' : `Digit ${key}`
                  }
                  style={({ pressed }) => ({
                    width: '25%',
                    minHeight: keySize + 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <View
                    style={{
                      width: keySize,
                      height: keySize,
                      borderRadius: keySize / 2,
                      borderWidth: 1,
                      borderColor: C.paper,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {key === 'backspace' ? (
                      <Icon name="back" size={20} color={C.secondary} />
                    ) : (
                      <Text style={{ fontSize: 20, fontWeight: '400', color: C.ink }}>{key}</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            onPress={() => {
              onMode('PARTIAL');
              if (keyboard) Keyboard.dismiss();
              setKeyboard(!keyboard);
            }}
            accessibilityRole="button"
            accessibilityLabel={keyboard ? 'Use keypad' : 'Use keyboard'}
            style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={[T.meta, { color: C.brandDark }]}>{keyboard ? 'Use keypad' : 'Use keyboard'}</Text>
          </Pressable>
        </ScrollView>
        <View
          style={{
            paddingHorizontal: 24,
            paddingBottom: Math.max(20, insets.bottom + 12),
            paddingTop: 8,
            backgroundColor: C.surface,
          }}
        >
          <PrimaryButton
            minHeight={64}
            title="Continue to payment method"
            onPress={onContinue}
            disabled={disabled}
          />
        </View>
      </View>
    </View>
  );
}
