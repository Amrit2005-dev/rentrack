import React, { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Calendar,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  SkeletonList,
} from '@/components/ui';
import { ChallanCard } from '@/features/challans/ChallanCard';
import { useChallans } from '@/hooks/billing';
import { currency, formatDate } from '@/utils/format';
import { useTheme } from '@/theme';
/**
 * Month view over the challan history. The API defines a CalendarEntry schema
 * but exposes no route for it, so the per-day markers are grouped client-side
 * from the loaded page — hence the generous page size.
 */
export default function ChallanCalendarScreen() {
  const t = useTheme();
  const [selected, setSelected] = useState(() => dayjs());
  const [refreshing, setRefreshing] = useState(false);
  const challans = useChallans({
    page_size: 200,
  });
  const byDay = useMemo(() => {
    const map = new Map();
    for (const challan of challans.data?.items ?? []) {
      const key = dayjs(challan.challan_date).format('YYYY-MM-DD');
      map.set(key, [...(map.get(key) ?? []), challan]);
    }
    return map;
  }, [challans.data]);

  /** Green once every challan of the day is approved, blue when any is sent. */
  const marked = useMemo(() => {
    const out = {};
    for (const [day, list] of byDay) {
      const allApproved = list.every((challan) => challan.status === 'approved');
      const anySent = list.some((challan) => challan.status === 'sent');
      out[day] = allApproved ? 'success' : anySent ? 'warning' : 'accent';
    }
    return out;
  }, [byDay]);
  const key = selected.format('YYYY-MM-DD');
  const dayChallans = byDay.get(key) ?? [];
  const dayTotal = dayChallans.reduce(
    (sum, challan) => sum + Number(challan.total_amount ?? 0),
    0,
  );
  const isToday = key === dayjs().format('YYYY-MM-DD');
  const onRefresh = async () => {
    setRefreshing(true);
    await challans.refetch();
    setRefreshing(false);
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Challan Calendar" subtitle="Billing activity by day" back />

      {challans.isLoading ? <SkeletonList count={3} /> : null}
      {challans.error ? (
        <ErrorState error={challans.error} onRetry={challans.refetch} />
      ) : null}

      {!challans.isLoading && !challans.error ? (
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
            {dayChallans.length ? (
              <AppText variant="caption" tone="accent">
                {currency(dayTotal)}
              </AppText>
            ) : null}
          </View>

          {dayChallans.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              {dayChallans.map((challan) => (
                <ChallanCard
                  key={challan.id}
                  challan={challan}
                  onPress={() => router.push(`/admin/challans/${challan.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No challan on this day"
              message={
                isToday
                  ? "Today's running hours have not been recorded yet."
                  : 'Nothing was billed on this date.'
              }
            />
          )}

          <Button
            label={
              isToday ? 'Add Running Hours' : `Add Hours for ${selected.format('DD MMM')}`
            }
            icon="time-outline"
            variant={dayChallans.length ? 'outline' : 'primary'}
            onPress={() => router.push('/admin/challans/new')}
          />
        </>
      ) : null}
    </Screen>
  );
}
