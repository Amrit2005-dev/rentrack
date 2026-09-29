import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppText, Avatar, SectionCard, StatusBadge } from '@/components/ui';
import { useDrivers } from '@/hooks/fleet';
import { useTrips } from '@/hooks/trips';
import { driverAvailabilityMeta, statusMeta, tripStatusMeta } from '@/constants/status';
import { currency, formatDate } from '@/utils/format';
import { useTheme } from '@/theme';

/**
 * Who is on this vehicle and where it has been. Neither question has an
 * endpoint of its own — there is no /vehicles/{id}/driver or /trips?vehicle_id
 * — so both are derived from the lists the app already holds: drivers carry
 * `assigned_vehicle_id`, and trips carry `vehicle_id`.
 */
export function VehicleAssignments({ vehicleId }) {
  const t = useTheme();
  const drivers = useDrivers({ page_size: 200 });
  const trips = useTrips({ page_size: 200 });

  const assigned = useMemo(
    () =>
      (drivers.data?.items ?? []).filter(
        (driver) => driver.assigned_vehicle_id === vehicleId,
      ),
    [drivers.data, vehicleId],
  );

  const history = useMemo(() => {
    const rows = (trips.data?.items ?? []).filter(
      (trip) => trip.vehicle_id === vehicleId,
    );
    // Newest first — running work is what someone opening this screen wants.
    return rows
      .slice()
      .sort(
        (a, b) =>
          new Date(b.started_at ?? b.created_at) - new Date(a.started_at ?? a.created_at),
      )
      .slice(0, 6);
  }, [trips.data, vehicleId]);

  const running = history.find(
    (trip) => trip.status === 'in_progress' || trip.status === 'driver_reached',
  );

  return (
    <>
      <SectionCard title="Assigned Crew" icon="person-outline">
        {assigned.length ? (
          assigned.map((driver, index) => (
            <View
              key={driver.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.md,
                paddingVertical: t.spacing.md,
                borderBottomWidth: index === assigned.length - 1 ? 0 : 1,
                borderBottomColor: t.color.lineSoft,
              }}
            >
              <Avatar name={driver.full_name} size={38} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {driver.full_name}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {driver.mobile}
                </AppText>
              </View>
              <StatusBadge
                meta={statusMeta(driverAvailabilityMeta, driver.availability)}
              />
            </View>
          ))
        ) : (
          <AppText variant="body" tone="muted" style={{ paddingVertical: t.spacing.md }}>
            No driver is assigned to this vehicle.
          </AppText>
        )}
      </SectionCard>

      <SectionCard title="Trip Assignments" icon="map-outline">
        {running ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.md,
              padding: t.spacing.md,
              marginBottom: t.spacing.md,
              borderRadius: t.radius.md,
              backgroundColor: t.accent.primaryFaint,
            }}
          >
            <Ionicons name="navigate" size={18} color={t.accent.primary} />
            <AppText variant="caption" tone="body" style={{ flex: 1 }}>
              Out on a trip right now — {running.origin ?? '—'} to{' '}
              {running.destination ?? '—'}.
            </AppText>
          </View>
        ) : null}

        {history.length ? (
          history.map((trip, index) => (
            <View
              key={trip.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.md,
                paddingVertical: t.spacing.md,
                borderBottomWidth: index === history.length - 1 ? 0 : 1,
                borderBottomColor: t.color.lineSoft,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText
                  variant="bodyStrong"
                  numberOfLines={1}
                  onPress={() => router.push(`/admin/trip/${trip.id}`)}
                >
                  {trip.origin ?? '—'} → {trip.destination ?? '—'}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {formatDate(trip.started_at ?? trip.created_at)}
                  {trip.final_amount ? ` · ${currency(trip.final_amount)}` : ''}
                </AppText>
              </View>
              <StatusBadge meta={statusMeta(tripStatusMeta, trip.status)} />
            </View>
          ))
        ) : (
          <AppText variant="body" tone="muted" style={{ paddingVertical: t.spacing.md }}>
            This vehicle has not been on a trip yet.
          </AppText>
        )}
      </SectionCard>
    </>
  );
}
