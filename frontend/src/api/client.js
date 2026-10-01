import axios from 'axios';

/**
 * The RentTrack TMS API returns bare payloads on success. Failures are either
 * FastAPI's default `{ detail }` or the helper envelope in
 * app/utils/responses.py (`{ success, error, detail }`). This module folds both
 * into one ApiError so no screen has to guess.
 *
 * This API issues a single access token: TokenResponse is
 * { access_token, token_type, user } with no refresh token, and there is no
 * POST /auth/refresh. A 401 therefore ends the session rather than triggering a
 * silent refresh — see setSessionLostHandler.
 */

const configuredApiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, '');
export const API_BASE_URL = normalizedApiUrl.endsWith('/api/v1')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api/v1`;
export class ApiError extends Error {
  status;
  fieldErrors;
  isNetwork;
  constructor(message, status, fieldErrors = {}, isNetwork = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.isNetwork = isNetwork;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
}
/** FastAPI reports `loc: ["body", "field_name"]` — the last string is the field. */
function collectFieldErrors(detail) {
  if (!Array.isArray(detail)) return {};
  const out = {};
  for (const item of detail) {
    const loc = item?.loc;
    if (!Array.isArray(loc) || !item?.msg) continue;
    const field = [...loc]
      .reverse()
      .find((part) => typeof part === 'string' && part !== 'body');
    if (typeof field === 'string') out[field] = item.msg;
  }
  return out;
}
function messageFor(status, payload) {
  // `error` comes from the responses.py helper, `detail` from FastAPI itself.
  const raw = payload?.error ?? payload?.message ?? payload?.detail;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (Array.isArray(raw)) {
    return raw.map((d) => {
      if (d && typeof d === 'object' && d.loc && d.msg) {
        return `${d.loc.join('.')}: ${d.msg}`;
      }
      return JSON.stringify(d);
    }).join(', ');
  }
  if (raw && typeof raw === 'object' && typeof raw.msg === 'string') return raw.msg;
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'That record already exists.';
    case 422:
      return 'Please check the highlighted fields and try again.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return status >= 500
        ? 'The server ran into a problem. Please try again.'
        : 'Something went wrong. Please try again.';
  }
}
export function toApiError(error) {
  if (error instanceof ApiError) return error;
  const axiosError = error;
  if (axiosError?.isAxiosError) {
    if (!axiosError.response) {
      return new ApiError(
        'Cannot reach the server. Check your connection and try again.',
        0,
        {},
        true,
      );
    }
    const { status, data } = axiosError.response;
    return new ApiError(
      messageFor(status, data),
      status,
      status === 422 ? collectFieldErrors(data?.detail) : {},
    );
  }
  return new ApiError(
    error instanceof Error ? error.message : 'Something went wrong.',
    0,
  );
}

/* ── Token plumbing ─────────────────────────────────────── */

let accessToken = null;
let onSessionLost = null;

/**
 * The second argument is accepted and ignored: callers were written when this
 * API still returned a refresh token, and keeping the arity avoids touching
 * every call site.
 */
export function setTokens(access) {
  accessToken = access;
}

/** Retained as a no-op — there are no token rotations to report. */
export function setTokenListener() {}

/** Called when a 401 ends the session. */
export function setSessionLostHandler(handler) {
  onSessionLost = handler;
}
export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Swaps axios' transport for the in-memory backend in ./mock, but only when
 * the flag is an explicit "true".
 *
 * The require is inside the branch on purpose. Expo inlines EXPO_PUBLIC_* at
 * build time, so in a production bundle this reads `'false' === 'true'` and
 * Metro drops the branch — and with it the only reference to ./mock, keeping
 * ~1,800 lines of seed data and a router out of what users download. A
 * top-level import would have pulled all of it in whatever the flag said.
 */
function installMockIfEnabled(instance) {
  if (process.env.EXPO_PUBLIC_USE_MOCK_API !== 'true') return false;
  const { installMockApi } = require('./mock');
  return installMockApi(instance);
}

export const usingMockApi = installMockIfEnabled(http);

/*
 * A build that was never pointed at a real host would otherwise fail one
 * request at a time, looking like a network fault. Say it once, loudly, at
 * start-up instead.
 */
if (!usingMockApi && !__DEV__ && /REPLACE-WITH/.test(API_BASE_URL)) {
  console.error(
    `[MoveXpress] EXPO_PUBLIC_API_URL is "${API_BASE_URL}", which is not a ` +
      'reachable production host. Set it in eas.json before building a release.',
  );
}
http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    // A 401 from /auth/login is a bad password, not a dead session — letting it
    // through here keeps the login screen's own error message.
    const isAuthCall =
      typeof original?.url === 'string' && original.url.includes('/auth/');
    const apiError = toApiError(error);
    if (apiError.isUnauthorized && !isAuthCall) onSessionLost?.();
    return Promise.reject(apiError);
  },
);

/** Drops undefined/null/'' so we never send `?page_size=undefined`. */
export function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}
