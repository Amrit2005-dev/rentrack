import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Badge,
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
import { expiryStatusMeta, statusMeta, vehicleStatusMeta } from '@/constants/status';
import { usePermissions } from '@/store/auth';
import { useTheme } from '@/theme';
import { MenuButton } from '@/features/shell/MenuButton';
export default function VehiclesScreen() {
  const t = useTheme();
  const { canManageResources } = usePermissions();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const vehicles = useVehicles();
  // The list payload has no driver field; the driver record owns the link.
  const drivers = useDrivers();
  const driverByVehicle = useMemo(() => {
    const map = new Map();
    for (const driver of drivers.data?.items ?? []) {
      if (driver.assigned_vehicle_id)
        map.set(driver.assigned_vehicle_id, driver.full_name);
    }
    return map;
  }, [drivers.data]);
  const rows = vehicles.data?.items ?? [];
  const counts = useMemo(
    () => ({
      total: vehicles.data?.total ?? rows.length,
      active: rows.filter((v) => v.status === 'active').length,
      idle: rows.filter((v) => v.status === 'idle').length,
      maintenance: rows.filter((v) => v.status === 'maintenance').length,
    }),
    [rows, vehicles.data],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((vehicle) => {
      if (filter && vehicle.status !== filter) return false;
      if (!needle) return true;
      return (
        vehicle.registration_no.toLowerCase().includes(needle) ||
        vehicle.type.toLowerCase().includes(needle)
      );
    });
  }, [rows, query, filter]);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([vehicles.refetch(), drivers.refetch()]);
    setRefreshing(false);
  };
  const toggle = (status) => setFilter((prev) => (prev === status ? null : status));
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
          <AppText variant="display">Vehicle Management</AppText>
          <AppText variant="caption" tone="muted">
            Fleet registered to your organisation
          </AppText>
        </View>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search by number or type"
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
          label="Active"
          value={counts.active}
          tone="success"
          onPress={() => toggle('active')}
        />
        <StatTile
          label="Idle"
          value={counts.idle}
          tone="info"
          onPress={() => toggle('idle')}
        />
        <StatTile
          label="Service"
          value={counts.maintenance}
          tone="warning"
          onPress={() => toggle('maintenance')}
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
          {filter ? statusMeta(vehicleStatusMeta, filter).label : 'All Vehicles'}
          {visible.length ? ` (${visible.length})` : ''}
        </AppText>
        {canManageResources ? (
          <Button
            label="Add Vehicle"
            icon="add"
            size="sm"
            fullWidth={false}
            onPress={() => router.push('/admin/vehicle/new')}
          />
        ) : null}
      </View>

      {vehicles.isLoading ? <SkeletonList count={4} /> : null}
      {vehicles.error ? (
        <ErrorState error={vehicles.error} onRetry={vehicles.refetch} />
      ) : null}

      {!vehicles.isLoading && !vehicles.error ? (
        visible.length ? (
          <View
            style={{
              gap: t.spacing.md,
            }}
          >
            {visible.map((vehicle) => (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                driverName={driverByVehicle.get(vehicle.id)}
                canEdit={canManageResources}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="bus-outline"
            title={query || filter ? 'No matching vehicles' : 'No vehicles yet'}
            message={
              query || filter
                ? 'Try a different search or clear the filter.'
                : 'Add your first vehicle to start scheduling trips.'
            }
            actionLabel={
              canManageResources && !query && !filter ? 'Add Vehicle' : undefined
            }
            onAction={() => router.push('/admin/vehicle/new')}
          />
        )
      ) : null}
    </Screen>
  );
}
function VehicleRow({ vehicle, driverName, canEdit }) {
  const t = useTheme();

  /** Any document not in a 'valid' state earns a badge on the row. */
  const alerts = [
    ['RC', vehicle.rc_expiry_status],
    ['Ins', vehicle.insurance_expiry_status],
    ['Fit', vehicle.fitness_expiry_status],
    ['PUC', vehicle.pollution_expiry_status],
  ].filter(([, value]) => value && value !== 'valid');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${vehicle.registration_no}, ${statusMeta(vehicleStatusMeta, vehicle.status).label}`}
      onPress={() => router.push(`/admin/vehicle/${vehicle.id}`)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
      })}
    >
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
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: t.radius.md,
              backgroundColor: t.accent.primaryFaint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="bus-outline" size={24} color={t.accent.primary} />
          </View>

          <View
            style={{
              flex: 1,
              gap: 4,
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
                {vehicle.registration_no}
              </AppText>
              <StatusBadge meta={statusMeta(vehicleStatusMeta, vehicle.status)} />
            </View>

            <AppText variant="caption" tone="muted">
              {vehicle.type}
              {vehicle.capacity_tons != null ? ` · ${vehicle.capacity_tons} Ton` : ''}
            </AppText>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Ionicons name="person-outline" size={13} color={t.color.faint} />
              <AppText variant="caption" tone="muted">
                {driverName ?? 'No driver assigned'}
              </AppText>
            </View>

            {alerts.length ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 2,
                }}
              >
                {alerts.map(([label, value]) => (
                  <Badge
                    key={label}
                    label={`${label} ${statusMeta(expiryStatusMeta, value).label.toLowerCase()}`}
                    tone={statusMeta(expiryStatusMeta, value).tone}
                  />
                ))}
              </View>
            ) : null}
          </View>

          {canEdit ? (
            <View
              style={{
                justifyContent: 'center',
              }}
            >
              <Ionicons name="create-outline" size={18} color={t.color.faint} />
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
