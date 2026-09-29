import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

/**
 * Six-box OTP entry per SRS §1.2: auto-advance, backspace steps back, and a
 * pasted or SMS-autofilled code fills every box at once.
 *
 * Implemented as six inputs rather than one masked field so the boxes can show
 * focus individually, which is what the mockup draws.
 */
export function OTPInput({ length = 6, value, onChange, onComplete, error, autoFocus }) {
  const t = useTheme();
  const inputs = useRef([]);
  const [focused, setFocused] = useState(null);
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => inputs.current[0]?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);
  const setDigit = (index, raw) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;

    // Paste or autofill: spread across the boxes from here.
    if (digits.length > 1) {
      const next = (value.slice(0, index) + digits).slice(0, length);
      onChange(next);
      const landing = Math.min(next.length, length - 1);
      inputs.current[landing]?.focus();
      if (next.length === length) onComplete?.(next);
      return;
    }
    const chars = value.padEnd(length, ' ').split('');
    chars[index] = digits;
    const next = chars.join('').trimEnd();
    onChange(next);
    if (index < length - 1) inputs.current[index + 1]?.focus();
    if (next.replace(/\s/g, '').length === length) onComplete?.(next);
  };
  const onKeyPress = (index, e) => {
    if (e.nativeEvent.key !== 'Backspace') return;
    if (value[index]) {
      const chars = value.padEnd(length, ' ').split('');
      chars[index] = ' ';
      onChange(chars.join('').trimEnd());
      return;
    }
    // Empty box — step back and clear the previous one.
    if (index > 0) {
      const chars = value.padEnd(length, ' ').split('');
      chars[index - 1] = ' ';
      onChange(chars.join('').trimEnd());
      inputs.current[index - 1]?.focus();
    }
  };
  return (
    <View
      style={{
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          justifyContent: 'space-between',
        }}
      >
        {Array.from(
          {
            length,
          },
          (_, index) => {
            const digit = value[index] ?? '';
            const isFocused = focused === index;
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`OTP digit ${index + 1}`}
                onPress={() => inputs.current[index]?.focus()}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: t.radius.md,
                  borderWidth: isFocused || digit ? 2 : 1,
                  borderColor: error
                    ? t.status.dangerFg
                    : isFocused || digit
                      ? t.accent.primary
                      : t.color.line,
                  backgroundColor: t.color.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  ref={(el) => {
                    inputs.current[index] = el;
                  }}
                  value={digit.trim()}
                  onChangeText={(raw) => setDigit(index, raw)}
                  onKeyPress={(e) => onKeyPress(index, e)}
                  onFocus={() => setFocused(index)}
                  onBlur={() => setFocused(null)}
                  keyboardType="number-pad"
                  /* Lets iOS and Android offer the SMS code straight from the notification. */ textContentType="oneTimeCode"
                  autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                  maxLength={index === 0 ? length : 1}
                  selectTextOnFocus
                  style={[
                    t.type.title,
                    {
                      width: '100%',
                      height: '100%',
                      textAlign: 'center',
                      color: t.color.ink,
                      outlineStyle: 'none',
                    },
                  ]}
                />
              </Pressable>
            );
          },
        )}
      </View>

      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

/** Countdown with a resend action, per SRS §1.2. */
export function ResendTimer({ seconds = 30, onResend, resending }) {
  const t = useTheme();
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  const mmss = `00:${String(Math.max(0, left)).padStart(2, '0')}`;
  if (left > 0) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <AppText variant="caption" tone="muted">
          Resend OTP in
        </AppText>
        <AppText variant="caption" tone="accent">
          {mmss}
        </AppText>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Resend OTP"
      disabled={resending}
      onPress={() => {
        onResend();
        setLeft(seconds);
      }}
      style={{
        alignSelf: 'center',
      }}
    >
      <AppText variant="bodyStrong" tone="accent">
        {resending ? 'Sending…' : 'Resend OTP'}
      </AppText>
    </Pressable>
  );
}
