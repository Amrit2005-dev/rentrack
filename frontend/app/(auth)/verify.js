import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AuthHero } from '@/components/brand/AuthHero';
import { AppText, Button, InlineError, OTPInput, ResendTimer } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme';

/**
 * SRS §1.2 — verify the 6-digit code. On success the root layout redirects into
 * whichever shell the returned role belongs to.
 */
export default function VerifyOtpScreen() {
  const t = useTheme();
  const mobile = useAuthStore((s) => s.pendingMobile);
  const email = useAuthStore((s) => s.pendingEmail);
  const devOtp = useAuthStore((s) => s.devOtp);
  const verifyPhone = useAuthStore((s) => s.verifyOtp);
  const verifyEmail = useAuthStore((s) => s.verifyLoginOtp);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState();
  const [submitError, setSubmitError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // Deep-linked here without going through the login screen.
  if (!mobile && !email) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.color.surface,
          padding: t.spacing.xl,
          gap: t.spacing.lg,
          justifyContent: 'center',
        }}
      >
        <AppText variant="title" align="center">
          Start again
        </AppText>
        <AppText variant="body" tone="muted" align="center">
          We need your mobile number before we can verify a code.
        </AppText>
        <Button label="Back to Login" onPress={() => router.replace('/(auth)/login')} />
      </View>
    );
  }
  const submit = async (value) => {
    const otp = (value ?? code).replace(/\s/g, '');
    if (otp.length !== 6) {
      setCodeError('Enter the 6-digit code');
      return;
    }
    setCodeError(undefined);
    setSubmitError(null);
    setVerifying(true);
    try {
      if (email) {
        await verifyEmail(otp);
      } else {
        await verifyPhone(otp);
      }
      // Root layout takes over and routes by role.
    } catch (error) {
      setSubmitError(error);
    } finally {
      setVerifying(false);
    }
  };
  const resend = async () => {
    // An email sign-in's code comes from POST /auth/login, which needs the
    // password again — and /auth/request-otp has no mobile to send to here, so
    // calling it would only 422. Back to login, where the email is kept.
    if (email) {
      router.replace('/(auth)/login');
      return;
    }
    setResending(true);
    setSubmitError(null);
    try {
      await requestOtp(mobile);
    } catch (error) {
      setSubmitError(error);
    } finally {
      setResending(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: t.color.surface,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHero height={280}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Ionicons name="arrow-back" size={22} color={t.color.ink} />
          </Pressable>
        </AuthHero>

        <View
          style={{
            flex: 1,
            marginTop: -28,
            backgroundColor: t.color.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: t.spacing.xl,
            paddingTop: t.spacing.xxl,
            paddingBottom: t.spacing.xxxl,
            gap: t.spacing.lg,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              gap: 6,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: t.accent.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={26}
                color={t.accent.primaryDark}
              />
            </View>
            <AppText variant="title">{email ? "Verify Your Email" : "Verify Your Number"}</AppText>
            <AppText variant="body" tone="muted">
              Enter the 6-digit code sent to
            </AppText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AppText variant="bodyStrong">{email ? email : `+91 ${mobile}`}</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change number"
                hitSlop={8}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Ionicons name="pencil" size={15} color={t.accent.primary} />
              </Pressable>
            </View>
            {devOtp ? (
              <AppText variant="caption" tone="accent" style={{ marginTop: 8 }}>
                Dev OTP: {devOtp}
              </AppText>
            ) : null}
          </View>

          <InlineError error={submitError} />

          <OTPInput
            value={code}
            onChange={(next) => {
              setCode(next);
              if (codeError) setCodeError(undefined);
            }}
            onComplete={(full) => void submit(full)}
            error={codeError}
            autoFocus
          />

          <ResendTimer
            seconds={30}
            onResend={() => void resend()}
            resending={resending}
          />

          <Button label="Verify" loading={verifying} onPress={() => void submit()} />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
            }}
          >
            <Ionicons name="lock-closed-outline" size={14} color={t.color.faint} />
            <AppText variant="caption" tone="faint">
              Your data is encrypted in transit
            </AppText>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
