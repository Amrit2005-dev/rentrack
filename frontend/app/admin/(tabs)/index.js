import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  Donut,
  ErrorState,
  Screen,
  SkeletonList,
  StatRow,
  StatTile,
} from '@/components/ui';
import { TripCard } from '@/features/trips/TripCard';
import { MenuButton } from '@/features/shell/MenuButton';
import { useAdminNavigation } from '@/features/shell/navigation';
import { useRevenueReport, useTripReport } from '@/hooks/billing';
import { useDrivers, useVehicles } from '@/hooks/fleet';
import { useTrips } from '@/hooks/trips';
import { useRegistrationRequests } from '@/hooks/accounts';
import { useDashboardStats } from '@/hooks/dashboard';
import { TRIP_BUCKETS } from '@/constants/status';
import { usePermissions, useCurrentUser } from '@/store/auth';
import { useScopedCompanyId, useScopedCompanyName } from '@/store/companyScope';
import { useOpenDrawer } from '@/store/drawer';
import { compactCurrency } from '@/utils/format';
import { displayName, isSuperAdminRole } from '@/utils/permissions';
import { useTheme } from '@/theme';

/**
 * There is no /dashboard endpoint on this API, so the overview is composed from
 * /reports/revenue, /reports/trips and the fleet lists. For a super admin those
 * queries are unscoped server-side, which makes this the platform-wide view.
 */
export default function AdminDashboard() {
  const t = useTheme();
  const user = useCurrentUser();
  // The create-shortcut permissions moved into useAdminNavigation() with the
  // lists they guard; what is left here is what this screen itself decides.
  const { canManageOrganizations, canReviewRegistrations } = usePermissions();
  /**
   * A super admin belongs to no organisation, and every create route stamps the
   * new row with the caller's own org_id — so these shortcuts could only ever
   * produce an orphaned record. The platform view is read-only; company-scoped
   * work happens after entering a company from the Companies tab, which also
   * carries its own "Add Company" action.
   */
  const isSuperAdmin = isSuperAdminRole(user?.role);
  // Same lists the drawer renders — see features/shell/navigation.js.
  const { sections } = useAdminNavigation();
  const openDrawer = useOpenDrawer();
  const [refreshing, setRefreshing] = useState(false);
  const scopedCompanyName = useScopedCompanyName();
  const scopedCompanyId = useScopedCompanyId();
  /*
   * Platform totals. Every list route narrows to the caller's organisation, so
   * an unscoped super admin sees nothing in them — /dashboard/stats is the one
   * endpoint that aggregates across all organisations for them. Once they enter
   * a company the lists carry `org_id` and become the better source, so the
   * stats are only used for the platform-wide view.
   */
  const platformStats = useDashboardStats(isSuperAdmin && !scopedCompanyId);
  const stats = platformStats.data;
  const usePlatform = isSuperAdmin && !scopedCompanyId && !!stats;
  /* Same rule as the tab bar: those routes are only reachable inside a company. */
  const hideCompanyLinks = isSuperAdmin && !scopedCompanyId;
  const revenue = useRevenueReport();
  const tripReport = useTripReport();
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const trips = useTrips();
  const requests = useRegistrationRequests();
  const upcoming = useMemo(
    () =>
      (trips.data?.items ?? [])
        .filter((trip) => TRIP_BUCKETS.upcoming.includes(trip.status))
        .slice(0, 2),
    [trips.data],
  );
  const fleet = useMemo(() => {
    if (usePlatform) {
      const v = stats.vehicles ?? {};
      return {
        total: v.total ?? 0,
        active: v.available ?? 0,
        inTrip: v.on_trip ?? 0,
        inactive: (v.maintenance ?? 0) + (v.retired ?? 0),
      };
    }
    const rows = vehicles.data?.items ?? [];
    return {
      total: vehicles.data?.total ?? rows.length,
      active: rows.filter((v) => v.status === 'active').length,
      inTrip: rows.filter((v) => v.status === 'in_trip').length,
      inactive: rows.filter((v) => v.status === 'inactive').length,
    };
  }, [vehicles.data, usePlatform, stats]);
  const crew = useMemo(() => {
    if (usePlatform) {
      const d = stats.drivers ?? {};
      return {
        total: d.total ?? 0,
        available: d.available ?? 0,
        onTrip: d.on_trip ?? 0,
        offDuty: Math.max(0, (d.total ?? 0) - (d.available ?? 0) - (d.on_trip ?? 0)),
      };
    }
    const rows = drivers.data?.items ?? [];
    return {
      total: drivers.data?.total ?? rows.length,
      available: rows.filter((d) => d.availability === 'available').length,
      onTrip: rows.filter((d) => d.availability === 'on_trip').length,
      offDuty: rows.filter((d) => d.availability === 'off_duty').length,
    };
  }, [drivers.data, usePlatform, stats]);
  const pendingCount = usePlatform
    ? (stats.pending_registrations ?? 0)
    : (requests.data?.total ?? 0);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      revenue.refetch(),
      tripReport.refetch(),
      vehicles.refetch(),
      drivers.refetch(),
      trips.refetch(),
      ...(canReviewRegistrations ? [requests.refetch()] : []),
      ...(isSuperAdmin && !scopedCompanyId ? [platformStats.refetch()] : []),
    ]);
    setRefreshing(false);
  };
  const loading =
    isSuperAdmin && !scopedCompanyId
      ? platformStats.isLoading
      : revenue.isLoading || tripReport.isLoading || vehicles.isLoading;
  const dashboardError =
    isSuperAdmin && !scopedCompanyId ? platformStats.error : revenue.error;
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: t.spacing.md,
        }}
      >
        <MenuButton />
        <View
          style={{
            flex: 1,
          }}
        >
          {/* A super admin on the platform view is looking at every company at
              once, which is a different job from running one — say so. Once
              they enter a company the heading goes back to Dashboard and the
              company name below it says whose data this is. */}
          <AppText variant="display">
            {isSuperAdmin && !scopedCompanyId ? 'Super Admin Dashboard' : 'Dashboard'}
          </AppText>
          {scopedCompanyName ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 2,
              }}
            >
              <Ionicons name="business" size={14} color={t.accent.primaryDark} />
              <AppText
                variant="subheading"
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: t.accent.primaryDark,
                }}
              >
                {scopedCompanyName}
              </AppText>
            </View>
          ) : (
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {canManageOrganizations ? 'Platform-wide overview' : displayName(user)}
            </AppText>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            pendingCount ? `Notifications, ${pendingCount} pending` : 'Notifications'
          }
          onPress={() => router.push('/admin/notifications')}
          hitSlop={10}
          style={{
            paddingTop: 6,
          }}
        >
          <Ionicons name="notifications-outline" size={24} color={t.color.ink} />
          {pendingCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 2,
                right: -2,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 4,
                borderRadius: 8,
                backgroundColor: t.status.dangerFg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText
                variant="micro"
                style={{
                  color: '#FFFFFF',
                  fontSize: 10,
                }}
              >
                {pendingCount > 9 ? '9+' : pendingCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {loading ? <SkeletonList count={3} /> : null}
      {/* The platform view reads only /dashboard/stats; if that fails it would
          otherwise fall through to the org lists, which are empty for a super
          admin, and show a dashboard of silent zeros. */}
      {dashboardError ? (
        <ErrorState
          error={dashboardError}
          onRetry={platformStats.error ? platformStats.refetch : revenue.refetch}
        />
      ) : null}

      {!loading && !dashboardError ? (
        <>
          <StatRow>
            <StatTile
              label="Trips"
              value={
                usePlatform
                  ? (stats.trips?.total ?? 0)
                  : (tripReport.data?.total_trips ?? 0)
              }
              icon="map-outline"
              tone="accent"
              onPress={hideCompanyLinks ? undefined : () => router.push('/admin/trips')}
            />
            <StatTile
              label="Vehicles"
              value={fleet.total}
              icon="bus-outline"
              tone="info"
              onPress={
                hideCompanyLinks ? undefined : () => router.push('/admin/vehicles')
              }
            />
            <StatTile
              label="Drivers"
              value={crew.total}
              icon="people-outline"
              tone="success"
              onPress={hideCompanyLinks ? undefined : () => router.push('/admin/drivers')}
            />
          </StatRow>

          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <AppText variant="caption" tone="muted">
                  Total Revenue
                </AppText>
                <AppText variant="display" tone="accent">
                  {compactCurrency(
                    usePlatform
                      ? (stats.total_revenue ?? 0)
                      : (revenue.data?.total_revenue ?? 0),
                  )}
                </AppText>
                <AppText variant="caption" tone="faint">
                  {usePlatform
                    ? (stats.trips?.completed ?? 0)
                    : (tripReport.data?.completed ?? 0)}{' '}
                  completed trips
                </AppText>
              </View>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: t.accent.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="trending-up" size={24} color={t.accent.primary} />
              </View>
            </View>
          </Card>

          {canReviewRegistrations && pendingCount > 0 ? (
            <Card tone="accentSoft">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.md,
                }}
              >
                <Ionicons name="person-add-outline" size={22} color={t.accent.primary} />
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <AppText variant="bodyStrong">
                    {pendingCount} account {pendingCount === 1 ? 'request' : 'requests'}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {canManageOrganizations
                      ? 'New companies and users waiting for approval'
                      : 'Waiting for your approval'}
                  </AppText>
                </View>
              </View>
              <Button
                label="Review Requests"
                variant="outline"
                size="sm"
                style={{
                  marginTop: t.spacing.md,
                }}
                onPress={() => router.push('/admin/notifications')}
              />
            </Card>
          ) : null}

          <View
            style={{
              gap: t.spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <AppText
                variant="heading"
                style={{
                  flex: 1,
                }}
              >
                Upcoming Trips
              </AppText>
              {!hideCompanyLinks ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/admin/trips')}
                >
                  <AppText variant="label" tone="accent">
                    View All
                  </AppText>
                </Pressable>
              ) : null}
            </View>

            {upcoming.length ? (
              upcoming.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  showAmount
                  onPress={() => router.push(`/admin/trip/${trip.id}`)}
                />
              ))
            ) : (
              <Card tone="canvas">
                <AppText variant="body" tone="muted">
                  Nothing scheduled yet.
                </AppText>
              </Card>
            )}
          </View>

          <Card>
            <AppText
              variant="heading"
              style={{
                marginBottom: t.spacing.lg,
              }}
            >
              Fleet Overview
            </AppText>
            <Donut
              total={fleet.total}
              slices={[
                {
                  label: 'Active',
                  value: fleet.active,
                  color: '#16A34A',
                },
                {
                  label: 'In Trip',
                  value: fleet.inTrip,
                  color: '#2563EB',
                },
                {
                  label: 'Inactive',
                  value: fleet.inactive,
                  color: '#94A3B8',
                },
              ]}
            />
          </Card>

          <Card>
            <AppText
              variant="heading"
              style={{
                marginBottom: t.spacing.lg,
              }}
            >
              Driver Overview
            </AppText>
            <Donut
              total={crew.total}
              slices={[
                {
                  label: 'Available',
                  value: crew.available,
                  color: '#16A34A',
                },
                {
                  label: 'On Trip',
                  value: crew.onTrip,
                  color: '#2563EB',
                },
                {
                  label: 'Off Duty',
                  value: crew.offDuty,
                  color: '#F59E0B',
                },
              ]}
            />
          </Card>

          {/* The create actions live in the side panel now; this card is the
              console's only list of the sections, so it stays. Both still read
              from useAdminNavigation(), so neither can drift from the panel. */}
          {sections.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.sm,
                }}
              >
                <AppText variant="heading" style={{ flex: 1 }}>
                  Quick Access
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open menu"
                  hitSlop={8}
                  onPress={openDrawer}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: t.accent.primaryDark,
                    }}
                  >
                    All sections
                  </AppText>
                </Pressable>
              </View>
              <Card padded={false} style={{ paddingHorizontal: t.spacing.lg }}>
                {sections.map((section, index) => (
                  <Pressable
                    key={section.key}
                    accessibilityRole="button"
                    accessibilityLabel={section.label}
                    onPress={() => router.push(section.href)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: t.spacing.md,
                      minHeight: t.sizing.tapTarget,
                      paddingVertical: t.spacing.md,
                      borderBottomWidth: index === sections.length - 1 ? 0 : 1,
                      borderBottomColor: t.color.lineSoft,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons name={section.icon} size={20} color={t.accent.primary} />
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <AppText variant="body">{section.label}</AppText>
                      <AppText variant="caption" tone="muted" numberOfLines={1}>
                        {section.hint}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.color.faint} />
                  </Pressable>
                ))}
              </Card>
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
