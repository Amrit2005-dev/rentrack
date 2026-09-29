import React, { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import {
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  SkeletonList,
  UnderlineTabs,
} from '@/components/ui';
import { TripCard } from '@/features/trips/TripCard';
import { useMyTrips } from '@/hooks/trips';
import { TRIP_BUCKETS } from '@/constants/status';
import { useTheme } from '@/theme';
import { MenuButton } from '@/features/shell/MenuButton';
const EMPTY_COPY = {
  upcoming: {
    title: 'No Upcoming Trips',
    message: "You don't have any upcoming trips assigned at the moment.",
  },
  completed: {
    title: 'No Completed Trips',
    message: 'Trips you finish will be listed here.',
  },
  cancelled: {
    title: 'No Cancelled Trips',
    message: 'Nothing has been cancelled. That is good news.',
  },
};
export default function DriverTripsScreen() {
  const t = useTheme();
  const [bucket, setBucket] = useState('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const trips = useMyTrips();
  const grouped = useMemo(() => {
    const all = trips.data?.items ?? [];
    const pick = (statuses) =>
      all
        .filter((trip) => statuses.includes(trip.status))
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    return {
      // A running trip belongs with Upcoming — a driver mid-journey should not
      // have to hunt for it under another tab.
      upcoming: pick([...TRIP_BUCKETS.upcoming, ...TRIP_BUCKETS.active]),
      completed: pick(TRIP_BUCKETS.completed),
      cancelled: pick(TRIP_BUCKETS.cancelled),
    };
  }, [trips.data]);
  const tabs = [
    {
      key: 'upcoming',
      label: 'Upcoming',
      count: grouped.upcoming.length,
    },
    {
      key: 'completed',
      label: 'Completed',
      count: grouped.completed.length,
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: grouped.cancelled.length,
    },
  ];
  const visible = grouped[bucket];
  const onRefresh = async () => {
    setRefreshing(true);
    await trips.refetch();
    setRefreshing(false);
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Trips" large left={<MenuButton />} />

      <UnderlineTabs items={tabs} value={bucket} onChange={setBucket} />

      {trips.isLoading ? <SkeletonList count={3} /> : null}
      {trips.error ? <ErrorState error={trips.error} onRetry={trips.refetch} /> : null}

      {!trips.isLoading && !trips.error ? (
        visible.length ? (
          <View
            style={{
              gap: t.spacing.md,
            }}
          >
            {visible.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() => router.push(`/driver/trip/${trip.id}`)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="clipboard-outline"
            title={EMPTY_COPY[bucket].title}
            message={EMPTY_COPY[bucket].message}
          />
        )
      ) : null}
    </Screen>
  );
}
