import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { shellFor } from '@/utils/permissions';

/** Entry point — the root layout has already hydrated the session by now. */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  if (status !== 'authenticated') return <Redirect href="/(auth)/login" />;
  return <Redirect href={shellFor(user) === 'driver' ? '/driver' : '/admin'} />;
}
