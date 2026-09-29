import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  InfoRow,
  PhoneField,
  Screen,
  ScreenHeader,
  SkeletonList,
  StatusBadge,
} from '@/components/ui';
import { useRegistrationStatus } from '@/hooks/accounts';
import { registrationStatusMeta, statusMeta } from '@/constants/status';
import { humanise } from '@/utils/format';
import { useTheme } from '@/theme';

/**
 * Public lookup on GET /registration/status?mobile_number=. An applicant has no
 * account until approval, so the mobile number is the only handle they have.
 *
 * Routed at /registration-status rather than /status: the Metro dev server
 * answers /status itself with `packager-status:running`.
 */
export default function RegistrationStatusScreen() {
  const t = useTheme();
  const params = useLocalSearchParams();
  const [input, setInput] = useState(params.mobile ?? '');
  const [lookup, setLookup] = useState(params.mobile);
  const [inputError, setInputError] = useState();
  const request = useRegistrationStatus(lookup);
  const check = () => {
    if (!/^\d{10}$/.test(input)) {
      setInputError('Enter the 10-digit number you registered with');
      return;
    }
    setInputError(undefined);
    setLookup(input);
  };
  const status = request.data?.status;
  const approved = status === 'approved';
  const rejected = status === 'rejected';
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Screen scroll={false}>
          <ScreenHeader title="Registration Status" back />

          <Card tone="accentSoft">
            <View
              style={{
                flexDirection: 'row',
                gap: t.spacing.md,
                alignItems: 'flex-start',
              }}
            >
              <Ionicons name="search-outline" size={20} color={t.accent.primaryDark} />
              <AppText
                variant="caption"
                tone="body"
                style={{
                  flex: 1,
                }}
              >
                Enter the mobile number you registered with to see whether an admin has
                reviewed your request.
              </AppText>
            </View>
          </Card>

          <PhoneField
            label="Mobile Number"
            required
            value={input}
            onChangeText={(next) => {
              setInput(next);
              if (inputError) setInputError(undefined);
            }}
            error={inputError}
          />

          <Button label="Check Status" icon="search" onPress={check} />

          {request.isLoading && lookup ? <SkeletonList count={1} /> : null}
          {request.error ? (
            <ErrorState error={request.error} onRetry={request.refetch} />
          ) : null}

          {request.data ? (
            <>
              <Card>
                <View
                  style={{
                    alignItems: 'center',
                    gap: t.spacing.sm,
                    paddingVertical: t.spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: approved
                        ? t.status.successBg
                        : rejected
                          ? t.status.dangerBg
                          : t.status.warningBg,
                    }}
                  >
                    <Ionicons
                      name={
                        approved
                          ? 'checkmark-circle'
                          : rejected
                            ? 'close-circle'
                            : 'hourglass-outline'
                      }
                      size={32}
                      color={
                        approved
                          ? t.status.successFg
                          : rejected
                            ? t.status.dangerFg
                            : t.status.warningFg
                      }
                    />
                  </View>
                  <StatusBadge meta={statusMeta(registrationStatusMeta, status)} />
                  <AppText variant="body" tone="muted" align="center">
                    {request.data.message ||
                      (approved
                        ? 'Your account is ready. Sign in with your mobile number and the OTP we send.'
                        : rejected
                          ? 'Your request was turned down. Contact your company admin for details.'
                          : 'Still with a reviewer. You will be notified once a decision is made.')}
                  </AppText>
                </View>
              </Card>

              {/*
                The public endpoint answers with status and a message only — it
                deliberately gives out nothing else about the account — so the
                mobile number shown here is the one that was just typed in.
               */}
              <Card
                padded={false}
                style={{
                  paddingHorizontal: t.spacing.lg,
                }}
              >
                <InfoRow label="Mobile" value={`+91 ${lookup}`} icon="call-outline" />
                <InfoRow
                  label="Status"
                  value={registrationStatusMeta[status ?? '']?.label ?? humanise(status)}
                  icon="flag-outline"
                  last
                />
              </Card>

              {approved ? (
                <Button
                  label="Go to Login"
                  icon="log-in-outline"
                  onPress={() => router.replace('/(auth)/login')}
                />
              ) : null}
            </>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <AppText variant="body" tone="muted">
              Back to
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
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
