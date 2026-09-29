import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { AppDrawer } from '@/features/shell/AppDrawer';
import { AppRail } from '@/features/shell/AppRail';
import { RAIL_WIDTH, useIsWideShell } from '@/features/shell/useShellLayout';
import { ThemeProvider } from '@/theme';

/** The driver app keeps the amber system from the SRS user frames. */
export default function DriverLayout() {
  const isWide = useIsWideShell();
  return (
    <ThemeProvider accent="amber">
      <View style={{ flex: 1, paddingLeft: isWide ? RAIL_WIDTH : 0 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="collections/index" />
          <Stack.Screen name="trip/[id]" />
        </Stack>
        {/* Last child so it overlays the shell, tab bar included. */}
        {isWide ? <AppRail shell="driver" /> : <AppDrawer shell="driver" />}
      </View>
    </ThemeProvider>
  );
}
