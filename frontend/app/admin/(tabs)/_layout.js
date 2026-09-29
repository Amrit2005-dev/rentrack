import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePermissions, useCurrentUser } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';
import { isSuperAdminRole } from '@/utils/permissions';
import { useTheme } from '@/theme';

/**
 * The SRS admin frames show six tabs (Dashboard, Vehicle, Driver, Receipt,
 * Trip, Account). Receipts have no backend module, so that tab is gone.
 *
 * Org Admin sees five: Dashboard, Vehicle, Driver, Trip, Account.
 *
 * Super Admin sees three: Dashboard, Company, Account. Fleet, crew and trips
 * are all scoped to the caller's own organisation server-side, and a super
 * admin belongs to none — those three routes answer with an empty list for
 * them, so the tabs only led to permanently blank screens. Platform work goes
 * through Company instead.
 */
export default function AdminTabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { canManageOrganizations } = usePermissions();
  const user = useCurrentUser();
  const scopedCompanyId = useScopedCompanyId();
  /*
   * Fleet, crew and trips are company-scoped. A super admin on the platform
   * view has no organisation, so those tabs would be permanently empty — but
   * once they enter a company from the Companies tab they are acting inside it
   * and need them back.
   */
  const hideCompanyTabs = isSuperAdminRole(user?.role) && !scopedCompanyId;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent.primary,
        tabBarInactiveTintColor: t.color.muted,
        tabBarStyle: {
          height: t.sizing.tabBar + insets.bottom,
          paddingHorizontal: 4,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          borderTopColor: t.color.line,
          backgroundColor: t.color.surface,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Vehicle',
          href: hideCompanyTabs ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bus' : 'bus-outline'} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Driver',
          href: hideCompanyTabs ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trip',
          href: hideCompanyTabs ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={21} color={color} />
          ),
        }}
      />
      {/*
        The sixth tab, and Super Admin only. `href: null` removes it from the
        bar for every other role while leaving the route registered, which is
        how expo-router hides a tab without unmounting the navigator.
       */}
      <Tabs.Screen
        name="companies"
        options={{
          title: 'Company',
          href: canManageOrganizations ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'business' : 'business-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
