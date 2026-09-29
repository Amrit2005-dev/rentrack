import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { AuthHero, BrandLockup } from '@/components/brand/AuthHero';
import {
  AppText,
  Button,
  InlineError,
  Notice,
  PillTabs,
  TextField,
} from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { isGoogleConfigured } from '@/features/auth/useGoogleSignIn';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const t = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  /*
   * Two ways in, and only one of them the server can answer today. Email and
   * password is POST /auth/login, which exists. The phone tab is the client
   * half of OTP sign-in: it posts to /auth/request-otp, which this API version
   * does not have, so it surfaces the 404 as a plain message rather than
   * pretending the code is on its way.
   */
  const [method, setMethod] = useState('email');
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState();
  const [sendingOtp, setSendingOtp] = useState(false);
  // Prefilled when the verify screen sends an email sign-in back for a new code.
  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const [email, setEmail] = useState(pendingEmail ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState();
  const [passwordError, setPasswordError] = useState();
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    let valid = true;
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Enter a valid email address');
      valid = false;
    } else {
      setEmailError(undefined);
    }

    if (!password) {
      setPasswordError('Enter your password');
      valid = false;
    } else {
      setPasswordError(undefined);
    }

    if (!valid) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.push('/(auth)/verify');
    } catch (error) {
      setSubmitError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const sendOtp = async () => {
    // Ten digits, no prefix rule: the 6-9 restriction is an Indian-mobile
    // convention, and enforcing it here turned away numbers the operator had
    // every reason to try. Whether a code can actually be sent is the server's
    // call, not a regex's.
    if (!/^\d{10}$/.test(mobile.trim())) {
      setMobileError('Enter a 10-digit mobile number');
      return;
    }
    setMobileError(undefined);
    setSubmitError(null);
    setSendingOtp(true);
    try {
      await requestOtp(mobile.trim());
      router.push('/(auth)/verify');
    } catch (error) {
      setSubmitError(error);
    } finally {
      setSendingOtp(false);
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
        <AuthHero height={320}>
          <BrandLockup />
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
                name="lock-closed-outline"
                size={26}
                color={t.accent.primaryDark}
              />
            </View>
            <AppText variant="title">Login</AppText>
            <AppText variant="body" tone="muted">
              {method === 'email'
                ? 'Enter your credentials to continue'
                : 'We will send a code to your mobile'}
            </AppText>
          </View>

          <PillTabs
            items={[
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
            ]}
            value={method}
            onChange={(next) => {
              setMethod(next);
              setSubmitError(null);
            }}
          />

          <InlineError error={submitError} />

          {method === 'phone' ? (
            <>
              <TextField
                label="Mobile Number"
                required
                value={mobile}
                onChangeText={(next) => {
                  setMobile(next.replace(/\D/g, '').slice(0, 10));
                  if (mobileError) setMobileError(undefined);
                }}
                placeholder="98765 43210"
                icon="call-outline"
                keyboardType="number-pad"
                error={mobileError}
                onSubmitEditing={sendOtp}
                returnKeyType="go"
              />

              <Button
                label="Send Code"
                iconRight="arrow-forward"
                loading={sendingOtp}
                onPress={sendOtp}
              />

              <Notice icon="information-circle-outline" tone="warning">
                Phone sign-in needs an OTP endpoint this API version does not have yet, so
                sending a code will report that it is unavailable.
              </Notice>
            </>
          ) : (
            <>
              <TextField
                label="Email Address"
                required
                value={email}
                onChangeText={(next) => {
                  setEmail(next);
                  if (emailError) setEmailError(undefined);
                }}
                placeholder="you@company.com"
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                error={emailError}
                autoFocus
              />

              <View>
                <TextField
                  label="Password"
                  required
                  value={password}
                  onChangeText={(next) => {
                    setPassword(next);
                    if (passwordError) setPasswordError(undefined);
                  }}
                  placeholder="Enter your password"
                  icon="key-outline"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  error={passwordError}
                  onSubmitEditing={submit}
                  returnKeyType="go"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={10}
                  style={{ position: 'absolute', right: 14, top: 40 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={t.color.faint}
                  />
                </Pressable>
              </View>

              <Button
                label="Login"
                iconRight="arrow-forward"
                loading={submitting}
                onPress={submit}
              />
            </>
          )}

          {/* Only rendered when a client id for this platform was built in:
              the hook inside throws without one, and it cannot be skipped
              conditionally, so the guard has to be on the component. */}
          {isGoogleConfigured ? <GoogleSignInButton /> : null}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 4,
              marginTop: 2,
            }}
          >
            <AppText variant="body" tone="muted">
              Don&apos;t have an account?
            </AppText>
            <Link href="/(auth)/register" asChild>
              <Pressable accessibilityRole="link">
                <AppText variant="bodyStrong" tone="accent">
                  Register
                </AppText>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
