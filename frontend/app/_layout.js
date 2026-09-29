import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import { useAuthStore } from '@/store/auth';
import { shellFor } from '@/utils/permissions';
import { ThemeProvider } from '@/theme';
import { LoadingState } from '@/components/ui';
/**
 * Sends the user to the shell their role belongs in, and bounces them out of
 * any group they are not entitled to. Runs on every segment change.
 */
function useAuthRedirect() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const segments = useSegments();
  const router = useRouter();
  const lastTarget = useRef(null);
  useEffect(() => {
    if (status === 'hydrating') return;
    const group = segments[0];
    const inAuthGroup = group === '(auth)';
    if (status === 'anonymous') {
      if (!inAuthGroup && lastTarget.current !== 'auth') {
        lastTarget.current = 'auth';
        router.replace('/(auth)/login');
      }
      return;
    }
    const shell = shellFor(user);
    const home = shell === 'driver' ? '/driver' : '/admin';
    // The shells are real path segments ("admin" / "driver"), not route groups.
    // Route groups contribute no URL segment, so when both shells declared
    // /trips and /account the URLs collided and one shell's tabs silently
    // resolved into the other's — which this guard then bounced straight home.
    const inWrongShell =
      inAuthGroup ||
      (shell === 'driver' && group === 'admin') ||
      (shell === 'admin' && group === 'driver');
    if (inWrongShell && lastTarget.current !== home) {
      lastTarget.current = home;
      router.replace(home);
      return;
    }
    if (!inWrongShell) lastTarget.current = null;
  }, [status, user, segments, router]);
}
function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useAuthRedirect();
  if (status === 'hydrating') {
    return (
      <ThemeProvider accent="amber">
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <LoadingState label="Starting MoveXpress" />
        </View>
      </ThemeProvider>
    );
  }
  return <Slot />;
}
export default function RootLayout() {
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
      }}
    >
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
