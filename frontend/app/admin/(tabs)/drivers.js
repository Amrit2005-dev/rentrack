import React, { useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SearchBar,
  SkeletonList,
  StatRow,
  StatTile,
  StatusBadge,
} from '@/components/ui';
import { useDrivers, useVehicles } from '@/hooks/fleet';
import { driverAvailabilityMeta, statusMeta } from '@/constants/status';
import { usePermissions } from '@/store/auth';
import { useTheme } from '@/theme';
import { MenuButton } from '@/features/shell/MenuButton';
export default function DriversScreen() {
  const t = useTheme();
  const { canManageResources } = usePermissions();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const drivers = useDrivers();
  const vehicles = useVehicles();
  const vehicleById = useMemo(() => {
    const map = new Map();
    for (const vehicle of vehicles.data?.items ?? []) {
      map.set(vehicle.id, vehicle.registration_no);
    }
    return map;
  }, [vehicles.data]);
  const rows = drivers.data?.items ?? [];
  const counts = useMemo(
    () => ({
      total: drivers.data?.total ?? rows.length,
      available: rows.filter((d) => d.availability === 'available').length,
      onTrip: rows.filter((d) => d.availability === 'on_trip').length,
      onLeave: rows.filter((d) => d.availability === 'on_leave').length,
    }),
    [rows, drivers.data],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((driver) => {
      if (filter && driver.availability !== filter) return false;
      if (!needle) return true;
      return (
        driver.full_name.toLowerCase().includes(needle) || driver.mobile.includes(needle)
      );
    });
  }, [rows, query, filter]);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([drivers.refetch(), vehicles.refetch()]);
    setRefreshing(false);
  };
  const toggle = (value) => setFilter((prev) => (prev === value ? null : value));
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
          <AppText variant="display">Driver Management</AppText>
          <AppText variant="caption" tone="muted">
            Everyone licensed to run your fleet
          </AppText>
        </View>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search driver by name or phone"
        onFilterPress={filter ? () => setFilter(null) : undefined}
        filterActive={!!filter}
      />

      <StatRow>
        <StatTile
          label="Total"
          value={counts.total}
          tone="accent"
          onPress={() => setFilter(null)}
        />
        <StatTile
          label="Available"
          value={counts.available}
          tone="success"
          onPress={() => toggle('available')}
        />
        <StatTile
          label="On Trip"
          value={counts.onTrip}
          tone="info"
          onPress={() => toggle('on_trip')}
        />
        <StatTile
          label="On Leave"
          value={counts.onLeave}
          tone="warning"
          onPress={() => toggle('on_leave')}
        />
      </StatRow>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.md,
        }}
      >
        <AppText
          variant="heading"
          style={{
            flex: 1,
          }}
        >
          {filter ? statusMeta(driverAvailabilityMeta, filter).label : 'All Drivers'}
          {visible.length ? ` (${visible.length})` : ''}
        </AppText>
        {canManageResources ? (
          <Button
            label="Add Driver"
            icon="add"
            size="sm"
            fullWidth={false}
            onPress={() => router.push('/admin/driver/new')}
          />
        ) : null}
      </View>

      {drivers.isLoading ? <SkeletonList count={4} /> : null}
      {drivers.error ? (
        <ErrorState error={drivers.error} onRetry={drivers.refetch} />
      ) : null}

      {!drivers.isLoading && !drivers.error ? (
        visible.length ? (
          <View
            style={{
              gap: t.spacing.md,
            }}
          >
            {visible.map((driver) => (
              <DriverRow
                key={driver.id}
                driver={driver}
                vehicle={
                  driver.assigned_vehicle_id
                    ? vehicleById.get(driver.assigned_vehicle_id)
                    : undefined
                }
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="people-outline"
            title={query || filter ? 'No matching drivers' : 'No drivers yet'}
            message={
              query || filter
                ? 'Try a different search or clear the filter.'
                : 'Add a driver so you can assign them to trips.'
            }
            actionLabel={
              canManageResources && !query && !filter ? 'Add Driver' : undefined
            }
            onAction={() => router.push('/admin/driver/new')}
          />
        )
      ) : null}
    </Screen>
  );
}
function DriverRow({ driver, vehicle }) {
  const t = useTheme();

  // Sibling pressables, never nested — a Pressable inside a Pressable renders as
  // <button> inside <button> on web and swallows the inner tap.
  return (
    <Card
      padded={false}
      style={{
        padding: t.spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: t.spacing.md,
          alignItems: 'center',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${driver.full_name}, ${statusMeta(driverAvailabilityMeta, driver.availability).label}`}
          onPress={() => router.push(`/admin/driver/${driver.id}`)}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.md,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Avatar name={driver.full_name} size={46} />

          <View
            style={{
              flex: 1,
              gap: 3,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.sm,
              }}
            >
              <AppText
                variant="bodyStrong"
                style={{
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {driver.full_name}
              </AppText>
              <StatusBadge
                meta={statusMeta(driverAvailabilityMeta, driver.availability)}
              />
            </View>
            <AppText variant="caption" tone="muted">
              {driver.mobile}
            </AppText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Ionicons name="bus-outline" size={13} color={t.color.faint} />
              <AppText variant="caption" tone="muted">
                {vehicle ?? 'No vehicle assigned'}
              </AppText>
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Call ${driver.full_name}`}
          onPress={() => Linking.openURL(`tel:${driver.mobile}`)}
          hitSlop={8}
          style={{
            width: 38,
            height: 38,
            borderRadius: t.radius.sm,
            borderWidth: 1,
            borderColor: t.color.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="call-outline" size={17} color={t.accent.primary} />
        </Pressable>
      </View>
    </Card>
  );
}
