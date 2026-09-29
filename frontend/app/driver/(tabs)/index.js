import React, { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonList,
  StatRow,
  StatTile,
} from '@/components/ui';
import { TripCard } from '@/features/trips/TripCard';
import { useMyTrips } from '@/hooks/trips';
import { useCurrentUser } from '@/store/auth';
import { TRIP_BUCKETS } from '@/constants/status';
import { displayName } from '@/utils/permissions';
import { formatDate, formatTime } from '@/utils/format';
import { useTheme } from '@/theme';
import { MenuButton } from '@/features/shell/MenuButton';

/**
 * The driver's own board. GET /trips/my is already scoped to them server-side,
 * so everything here derives from that one call.
 */
export default function DriverDashboard() {
  const t = useTheme();
  const user = useCurrentUser();
  const [refreshing, setRefreshing] = useState(false);
  const trips = useMyTrips();
  const summary = useMemo(() => {
    const all = trips.data?.items ?? [];
    const inBucket = (statuses) => all.filter((trip) => statuses.includes(trip.status));
    const active = inBucket(TRIP_BUCKETS.active);
    const upcoming = inBucket(TRIP_BUCKETS.upcoming).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return {
      active,
      upcoming,
      completed: inBucket(TRIP_BUCKETS.completed).length,
      current: active[0] ?? upcoming[0] ?? null,
    };
  }, [trips.data]);
  const onRefresh = async () => {
    setRefreshing(true);
    await trips.refetch();
    setRefreshing(false);
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.md,
        }}
      >
        <MenuButton />
        <Avatar name={displayName(user)} size={48} />
        <View
          style={{
            flex: 1,
          }}
        >
          <AppText variant="caption" tone="muted">
            Welcome back
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {displayName(user)}
          </AppText>
        </View>
      </View>

      {trips.isLoading ? <SkeletonList count={3} /> : null}
      {trips.error ? <ErrorState error={trips.error} onRetry={trips.refetch} /> : null}

      {!trips.isLoading && !trips.error ? (
        <>
          <StatRow>
            <StatTile
              label="Upcoming"
              value={summary.upcoming.length}
              icon="calendar-outline"
              tone="accent"
            />
            <StatTile
              label="In Progress"
              value={summary.active.length}
              icon="navigate-outline"
              tone="warning"
            />
            <StatTile
              label="Completed"
              value={summary.completed}
              icon="checkmark-circle-outline"
              tone="success"
            />
          </StatRow>

          {summary.active.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              <AppText variant="heading">Active Trip</AppText>
              {summary.active.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => router.push(`/driver/trip/${trip.id}`)}
                />
              ))}
            </View>
          ) : null}

          <View
            style={{
              gap: t.spacing.md,
            }}
          >
            <AppText variant="heading">Upcoming Trips</AppText>
            {summary.upcoming.length ? (
              summary.upcoming
                .slice(0, 3)
                .map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onPress={() => router.push(`/driver/trip/${trip.id}`)}
                  />
                ))
            ) : (
              <EmptyState
                icon="calendar-outline"
                title="No Upcoming Trips"
                message="You don't have any upcoming trips assigned at the moment."
              />
            )}
          </View>

          {summary.current ? (
            <Card tone="canvas">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.md,
                }}
              >
                <Ionicons name="time-outline" size={20} color={t.accent.primary} />
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <AppText variant="caption" tone="muted">
                    Next departure
                  </AppText>
                  <AppText variant="bodyStrong">
                    {formatDate(summary.current.started_at ?? summary.current.created_at)}{' '}
                    at{' '}
                    {formatTime(summary.current.started_at ?? summary.current.created_at)}
                  </AppText>
                </View>
              </View>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
