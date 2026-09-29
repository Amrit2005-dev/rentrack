import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Button,
  Card,
  InlineError,
  Notice,
  PhoneField,
  Screen,
  ScreenHeader,
  SectionCard,
  TextField,
} from '@/components/ui';
import { organizationsApi } from '@/api/organizations';
import { usersApi } from '@/api/users';
import { useCompanyDirectory } from '@/features/accounts/useCompanyDirectory';
import { usePermissions } from '@/store/auth';
import { useTheme } from '@/theme';

/**
 * Add a company.
 *
 * There is no POST /companies — `register_user` is the only thing that creates
 * one, and it does so as a side effect: submit a registration whose company
 * name the system has not seen, and the company row is created alongside the
 * user. So this screen registers the company's first account, then approves it
 * so the company is active rather than sitting in the queue.
 *
 * Two calls, because the registration response returns the new user's id but
 * not the request id: create, then find the matching pending request and
 * approve that.
 */
export default function NewCompanyScreen() {
  const t = useTheme();
  const { canManageOrganizations } = usePermissions();
  // Used to recover the new company's id by name if approval fails.
  const directory = useCompanyDirectory();

  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState(null);
  const [result, setResult] = useState(null);

  if (!canManageOrganizations) {
    return (
      <Screen>
        <ScreenHeader title="Add Company" back />
        <Notice icon="lock-closed-outline">
          Only a platform administrator can onboard a company.
        </Notice>
      </Screen>
    );
  }

  const validate = () => {
    const next = {};
    if (!companyName.trim()) next.companyName = 'The company needs a name';
    if (!city.trim()) next.city = 'City is required — the company record stores it';
    if (!firstName.trim()) next.firstName = 'Required';
    if (!lastName.trim()) next.lastName = 'Required';
    if (!/^\d{10}$/.test(mobile)) {
      next.mobile = 'Enter a 10-digit mobile number';
    }
    // Sign-in is email + password, so an account created without them could
    // never log in.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address — this is their login id';
    }
    if (password.length < 8) {
      next.password = 'Use at least 8 characters';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setFailure(null);

    try {
      // 1. Create the company directly via organizations API
      const company = await organizationsApi.create({
        name: companyName.trim(),
        city: city.trim(),
      });

      // 2. Create the user under this new company
      const user = await usersApi.create(
        {
          mobile_number: mobile.trim(),
          email: email.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim() || ' ',
          role: 'admin',
        },
        { org_id: company.id },
      );

      await directory.refetch();

      setResult({
        approved: true,
        approveError: null,
        company_id: company.id,
        is_new_company: true,
      });
    } catch (error) {
      setFailure(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Screen>
        <ScreenHeader title="Company Added" back />
        <Card tone="accentSoft">
          <AppText variant="heading">{companyName.trim()}</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
            {result.is_new_company
              ? `Created in ${city.trim()}.`
              : 'A company with this name already existed — the account joined it instead of creating a new one.'}
          </AppText>
        </Card>

        <Notice icon={result.approved ? 'checkmark-circle-outline' : 'hourglass-outline'}>
          {result.approved
            ? `${firstName.trim()} can sign in now as the company admin with ${email.trim()} and the password you set.`
            : `The account was registered but could not be approved automatically, so ${firstName.trim()} cannot sign in yet. Approve it from Notifications.`}
        </Notice>

        {result.approveError ? <InlineError error={result.approveError} /> : null}

        {/* Only offered when there is a real company to open — the id comes from
            the approval, so a failed approval has none. */}
        {result.company_id ? (
          <Button
            label="Open Company"
            icon="business-outline"
            onPress={() => router.replace(`/admin/company/${result.company_id}`)}
          />
        ) : null}
        <Button
          label="Back to Companies"
          variant="outline"
          onPress={() => router.replace('/admin/companies')}
        />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <ScreenHeader
          title="Add Company"
          subtitle="Onboard an organisation and its first account"
          back
        />

        <Notice icon="information-circle-outline">
          A company is created by its first registration. Filling this in registers the
          account below and approves it — that is what brings the company onto the
          platform and makes its sign-in work.
        </Notice>

        <SectionCard title="Company" icon="business-outline">
          <TextField
            label="Company Name"
            required
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Sharma Earthmovers"
            error={errors.companyName}
            hint="An existing name joins that company instead of creating one."
          />
          <TextField
            label="City"
            required
            value={city}
            onChangeText={setCity}
            placeholder="Hisar"
            error={errors.city}
          />
        </SectionCard>

        <SectionCard title="First Account" icon="person-add-outline">
          <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
            <TextField
              label="First Name"
              required
              containerStyle={{ flex: 1 }}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Anil"
              error={errors.firstName}
            />
            <TextField
              label="Last Name"
              required
              containerStyle={{ flex: 1 }}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Sharma"
              error={errors.lastName}
            />
          </View>
          <PhoneField
            label="Mobile Number"
            required
            value={mobile}
            onChangeText={setMobile}
            error={errors.mobile}
          />
          <Notice icon="shield-checkmark-outline">
            The first account for a new company is created as Admin.
          </Notice>
        </SectionCard>

        <SectionCard title="Sign-in Details" icon="key-outline">
          <TextField
            label="Email Address"
            required
            value={email}
            onChangeText={setEmail}
            placeholder="anil@sharmaearthmovers.com"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            hint="This is the login id — it must be unique across the platform."
          />
          <View>
            <TextField
              label="Password"
              required
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.password}
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
          <Notice icon="information-circle-outline">
            Share these with {firstName.trim() || 'the account holder'} — they sign in
            with the email and password, not a one-time code.
          </Notice>
        </SectionCard>

        {failure ? <InlineError error={failure} /> : null}

        <Button
          label="Create Company"
          icon="add-circle-outline"
          loading={submitting}
          onPress={submit}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
