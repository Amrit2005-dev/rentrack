import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PillTabs,
  Screen,
  ScreenHeader,
  SkeletonList,
  StatRow,
  StatTile,
} from '@/components/ui';
import { ChallanCard } from '@/features/challans/ChallanCard';
import { useChallans } from '@/hooks/billing';
import { compactCurrency } from '@/utils/format';
import { useTheme } from '@/theme';
/**
 * Challan history. GET /challans takes page and page_size only — there are no
 * status or client filters server-side — so the tabs narrow the loaded page
 * rather than re-querying, which is also why the page size is generous.
 */
export default function ChallansScreen() {
  const t = useTheme();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const challans = useChallans({
    page_size: 200,
  });
  const rows = challans.data?.items ?? [];
  const today = dayjs().format('YYYY-MM-DD');
  const raisedToday = rows.some((challan) => challan.challan_date === today);
  const counts = useMemo(
    () =>
      rows.reduce(
        (acc, challan) => ({
          ...acc,
          [challan.status]: (acc[challan.status] ?? 0) + 1,
        }),
        {},
      ),
    [rows],
  );
  const totals = useMemo(
    () => ({
      hours: rows.reduce((sum, challan) => sum + Number(challan.total_hours ?? 0), 0),
      amount: rows.reduce((sum, challan) => sum + Number(challan.total_amount ?? 0), 0),
    }),
    [rows],
  );
  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((challan) => challan.status === filter)),
    [rows, filter],
  );
  const tabs = [
    {
      key: 'all',
      label: 'All',
      count: rows.length,
    },
    {
      key: 'draft',
      label: 'Draft',
      count: counts.draft ?? 0,
    },
    {
      key: 'sent',
      label: 'Sent',
      count: counts.sent ?? 0,
    },
    {
      key: 'approved',
      label: 'Approved',
      count: counts.approved ?? 0,
    },
  ];
  const onRefresh = async () => {
    setRefreshing(true);
    await challans.refetch();
    setRefreshing(false);
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader
        title="Challans"
        subtitle="Daily running hours and billing documents"
        back
        right={
          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Challan calendar"
              hitSlop={10}
              onPress={() => router.push('/admin/challans/calendar')}
            >
              <Ionicons name="calendar-outline" size={22} color={t.color.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add running hours"
              hitSlop={10}
              onPress={() => router.push('/admin/challans/new')}
            >
              <Ionicons name="add-circle" size={24} color={t.accent.primary} />
            </Pressable>
          </View>
        }
      />

      {challans.isLoading ? <SkeletonList count={4} /> : null}
      {challans.error ? (
        <ErrorState error={challans.error} onRetry={challans.refetch} />
      ) : null}

      {!challans.isLoading && !challans.error ? (
        <>
          {/* SRS: "Create Challan for Today" reminder so no working day is missed. */}
          {!raisedToday ? (
            <Card tone="accentSoft">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.md,
                }}
              >
                <Ionicons name="alarm-outline" size={22} color={t.accent.primary} />
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <AppText variant="bodyStrong">Create Challan for Today</AppText>
                  <AppText variant="caption" tone="muted">
                    No challan has been raised for {dayjs().format('DD MMM YYYY')} yet.
                  </AppText>
                </View>
              </View>
              <Button
                label="Add Running Hours"
                icon="time-outline"
                size="sm"
                style={{
                  marginTop: t.spacing.md,
                }}
                onPress={() => router.push('/admin/challans/new')}
              />
            </Card>
          ) : null}

          <StatRow>
            <StatTile
              label="Challans"
              value={challans.data?.total ?? rows.length}
              icon="receipt-outline"
              tone="accent"
            />
            <StatTile
              label="Hours"
              value={Number(totals.hours.toFixed(1))}
              icon="time-outline"
              tone="info"
            />
            <StatTile
              label="Billed"
              value={compactCurrency(totals.amount)}
              icon="cash-outline"
              tone="success"
            />
          </StatRow>

          <PillTabs items={tabs} value={filter} onChange={setFilter} />

          {visible.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              {visible.map((challan) => (
                <ChallanCard
                  key={challan.id}
                  challan={challan}
                  onPress={() => router.push(`/admin/challans/${challan.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title={rows.length ? 'Nothing in this bucket' : 'No challans yet'}
              message={
                rows.length
                  ? 'Try another status filter.'
                  : "Record the day's running hours to raise your first challan."
              }
              actionLabel={rows.length ? undefined : 'Add Running Hours'}
              onAction={
                rows.length ? undefined : () => router.push('/admin/challans/new')
              }
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}
