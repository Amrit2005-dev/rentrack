/**
 * Offline mock backend.
 *
 * The FastAPI service this app was written against is no longer part of the
 * repo, so instead of stubbing every screen we swap axios' transport: requests
 * are built, sent and unwrapped exactly as before, but an in-memory handler
 * answers them instead of the network. src/api/*.js, the hooks and the screens
 * are untouched, and `EXPO_PUBLIC_USE_MOCK_API=false` puts the real network
 * adapter back the day a server exists again.
 */

import axios from 'axios';
import { HttpError, PUBLIC_ROUTES, routes, userForToken } from './routes';

/** Feels like a real request without making anyone wait. */
const LATENCY_MS = [120, 320];

/**
 * Opt-in, never opt-out.
 *
 * This used to default to ON when the variable was absent, which is exactly
 * the state a cloud build is in — .env is gitignored, so EAS never sees it.
 * A production build therefore shipped the in-memory mock and served fake
 * records to real users while never contacting the API. Anything other than
 * an explicit "true" now means the real network.
 */
export const isMockEnabled = () =>
  String(process.env.EXPO_PUBLIC_USE_MOCK_API ?? '').toLowerCase() === 'true';

const sleep = () =>
  new Promise((resolve) =>
    setTimeout(resolve, LATENCY_MS[0] + Math.random() * (LATENCY_MS[1] - LATENCY_MS[0])),
  );

/** '/trips/' and '/trips' are the same route; ':id' segments match anything. */
const normalise = (path) => path.replace(/\/+$/, '') || '/';

const TABLE = Object.entries(routes).map(([key, handler]) => {
  const [method, rawPath] = key.split(' ');
  const path = normalise(rawPath);
  return {
    key,
    method,
    handler,
    segments: path.split('/').filter(Boolean),
    isStatic: !path.includes(':'),
  };
});

function pathOf(config) {
  const base = config.baseURL ?? '';
  let url = config.url ?? '';
  if (base && url.startsWith(base)) url = url.slice(base.length);
  // A fully qualified URL that is not under baseURL still resolves by path.
  if (/^https?:\/\//i.test(url)) {
    const withoutScheme = url.replace(/^https?:\/\/[^/]+/i, '');
    url = withoutScheme.replace(/^\/api\/v\d+/, '');
  }
  return normalise(url.split('?')[0] || '/');
}

function match(method, path) {
  const wanted = path.split('/').filter(Boolean);
  const candidates = TABLE.filter(
    (route) => route.method === method && route.segments.length === wanted.length,
  );
  // Static routes win, so /trips/my is never swallowed by /trips/:id.
  for (const route of [...candidates].sort(
    (a, b) => Number(b.isStatic) - Number(a.isStatic),
  )) {
    const params = {};
    const ok = route.segments.every((segment, i) => {
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = decodeURIComponent(wanted[i]);
        return true;
      }
      return segment === wanted[i];
    });
    if (ok) return { route, pathParams: params };
  }
  return null;
}

function parseBody(data) {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  // FormData (vehicle image upload) carries nothing the handlers need.
  if (typeof FormData !== 'undefined' && data instanceof FormData) return null;
  return data;
}

function tokenFrom(config) {
  const headers = config.headers ?? {};
  const raw =
    headers.Authorization ??
    headers.authorization ??
    (typeof headers.get === 'function' ? headers.get('Authorization') : null);
  return typeof raw === 'string' ? raw.replace(/^Bearer\s+/i, '').trim() : null;
}

/**
 * A response body the caller cannot reach back into.
 *
 * Handlers hold live references to the rows in ./data, and a real API hands
 * back JSON that was serialised on the way out. Returning the row itself let a
 * write mutate an object the query cache was already holding — the cache then
 * saw deep-equal data, kept the previous array by structural sharing, and any
 * useMemo keyed on that array never recomputed. The list re-rendered from the
 * mutated row while the totals above it stayed on the old numbers.
 *
 * Cloning here is what the network would have done anyway.
 */
const serialise = (data) =>
  data == null || typeof data !== 'object'
    ? data
    : (globalThis.structuredClone?.(data) ?? JSON.parse(JSON.stringify(data)));

const ok = (data, config, status = 200) => ({
  data: serialise(data),
  status,
  statusText: 'OK',
  headers: {},
  config,
  request: {},
});

/** Shaped like an AxiosError so src/api/client.js maps it to an ApiError. */
function fail(status, detail, config) {
  const error = new Error(typeof detail === 'string' ? detail : 'Request failed');
  error.isAxiosError = true;
  error.config = config;
  error.response = {
    data: { detail },
    status,
    statusText: 'Error',
    headers: {},
    config,
  };
  return error;
}

export async function mockAdapter(config) {
  await sleep();

  const method = String(config.method ?? 'get').toUpperCase();
  const path = pathOf(config);
  const found = match(method, path);
  if (!found) {
    return Promise.reject(fail(404, `No mock route for ${method} ${path}`, config));
  }

  const { route, pathParams } = found;
  const body = parseBody(config.data);

  let user = null;
  if (!PUBLIC_ROUTES.has(route.key)) {
    user = userForToken(tokenFrom(config));
    if (!user) {
      return Promise.reject(fail(401, 'Not authenticated', config));
    }
  }

  try {
    const data = route.handler({
      ...pathParams,
      params: config.params ?? {},
      body,
      user,
      config,
    });
    return ok(data ?? null, config, data == null ? 204 : 200);
  } catch (error) {
    if (error instanceof HttpError) {
      return Promise.reject(fail(error.status, error.detail, config));
    }
    if (__DEV__) console.error('[mock api] handler threw', route.key, error);
    return Promise.reject(fail(500, 'The mock backend hit an unexpected error.', config));
  }
}

/**
 * Points an axios instance at the mock. The global default is patched too,
 * because the silent-refresh call in client.js uses bare `axios`.
 */
export function installMockApi(instance) {
  if (!isMockEnabled()) return false;
  instance.defaults.adapter = mockAdapter;
  axios.defaults.adapter = mockAdapter;
  if (__DEV__) {
    console.log(
      '[mock api] running without a backend — sign in with 9000000002 (admin), ' +
        '9000000001 (super admin) or 9000000003 (driver), OTP 123456.',
    );
  }
  return true;
}
