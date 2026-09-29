import React from 'react';
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/theme';

/** Auth wears the amber system, matching the SRS login and registration frames. */
export default function AuthLayout() {
  return (
    <ThemeProvider accent="amber">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="verify" />
        <Stack.Screen name="register" />
        <Stack.Screen name="registration-status" />
      </Stack>
    </ThemeProvider>
  );
}
