import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { registrationsApi } from '@/api/registrations';
import { organizationsApi } from '@/api/organizations';
import { AuthHero } from '@/components/brand/AuthHero';
import {
  AppText,
  Button,
  Card,
  InlineError,
  PhoneField,
  SelectField,
  TextField,
} from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Registration flow — Option A: mobile OTP verification before the details form.
 *
 * Step 1 — Enter mobile number
 * Step 2 — Enter the 6-digit OTP sent via SMS  ← NEW
 * Step 3 — Fill in name / company details
 * Step 4 — Success / confirmation
 */

const RESEND_SECONDS = 60;

const detailsSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  companyName: z.string().trim(),
  city: z.string().trim(),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
});

const ROLE_OPTIONS = [
  {
    value: 'admin',
    label: 'Admin',
    hint: 'Request a new company or join an existing company as an admin',
  },
  {
    value: 'user',
    label: 'Driver',
    hint: 'Join an existing company and run assigned trips',
  },
];

function StepProgress({ step, total }) {
  const t = useTheme();
  return (
    <View
      style={{
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      <AppText variant="caption" tone="muted">
        Step {step} of {total}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          gap: 6,
        }}
      >
        {Array.from(
          {
            length: total,
          },
          (_, index) => (
            <View
              key={index}
              style={{
                width: 28,
                height: 4,
                borderRadius: 2,
                backgroundColor: index < step ? t.accent.primary : t.color.line,
              }}
            />
          ),
        )}
      </View>
    </View>
  );
}

export default function RegisterScreen() {
  const t = useTheme();
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState();

  // Step 2 — OTP state
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [otpError, setOtpError] = useState();
  const [verificationToken, setVerificationToken] = useState(null);
  const [role, setRole] = useState('admin');
  const [companyId, setCompanyId] = useState(null);
  const [companyError, setCompanyError] = useState();
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef(null);

  const [submitted, setSubmitted] = useState(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      companyName: '',
      city: '',
      email: '',
      password: '',
    },
  });
  const companies = useQuery({
    queryKey: ['public-registration-companies'],
    queryFn: organizationsApi.publicList,
    enabled: step === 3 && role === 'user',
  });
  const companyOptions = (companies.data ?? []).map((company) => ({
    value: company.id,
    label: company.name,
    hint: company.city ?? 'Active company',
  }));

  // ── Resend countdown timer ────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setResendCountdown(RESEND_SECONDS);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => countdownRef.current && clearInterval(countdownRef.current), []);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const sendOtp = useMutation({
    mutationFn: () => registrationsApi.sendOtp(mobile),
    onSuccess: (result) => {
      setOtp('');
      setDevOtp(result?.otp ?? null);
      setOtpError(undefined);
      startCountdown();
      setStep(2);
    },
  });

  const verifyMobile = useMutation({
    mutationFn: () => registrationsApi.verifyMobile(mobile, otp),
    onSuccess: (result) => {
      setVerificationToken(result.mobile_verification_token);
      setStep(3);
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail ?? 'Invalid OTP. Please try again.';
      setOtpError(msg);
    },
  });

  const apply = useMutation({
    mutationFn: registrationsApi.apply,
    onSuccess: (result) => {
      setSubmitted(result);
      setStep(4);
    },
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  const goBack = () => {
    if (step === 1) {
      router.replace('/(auth)/login');
      return;
    }
    // From step 4 (success) there is no back — users must use the buttons.
    if (step === 4) return;
    setStep((prev) => prev - 1);
  };

  // ── Step 1 handler ────────────────────────────────────────────────────────
  const continueFromMobile = () => {
    if (!/^\d{10}$/.test(mobile)) {
      setMobileError('Enter a 10-digit mobile number');
      return;
    }
    setMobileError(undefined);
    sendOtp.mutate();
  };

  // ── Step 2 handler ────────────────────────────────────────────────────────
  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setOtpError('Enter the 6-digit code');
      return;
    }
    setOtpError(undefined);
    verifyMobile.mutate();
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    setOtp('');
    setOtpError(undefined);
    sendOtp.mutate();
  };

  // ── Step 3 handler ────────────────────────────────────────────────────────
  const submitDetails = handleSubmit((values) => {
    const selectedCompany = (companies.data ?? []).find(
      (company) => company.id === companyId,
    );
    if (role === 'admin' && !values.companyName.trim()) {
      setCompanyError('Company name is required for an Admin registration');
      return;
    }
    if (role === 'admin' && !values.city.trim()) {
      setCompanyError('City is required for an Admin registration');
      return;
    }
    if (role === 'user' && !selectedCompany) {
      setCompanyError('Choose the company you want to join');
      return;
    }
    setCompanyError(undefined);
    apply.mutate({
      mobile_number: mobile,
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      email: values.email.trim(),
      password: values.password,
      role,
      company_id: role === 'user' ? selectedCompany.id : null,
      company_name: role === 'user' ? selectedCompany.name : values.companyName.trim(),
      city: role === 'user' ? (selectedCompany.city ?? '') : values.city.trim(),
      mobile_verification_token: verificationToken,
    });
  });

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
        <AuthHero height={step === 3 ? 220 : 260}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              onPress={goBack}
              style={{
                flex: 1,
              }}
            >
              {step < 4 && <Ionicons name="arrow-back" size={22} color={t.color.ink} />}
            </Pressable>
            <StepProgress step={step} total={4} />
          </View>
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
          {step === 1 ? (
            <>
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
                    name="phone-portrait-outline"
                    size={26}
                    color={t.accent.primaryDark}
                  />
                </View>
                <AppText variant="title">Create Your Account</AppText>
                <AppText variant="body" tone="muted" align="center">
                  Enter your mobile number to get started
                </AppText>
              </View>

              <PhoneField
                label="Mobile Number"
                required
                value={mobile}
                onChangeText={(next) => {
                  setMobile(next);
                  if (mobileError) setMobileError(undefined);
                }}
                error={mobileError}
                autoFocus
              />

              <Button
                label="Send Code"
                iconRight="arrow-forward"
                onPress={continueFromMobile}
                loading={sendOtp.isPending}
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <AppText variant="body" tone="muted">
                  Already have an account?
                </AppText>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <AppText variant="bodyStrong" tone="accent">
                    Login
                  </AppText>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <View style={{ alignItems: 'center', gap: 6 }}>
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
                    name="chatbubble-ellipses-outline"
                    size={26}
                    color={t.accent.primaryDark}
                  />
                </View>
                <AppText variant="title">Verify Your Number</AppText>
                <AppText variant="body" tone="muted" align="center">
                  We sent a 6-digit code to{' '}
                  <AppText variant="bodyStrong" tone="ink">
                    +91 {mobile}
                  </AppText>
                </AppText>
                {devOtp ? (
                  <AppText variant="caption" tone="accent">
                    Dev OTP: {devOtp}
                  </AppText>
                ) : null}
              </View>

              <InlineError error={sendOtp.error} />

              {/* 6-digit OTP input */}
              <View style={{ gap: 4 }}>
                <AppText variant="label">Verification Code *</AppText>
                <TextInput
                  accessibilityLabel="OTP code"
                  value={otp}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, '').slice(0, 6);
                    setOtp(digits);
                    if (otpError) setOtpError(undefined);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="______"
                  placeholderTextColor={t.color.placeholder}
                  style={{
                    borderWidth: 1,
                    borderColor: otpError ? t.color.danger : t.color.line,
                    borderRadius: 12,
                    paddingHorizontal: t.spacing.lg,
                    paddingVertical: t.spacing.md,
                    fontSize: 28,
                    letterSpacing: 12,
                    color: t.color.ink,
                    backgroundColor: t.color.canvas,
                    textAlign: 'center',
                  }}
                  autoFocus
                />
                {otpError ? (
                  <AppText variant="caption" tone="danger">
                    {otpError}
                  </AppText>
                ) : null}
              </View>

              <Button
                label="Verify Number"
                iconRight="checkmark"
                onPress={handleVerifyOtp}
                loading={verifyMobile.isPending}
              />

              {/* Resend row */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                <AppText variant="body" tone="muted">
                  Didn't receive it?
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleResend}
                  disabled={resendCountdown > 0 || sendOtp.isPending}
                >
                  <AppText
                    variant="bodyStrong"
                    tone={resendCountdown > 0 ? 'muted' : 'accent'}
                  >
                    {resendCountdown > 0
                      ? `Resend in ${resendCountdown}s`
                      : 'Resend Code'}
                  </AppText>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <View
                style={{
                  gap: 4,
                }}
              >
                <AppText variant="title">Tell us about you</AppText>
                <AppText variant="body" tone="muted">
                  If your company is already on MoveXpress your request goes to its admin,
                  otherwise to the Super Admin.
                </AppText>
              </View>

              <InlineError error={apply.error} />

              <SelectField
                label="Account Type"
                required
                options={ROLE_OPTIONS}
                value={role}
                onChange={(next) => {
                  setRole(next ?? 'admin');
                  setCompanyId(null);
                  setCompanyError(undefined);
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  gap: t.spacing.md,
                }}
              >
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextField
                      containerStyle={{
                        flex: 1,
                      }}
                      label="First Name"
                      required
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Enter first name"
                      error={errors.firstName?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextField
                      containerStyle={{
                        flex: 1,
                      }}
                      label="Last Name"
                      required
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Enter last name"
                      error={errors.lastName?.message}
                    />
                  )}
                />
              </View>

              {role === 'admin' ? (
                <>
                  <Controller
                    control={control}
                    name="companyName"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextField
                        label="Company Name"
                        required
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter company name"
                        icon="business-outline"
                        error={companyError ?? errors.companyName?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="city"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <TextField
                        label="City / Location"
                        required
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter city"
                        icon="location-outline"
                        error={companyError ?? errors.city?.message}
                      />
                    )}
                  />
                </>
              ) : (
                <>
                  <SelectField
                    label="Which company do you want to join?"
                    required
                    searchable
                    options={companyOptions}
                    value={companyId}
                    placeholder={
                      companies.isLoading ? 'Loading companies...' : 'Choose a company'
                    }
                    onChange={(next) => {
                      setCompanyId(next);
                      if (companyError) setCompanyError(undefined);
                    }}
                    error={companyError}
                  />
                  <InlineError error={companies.error} />
                </>
              )}

              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField
                    label="Email Address"
                    required
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter email address"
                    icon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.email?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextField
                    label="Password"
                    required
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="At least 8 characters"
                    icon="lock-closed-outline"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.password?.message}
                  />
                )}
              />

              <Card
                tone="accentSoft"
                style={{
                  flexDirection: 'row',
                  gap: t.spacing.sm,
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={t.accent.primaryDark}
                />
                <AppText
                  variant="caption"
                  tone="body"
                  style={{
                    flex: 1,
                  }}
                >
                  ✅ Mobile verified:{' '}
                  <AppText variant="caption" tone="ink">
                    +91 {mobile}
                  </AppText>
                  . Fields marked * are required.
                </AppText>
              </Card>

              <Button
                label="Submit Registration"
                iconRight="arrow-forward"
                onPress={submitDetails}
                loading={apply.isPending}
              />
            </>
          ) : null}

          {step === 4 ? (
            <>
              <View
                style={{
                  alignItems: 'center',
                  gap: t.spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: t.accent.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" size={38} color="#FFFFFF" />
                </View>
                <AppText variant="title" align="center">
                  Registration Completed!
                </AppText>
                <AppText variant="body" tone="muted" align="center">
                  Your registration is under review. It takes up to 24 hours for an admin
                  to approve your account.
                </AppText>
              </View>

              <Card
                padded={false}
                style={{
                  paddingHorizontal: t.spacing.lg,
                }}
              >
                {[
                  {
                    icon: 'time-outline',
                    title: 'Review in progress',
                    body: 'Our team is verifying your details',
                  },
                  {
                    icon: 'shield-checkmark-outline',
                    title: 'Approval within 24 hours',
                    body: "You'll get a message once approved",
                  },
                  {
                    icon: 'log-in-outline',
                    title: 'Then just sign in',
                    body: 'Use your mobile number and the OTP we send',
                  },
                ].map((row, index, all) => (
                  <View
                    key={row.title}
                    style={{
                      flexDirection: 'row',
                      gap: t.spacing.md,
                      alignItems: 'center',
                      paddingVertical: t.spacing.lg,
                      borderBottomWidth: index === all.length - 1 ? 0 : 1,
                      borderBottomColor: t.color.lineSoft,
                    }}
                  >
                    <Ionicons name={row.icon} size={20} color={t.accent.primaryDark} />
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <AppText variant="bodyStrong">{row.title}</AppText>
                      <AppText variant="caption" tone="muted">
                        {row.body}
                      </AppText>
                    </View>
                  </View>
                ))}
              </Card>

              <Card tone="canvas">
                <AppText variant="caption" tone="muted">
                  Registered mobile
                </AppText>
                <AppText variant="bodyStrong">+91 {mobile}</AppText>
                <AppText
                  variant="caption"
                  tone="faint"
                  style={{
                    marginTop: 4,
                  }}
                >
                  {submitted?.is_new_company
                    ? 'Your company was created with this request.'
                    : 'Use this number to check your status.'}
                </AppText>
              </Card>

              <Button
                label="Check Status"
                variant="outline"
                icon="search"
                onPress={() =>
                  router.push(`/(auth)/registration-status?mobile=${mobile}`)
                }
              />

              <Button
                label="Back to Login"
                icon="arrow-back"
                onPress={() => router.replace('/(auth)/login')}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
