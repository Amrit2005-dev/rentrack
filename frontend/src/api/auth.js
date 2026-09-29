import { http } from './client';

export const authApi = {
  /**
   * Step 1 of email+password 2FA.
   *
   * Verifies credentials and dispatches an OTP to the user's registered mobile.
   * Returns { message, mobile_hint } — NOT a token. The caller must navigate to
   * the OTP screen and call loginVerify() next.
   */
  login: (email, password) =>
    http
      .post('/auth/login', {
        email,
        password,
      })
      .then((r) => r.data),

  /**
   * Step 2 of email+password 2FA.
   *
   * Verifies the OTP and returns TokenResponse { access_token, refresh_token,
   * token_type, role, user_id }. The store then calls /auth/me to get the full
   * user profile.
   */
  loginVerify: (email, otp) =>
    http
      .post('/auth/login/verify', {
        email,
        otp,
      })
      .then((r) => r.data),

  /** Fetch authenticated user profile. */
  me: () => http.get('/auth/me').then((r) => r.data),

  // ── Password reset ──────────────────────────────────────────────────────────

  /**
   * Sends a reset OTP to the given mobile number.
   * Always returns 200 (even if number is not registered) to prevent enumeration.
   */
  forgotPassword: (mobile_number) =>
    http.post('/auth/forgot-password', { mobile_number }).then((r) => r.data),

  /**
   * Verifies the OTP and sets a new password.
   */
  resetPassword: (mobile_number, otp, new_password) =>
    http
      .post('/auth/reset-password', { mobile_number, otp, new_password })
      .then((r) => r.data),

  // ── Phone / OTP sign-in (kept for the Phone tab) ────────────────────────────

  /** Sends a one-time code to a mobile number. */
  requestOtp: (mobile) =>
    http
      .post('/auth/request-otp', {
        mobile_number: mobile,
      })
      .then((r) => r.data),

  /** Exchanges a code for a session (phone-only login). */
  verifyOtp: (mobile, otp) =>
    http
      .post('/auth/verify-otp', {
        mobile_number: mobile,
        otp,
      })
      .then((r) => r.data),

  // ── Google sign-in (server-side not yet implemented) ─────────────────────────

  /** Exchanges a Google ID token for a session. Needs POST /auth/google. */
  loginWithGoogle: (idToken) =>
    http
      .post('/auth/google', {
        id_token: idToken,
      })
      .then((r) => r.data),
};
