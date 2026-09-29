import React from 'react';
import { View } from 'react-native';
import { AppText, Button, InlineError } from '@/components/ui';
import { useTheme } from '@/theme';
import { useGoogleSignIn } from './useGoogleSignIn';

/**
 * "Continue with Google", divider included.
 *
 * The hook lives in here rather than in the login screen for one reason:
 * expo-auth-session throws when the client id for the current platform is
 * missing, and a hook cannot be called conditionally. Keeping it inside a
 * component the caller renders only when `isGoogleConfigured` means an
 * unconfigured build never runs it at all — rendering it unguarded took down
 * the whole login screen with "Client Id property `webClientId` must be
 * defined", not just the button.
 */
export function GoogleSignInButton() {
  const t = useTheme();
  const google = useGoogleSignIn();

  return (
    <>
      <InlineError error={google.error} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.md,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: t.color.line }} />
        <AppText variant="caption" tone="muted">
          or
        </AppText>
        <View style={{ flex: 1, height: 1, backgroundColor: t.color.line }} />
      </View>

      <Button
        label="Continue with Google"
        icon="logo-google"
        variant="outline"
        disabled={!google.ready}
        loading={google.busy}
        onPress={google.signIn}
      />
    </>
  );
}
