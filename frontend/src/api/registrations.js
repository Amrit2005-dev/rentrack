import { cleanParams, http } from './client';
import { toPage } from './adapters';
/**
 * Registration — company onboarding and approval queue.
 *
 * Backend paths:
 *   POST /registration/send-otp      → send OTP to mobile (public, step 1)
 *   POST /registration/verify-mobile → verify OTP, get token (public, step 2)
 *   POST /registration/              → apply with token (public, step 3)
 *   GET  /registration/status        → check by mobile_number (public)
 *   GET  /registration/requests      → list pending (admin+, RBAC-gated)
 *   POST /registration/{id}/approve  → approve (admin+)
 *   POST /registration/{id}/reject   → reject (admin+)
 */
export const registrationsApi = {
  /**
   * Step 1 — Send a 6-digit OTP to the given mobile number via SMS.
   * Rate-limited: 3 requests per 10 minutes.
   */
  sendOtp: (mobile_number) =>
    http.post('/registration/send-otp', { mobile_number }).then((r) => r.data),

  /**
   * Step 2 — Verify the OTP. Returns { mobile_verification_token } on success.
   * The token expires in 15 minutes and must be included in apply().
   */
  verifyMobile: (mobile_number, otp) =>
    http
      .post('/registration/verify-mobile', { mobile_number, otp })
      .then((r) => r.data),

  /**
   * Step 3 — Submit the full registration form.
   * Requires mobile_verification_token from verifyMobile().
   */
  apply: (body) => http.post('/registration/', body).then((r) => r.data),

  /** Public — an applicant checks progress by mobile number. */
  status: (mobile_number) =>
    http.get('/registration/status', { params: { mobile_number } }).then((r) => r.data),
  /** Admin+ — lists pending registration requests. */
  listRequests: (params = {}) =>
    http
      .get('/registration/requests', {
        params: cleanParams(params),
      })
      .then((r) => toPage(r.data, params)),
  approve: (id, body) =>
    http.post(`/registration/${id}/approve`, body).then((r) => r.data),
  reject: (id, reason) =>
    http
      .post(`/registration/${id}/reject`, {
        reason,
      })
      .then((r) => r.data),
};

