import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/store/auth';

/*
 * Finishes the browser handoff on web: without it the popup that Google
 * redirects back to stays open and the app never sees the result.
 */
WebBrowser.maybeCompleteAuthSession();

/**
 * Client ids, one per platform, supplied as build-time env vars.
 *
 * Google issues a separate id for each platform and rejects a token requested
 * with the wrong one, so there is no single value that works everywhere. They
 * are read through EXPO_PUBLIC_* because that is what gets inlined into the
 * bundle — and being public is fine: a client id is not a secret, it identifies
 * the app rather than authorising it.
 */
const CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
};

/**
 * Whether Google sign-in can run *here*.
 *
 * Per-platform, not "any id is set": expo-auth-session throws outright when the
 * id for the current platform is missing ("Client Id property `webClientId`
 * must be defined"), and because useIdTokenAuthRequest is a hook it cannot be
 * skipped with a condition. The caller therefore has to avoid rendering the
 * component that holds it — see GoogleSignInButton.
 */
export const isGoogleConfigured =
  !!CLIENT_IDS[Platform.OS] || (Platform.OS === 'web' && !!CLIENT_IDS.web);

/**
 * "Continue with Google".
 *
 * Two halves, and only the first exists today: this obtains an ID token from
 * Google, then hands it to POST /auth/google to be exchanged for a session.
 * That route is not on this API version — `verify_google_token()` sits unused
 * in app/core/security.py — so the exchange returns 404 and `error` carries it.
 *
 * The button is hidden entirely when no client id is configured, so an
 * unconfigured build shows no control rather than one that cannot work.
 */
export function useGoogleSignIn() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [error, setError] = useState(null);
  const [exchanging, setExchanging] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: CLIENT_IDS.web,
    iosClientId: CLIENT_IDS.ios,
    androidClientId: CLIENT_IDS.android,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'error') {
      setError(response.error ?? new Error('Google sign-in failed.'));
      return;
    }
    // 'dismiss' and 'cancel' are the user closing the sheet — not an error.
    if (response.type !== 'success') return;

    const idToken = response.params?.id_token ?? response.authentication?.idToken;
    if (!idToken) {
      setError(new Error('Google did not return an identity token.'));
      return;
    }

    let cancelled = false;
    setExchanging(true);
    signInWithGoogle(idToken)
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setExchanging(false);
      });
    return () => {
      cancelled = true;
    };
  }, [response, signInWithGoogle]);

  return {
    /** Opens Google's sheet. Disabled until the request object is built. */
    signIn: () => {
      setError(null);
      return promptAsync();
    },
    /** False while expo-auth-session is still preparing the request. */
    ready: !!request,
    busy: exchanging,
    error,
    clearError: () => setError(null),
  };
}
