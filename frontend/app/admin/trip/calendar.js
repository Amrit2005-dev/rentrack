import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import {
  AppText,
  Calendar,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  SkeletonList,
  StatusBadge,
} from '@/components/ui';
import { useTrips } from '@/hooks/trips';
import { statusMeta, tripStatusMeta } from '@/constants/status';
import { formatDate, formatTime } from '@/utils/format';
import { useTheme } from '@/theme';
/**
 * Month view over the trips list. This API has no calendar endpoint, so the
 * grouping is done client-side from the page already loaded — which is also why
 * the list is fetched at a generous page size.
 */
export default function TripCalendarScreen() {
  const t = useTheme();
  const [selected, setSelected] = useState(() => dayjs());
  const [refreshing, setRefreshing] = useState(false);
  const trips = useTrips({
    page_size: 200,
  });

  /** A trip belongs to the day it departs, falling back to when it was raised. */
  const dayOf = (trip) => dayjs(trip.started_at ?? trip.created_at).format('YYYY-MM-DD');
  const byDay = useMemo(() => {
    const map = new Map();
    for (const trip of trips.data?.items ?? []) {
      const key = dayOf(trip);
      map.set(key, [...(map.get(key) ?? []), trip]);
    }
    return map;
  }, [trips.data]);
  const marked = useMemo(() => {
    const out = {};
    for (const [day, list] of byDay) {
      const allDone = list.every((trip) => trip.status === 'completed');
      const anyRunning = list.some(
        (trip) => trip.status === 'in_progress' || trip.status === 'driver_reached',
      );
      out[day] = allDone ? 'success' : anyRunning ? 'warning' : 'accent';
    }
    return out;
  }, [byDay]);
  const dayTrips = byDay.get(selected.format('YYYY-MM-DD')) ?? [];
  const onRefresh = async () => {
    setRefreshing(true);
    await trips.refetch();
    setRefreshing(false);
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Trip Calendar" subtitle="Scheduled work by day" back />

      {trips.isLoading ? <SkeletonList count={3} /> : null}
      {trips.error ? <ErrorState error={trips.error} onRetry={trips.refetch} /> : null}

      {!trips.isLoading && !trips.error ? (
        <>
          <Card>
            <Calendar value={selected} onSelect={setSelected} markedDates={marked} />
          </Card>

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
              {formatDate(selected.toISOString())}
            </AppText>
            <AppText variant="caption" tone="muted">
              {dayTrips.length} {dayTrips.length === 1 ? 'trip' : 'trips'}
            </AppText>
          </View>

          {dayTrips.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              {dayTrips.map((trip) => (
                <Pressable
                  key={trip.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Trip to ${trip.destination ?? 'destination'}`}
                  onPress={() => router.push(`/admin/trip/${trip.id}`)}
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
                        alignItems: 'center',
                        gap: t.spacing.md,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: t.radius.md,
                          backgroundColor: t.accent.primaryFaint,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color={t.accent.primary}
                        />
                      </View>
                      <View
                        style={{
                          flex: 1,
                          gap: 2,
                        }}
                      >
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {trip.origin ?? 'Origin'} → {trip.destination ?? 'Destination'}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {formatTime(trip.started_at ?? trip.created_at)}
                        </AppText>
                      </View>
                      <StatusBadge meta={statusMeta(tripStatusMeta, trip.status)} />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="Nothing scheduled"
              message="No trips fall on this day."
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}
