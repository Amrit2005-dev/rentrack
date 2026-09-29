import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/**
 * One QueryClient for the app, defined here rather than in app/_layout.js so
 * the auth store can reach it.
 *
 * That matters: the cache is a module-level singleton and outlives a sign-out,
 * so without clearing it the next person to sign in on the same device saw the
 * previous user's cached rows — a driver opening the app after an admin was
 * shown that admin's trips, from other companies, until each query happened to
 * refetch. See resetQueryCache, called on both sign-in and sign-out.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      /**
       * The browser's online flag says nothing about whether a LAN or
       * localhost API is reachable, and when the manager guesses wrong the
       * query is paused rather than failed — which reads on screen as "no
       * records" while the server is actually down. Always fetch, and let a
       * real failure surface as an error state.
       */
      networkMode: 'always',
      retry: (failureCount, error) => {
        // 401/403/404 will never succeed on retry; network blips might.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
      networkMode: 'always',
    },
  },
});

/** Drops every cached query so no data crosses a session boundary. */
export function resetQueryCache() {
  queryClient.clear();
}
