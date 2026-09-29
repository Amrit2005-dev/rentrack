import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  Screen,
  SearchBar,
  SkeletonList,
  StatRow,
  StatTile,
} from '@/components/ui';
import { TripCard } from '@/features/trips/TripCard';
import { useDrivers, useVehicles } from '@/hooks/fleet';
import { useTrips } from '@/hooks/trips';
import { TRIP_BUCKETS } from '@/constants/status';
import { usePermissions } from '@/store/auth';
import { useTheme } from '@/theme';
import { MenuButton } from '@/features/shell/MenuButton';
export default function AdminTripsScreen() {
  const t = useTheme();
  const { canManageTrips } = usePermissions();
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const trips = useTrips();
  // Trips carry ids only, so the labels come from the fleet lists.
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const vehicleById = useMemo(() => {
    const map = new Map();
    for (const v of vehicles.data?.items ?? []) map.set(v.id, v.registration_no);
    return map;
  }, [vehicles.data]);
  const driverById = useMemo(() => {
    const map = new Map();
    for (const d of drivers.data?.items ?? []) map.set(d.id, d.full_name);
    return map;
  }, [drivers.data]);
  const rows = trips.data?.items ?? [];
  const counts = useMemo(() => {
    const count = (statuses) => rows.filter((r) => statuses.includes(r.status)).length;
    return {
      total: trips.data?.total ?? rows.length,
      upcoming: count(TRIP_BUCKETS.upcoming),
      active: count(TRIP_BUCKETS.active),
      completed: count(TRIP_BUCKETS.completed),
    };
  }, [rows, trips.data]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const buckets = {
      all: null,
      upcoming: TRIP_BUCKETS.upcoming,
      active: TRIP_BUCKETS.active,
      completed: TRIP_BUCKETS.completed,
    };
    const allowed = buckets[bucket];
    return rows
      .filter((trip) => {
        if (allowed && !allowed.includes(trip.status)) return false;
        if (!needle) return true;
        const vehicle = trip.vehicle_id ? vehicleById.get(trip.vehicle_id) : '';
        const driver = trip.driver_id ? driverById.get(trip.driver_id) : '';
        return (
          trip.origin?.toLowerCase().includes(needle) ||
          trip.destination?.toLowerCase().includes(needle) ||
          vehicle?.toLowerCase().includes(needle) ||
          driver?.toLowerCase().includes(needle)
        );
      })
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [rows, query, bucket, vehicleById, driverById]);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([trips.refetch(), vehicles.refetch(), drivers.refetch()]);
    setRefreshing(false);
  };
  const toggle = (next) => setBucket((prev) => (prev === next ? 'all' : next));
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
          <AppText variant="display">Trips</AppText>
          <AppText variant="caption" tone="muted">
            Schedule, track and close every deployment
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trip calendar"
          hitSlop={10}
          onPress={() => router.push('/admin/trip/calendar')}
          style={{
            paddingTop: 6,
          }}
        >
          <Ionicons name="calendar-outline" size={24} color={t.color.ink} />
        </Pressable>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search by route, vehicle or driver"
        onFilterPress={bucket !== 'all' ? () => setBucket('all') : undefined}
        filterActive={bucket !== 'all'}
      />

      <StatRow>
        <StatTile
          label="Total"
          value={counts.total}
          tone="accent"
          onPress={() => setBucket('all')}
        />
        <StatTile
          label="Upcoming"
          value={counts.upcoming}
          tone="success"
          onPress={() => toggle('upcoming')}
        />
        <StatTile
          label="Running"
          value={counts.active}
          tone="warning"
          onPress={() => toggle('active')}
        />
        <StatTile
          label="Completed"
          value={counts.completed}
          tone="info"
          onPress={() => toggle('completed')}
        />
      </StatRow>

      {canManageTrips ? (
        <Button
          label="Create Trip"
          icon="add-circle-outline"
          onPress={() => router.push('/admin/trip/new')}
        />
      ) : null}

      {trips.isLoading ? <SkeletonList count={4} /> : null}
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
                showAmount
                vehicleLabel={
                  trip.vehicle_id ? vehicleById.get(trip.vehicle_id) : undefined
                }
                driverLabel={trip.driver_id ? driverById.get(trip.driver_id) : undefined}
                onPress={() => router.push(`/admin/trip/${trip.id}`)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="map-outline"
            title={query || bucket !== 'all' ? 'No matching trips' : 'No trips yet'}
            message={
              query || bucket !== 'all'
                ? 'Try a different search or clear the filter.'
                : 'Create your first trip to start tracking deployments.'
            }
          />
        )
      ) : null}
    </Screen>
  );
}
