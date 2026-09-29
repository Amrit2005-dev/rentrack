import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { CompanyScopeBar } from '@/features/accounts/CompanyScopeBar';
import { useClientDirectory } from '@/features/billing/ClientField';
import { AppDrawer } from '@/features/shell/AppDrawer';
import { AppRail } from '@/features/shell/AppRail';
import { useHasSideNav } from '@/features/shell/navigation';
import { RAIL_WIDTH, useIsWideShell } from '@/features/shell/useShellLayout';
import { ThemeProvider } from '@/theme';

/** Admin wears the indigo system from the SRS management frames. */
export default function AdminLayout() {
  // Wide enough for a permanent rail? Otherwise the hamburger and overlay.
  const isWide = useIsWideShell();
  const hasSideNav = useHasSideNav();
  // Primes the id -> company-name cache that clientLabel() reads, so every
  // admin screen shows client names rather than id fragments.
  useClientDirectory();

  return (
    <ThemeProvider accent="indigo">
      <View
        style={{
          flex: 1,
          // Only the collapsed width is reserved; the rail expands over the
          // content rather than pushing it, so hovering reflows nothing.
          paddingLeft: isWide && hasSideNav ? RAIL_WIDTH : 0,
        }}
      >
        <CompanyScopeBar />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="vehicle/new" />
          <Stack.Screen name="vehicle/[id]" />
          <Stack.Screen name="driver/new" />
          <Stack.Screen name="driver/[id]" />
          <Stack.Screen name="trip/new" />
          <Stack.Screen name="trip/[id]" />
          <Stack.Screen name="trip/calendar" />
          <Stack.Screen name="users/index" />
          <Stack.Screen name="company/new" />
          <Stack.Screen name="company/[id]" />
          <Stack.Screen name="challans/index" />
          <Stack.Screen name="challans/new" />
          <Stack.Screen name="challans/calendar" />
          <Stack.Screen name="challans/[id]" />
          <Stack.Screen name="quotations/index" />
          <Stack.Screen name="quotations/new" />
          <Stack.Screen name="quotations/[id]" />
          <Stack.Screen name="invoices/index" />
          <Stack.Screen name="invoices/new" />
          <Stack.Screen name="invoices/[id]" />
          <Stack.Screen name="ledger/index" />
          <Stack.Screen name="ledger/[clientId]" />
          <Stack.Screen name="tds/index" />
          <Stack.Screen name="collections/index" />
          <Stack.Screen name="expenses/index" />
          <Stack.Screen name="reports" />
        </Stack>
        {/* Last child so it overlays the shell, tab bar included. */}
        {!hasSideNav ? null : isWide ? <AppRail shell="admin" /> : <AppDrawer />}
      </View>
    </ThemeProvider>
  );
}
