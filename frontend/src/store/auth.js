import { useMemo } from 'react';
import { create } from 'zustand';
import { authApi } from '@/api/auth';
import { setSessionLostHandler, setTokenListener, setTokens } from '@/api/client';
import { resetQueryCache } from '@/api/queryClient';
import { secureStorage } from '@/utils/secureStorage';
import { permissionsFor, shellFor } from '@/utils/permissions';

const ACCESS_KEY = 'movexpress.access';
const REFRESH_KEY = 'movexpress.refresh';
const USER_KEY = 'movexpress.user';

async function persistTokens(access, refresh) {
  setTokens(access, refresh ?? null);
  await Promise.all([
    access ? secureStorage.set(ACCESS_KEY, access) : secureStorage.remove(ACCESS_KEY),
    // Storing a missing token would write the string "null", which reads back
    // truthy and makes the client attempt a refresh this API cannot serve.
    refresh ? secureStorage.set(REFRESH_KEY, refresh) : secureStorage.remove(REFRESH_KEY),
  ]);
}

export const useAuthStore = create((set, get) => ({
  status: 'hydrating',
  user: null,
  async hydrate() {
    const [rawAccess, rawRefresh, rawUser] = await Promise.all([
      secureStorage.get(ACCESS_KEY),
      secureStorage.get(REFRESH_KEY),
      secureStorage.get(USER_KEY),
    ]);
    // Sessions written by earlier builds stored absent tokens as the strings
    // "null"/"undefined", which read back truthy.
    const clean = (v) => (!v || v === 'null' || v === 'undefined' ? null : v);
    const access = clean(rawAccess);
    const refresh = clean(rawRefresh);
    if (!access) {
      set({
        status: 'anonymous',
        user: null,
      });
      return;
    }
    setTokens(access, refresh);
    let cached = null;
    try {
      cached = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      cached = null;
    }
    set({
      status: 'authenticated',
      user: cached,
    });

    try {
      const fresh = await authApi.me();
      await secureStorage.set(USER_KEY, JSON.stringify(fresh));
      set({
        user: fresh,
      });
    } catch {
      // Offline or server down — keep the cached session
    }
  },

  // ── Email pending for 2FA step 2 ─────────────────────────────────────────
  pendingEmail: null,
  devOtp: null,

  async signIn(email, password) {
    // Whatever is cached belongs to whoever was signed in before. Dropping it
    // first stops one account's rows being shown to the next.
    resetQueryCache();
    // Step 1: password check → triggers OTP dispatch on the server.
    // The server returns { message, mobile_hint }, NOT a token yet.
    const step1 = await authApi.login(email, password);
    set({ pendingEmail: email, devOtp: step1.otp || null });
    // Caller should navigate to the OTP verify screen.
    // Return step1 so the login screen can show the mobile_hint.
    return step1;
  },

  /**
   * Step 2 of email+password 2FA: verify the OTP and complete sign-in.
   * Called from the OTP verify screen after signIn() sets pendingEmail.
   */
  async verifyLoginOtp(otp) {
    const email = get().pendingEmail;
    if (!email) throw new Error('Start sign-in before verifying the code.');
    resetQueryCache();
    const res = await authApi.loginVerify(email, otp);
    const accessToken = res.access_token;
    const refreshToken = res.refresh_token ?? null;
    await persistTokens(accessToken, refreshToken);
    const user = res.user || (await authApi.me());
    await secureStorage.set(USER_KEY, JSON.stringify(user));
    set({ status: 'authenticated', user, pendingEmail: null, devOtp: null });
    return user;
  },

  clearLoginOtpFlow: () => set({ pendingEmail: null, devOtp: null }),

  // ── Password reset ────────────────────────────────────────────────────────
  async forgotPassword(mobile_number) {
    return authApi.forgotPassword(mobile_number);
  },

  async resetPassword(mobile_number, otp, new_password) {
    return authApi.resetPassword(mobile_number, otp, new_password);
  },

  /**
   * A session from a Google ID token.
   *
   * Shares everything after the exchange with signIn(): the server answers
   * with the same TokenResponse whichever way the session started, so there is
   * one place that persists a session and one place that clears the cache.
   */
  async signInWithGoogle(idToken) {
    resetQueryCache();
    const res = await authApi.loginWithGoogle(idToken);
    await persistTokens(res.access_token, res.refresh_token ?? null);
    const user = res.user || (await authApi.me());
    await secureStorage.set(USER_KEY, JSON.stringify(user));
    set({
      status: 'authenticated',
      user,
    });
    return user;
  },

  /* ── Phone sign-in ───────────────────────────────────────
   *
   * The number being verified lives here rather than in a route param so a
   * reload cannot drop a half-finished sign-in into the verify screen with
   * nothing to verify against — which is what its "Start again" state catches.
   */
  pendingMobile: null,

  async requestOtp(mobile) {
    const res = await authApi.requestOtp(mobile);
    set({
      pendingMobile: mobile,
      devOtp: res.otp || null,
    });
    return res;
  },

  async verifyOtp(otp) {
    const mobile = get().pendingMobile;
    if (!mobile) throw new Error('Request a code before verifying one.');
    resetQueryCache();
    const res = await authApi.verifyOtp(mobile, otp);
    await persistTokens(res.access_token, res.refresh_token ?? null);
    const user = res.user || (await authApi.me());
    await secureStorage.set(USER_KEY, JSON.stringify(user));
    set({
      status: 'authenticated',
      user,
      pendingMobile: null,
      devOtp: null,
    });
    return user;
  },

  /** Drops a half-finished phone sign-in, e.g. on going back to the login screen. */
  clearOtpFlow: () =>
    set({
      pendingMobile: null,
      devOtp: null,
    }),

  async signOut() {
    // The API exposes no /auth/logout; the JWT simply expires. Dropping the
    // stored token is the whole sign-out, so nothing is sent.
    setTokens(null, null);
    await Promise.all([
      secureStorage.remove(ACCESS_KEY),
      secureStorage.remove(REFRESH_KEY),
      secureStorage.remove(USER_KEY),
    ]);
    resetQueryCache();
    set({
      status: 'anonymous',
      user: null,
      pendingMobile: null,
      devOtp: null,
    });
  },

  async refreshUser() {
    if (get().status !== 'authenticated') return;
    const fresh = await authApi.me();
    await secureStorage.set(USER_KEY, JSON.stringify(fresh));
    set({
      user: fresh,
    });
  },
}));

setTokenListener(({ access, refresh }) => {
  void persistTokens(access, refresh);
});

setSessionLostHandler(() => {
  if (useAuthStore.getState().status === 'authenticated') {
    void useAuthStore.getState().signOut();
  }
});

export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useShell = () => useAuthStore((s) => shellFor(s.user));

export function usePermissions() {
  const user = useCurrentUser();
  return useMemo(() => permissionsFor(user), [user]);
}
