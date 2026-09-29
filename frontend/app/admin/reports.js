import React, { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
  AppText,
  Card,
  Donut,
  ErrorState,
  Notice,
  PillTabs,
  Screen,
  ScreenHeader,
  SkeletonList,
  StatRow,
  StatTile,
} from '@/components/ui';
import { useRevenueReport, useTripReport } from '@/hooks/billing';
import { statusMeta, tripStatusMeta } from '@/constants/status';
import { compactCurrency, currency, formatDate } from '@/utils/format';
import { useTheme } from '@/theme';
const PERIODS = [
  {
    key: 'month',
    label: 'This Month',
  },
  {
    key: 'quarter',
    label: 'Last 3 Months',
  },
  {
    key: 'year',
    label: 'This FY',
  },
  {
    key: 'all',
    label: 'All Time',
  },
];

/** Indian financial years start in April. */
function rangeFor(period) {
  const now = dayjs();
  switch (period) {
    case 'month':
      return {
        from: now.startOf('month'),
        to: now,
      };
    case 'quarter':
      return {
        from: now.subtract(3, 'month').startOf('day'),
        to: now,
      };
    case 'year': {
      const startYear = now.month() >= 3 ? now.year() : now.year() - 1;
      return {
        from: dayjs(`${startYear}-04-01`),
        to: now,
      };
    }
    default:
      return {
        from: null,
        to: null,
      };
  }
}

/**
 * SRS Module 5 — reporting. Both endpoints filter on `created_at`, so a range
 * is "records raised in this window" rather than trips run or invoices due in
 * it. Revenue is the sum of invoice `final_amount`: what has been billed, not
 * what has been collected.
 */
export default function ReportsScreen() {
  const t = useTheme();
  const [period, setPeriod] = useState('month');
  const [refreshing, setRefreshing] = useState(false);
  const range = useMemo(() => rangeFor(period), [period]);
  const params = useMemo(
    () =>
      range.from && range.to
        ? {
            start_date: range.from.format('YYYY-MM-DDTHH:mm:ss'),
            end_date: range.to.format('YYYY-MM-DDTHH:mm:ss'),
          }
        : {},
    [range],
  );
  const revenue = useRevenueReport(params);
  const trips = useTripReport(params);
  const breakdown = trips.data?.breakdown ?? {};
  const statuses = Object.entries(breakdown);
  // /reports/revenue groups by client by default and returns the split in `rows`.
  const revenueRows = useMemo(
    () =>
      [...(revenue.data?.rows ?? [])].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)),
    [revenue.data],
  );
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([revenue.refetch(), trips.refetch()]);
    setRefreshing(false);
  };
  const loading = revenue.isLoading || trips.isLoading;
  const error = revenue.error ?? trips.error;
  const tones = {
    upcoming: t.accent.primary,
    in_progress: '#F59E0B',
    driver_reached: '#2563EB',
    completed: '#16A34A',
    cancelled: '#DC2626',
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Reports" subtitle="Revenue and operations" back />

      <PillTabs items={PERIODS} value={period} onChange={setPeriod} />

      {range.from ? (
        <AppText variant="caption" tone="muted">
          {formatDate(range.from.toISOString())} — {formatDate(range.to.toISOString())}
        </AppText>
      ) : (
        <AppText variant="caption" tone="muted">
          Every record on the books
        </AppText>
      )}

      {loading ? <SkeletonList count={3} /> : null}
      {error ? <ErrorState error={error} onRetry={onRefresh} /> : null}

      {!loading && !error ? (
        <>
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
                  Billed Revenue
                </AppText>
                <AppText variant="display" tone="accent">
                  {compactCurrency(revenue.data?.total_revenue ?? 0)}
                </AppText>
                <AppText variant="caption" tone="faint">
                  {currency(revenue.data?.total_revenue ?? 0)} invoiced
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

          <StatRow>
            <StatTile
              label="Trips"
              value={trips.data?.total_trips ?? 0}
              icon="map-outline"
              tone="accent"
            />
            <StatTile
              label="Completed"
              value={trips.data?.completed ?? 0}
              icon="checkmark-circle-outline"
              tone="success"
            />
            <StatTile
              label="Cancelled"
              value={trips.data?.cancelled ?? 0}
              icon="close-circle-outline"
              tone="danger"
            />
          </StatRow>

          {statuses.length ? (
            <Card>
              <AppText
                variant="heading"
                style={{
                  marginBottom: t.spacing.lg,
                }}
              >
                Trips by Status
              </AppText>
              <Donut
                total={trips.data?.total_trips ?? 0}
                slices={statuses.map(([status, count]) => ({
                  label: statusMeta(tripStatusMeta, status).label,
                  value: Number(count),
                  color: tones[status] ?? t.color.muted,
                }))}
              />
            </Card>
          ) : (
            <Card tone="canvas">
              <AppText variant="body" tone="muted">
                No trips fall in this window.
              </AppText>
            </Card>
          )}

          {revenueRows.length ? (
            <Card>
              <AppText
                variant="heading"
                style={{
                  marginBottom: t.spacing.lg,
                }}
              >
                Revenue by Client
              </AppText>
              <View
                style={{
                  gap: t.spacing.md,
                }}
              >
                {revenueRows.map((row) => (
                  <View
                    key={row.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: t.spacing.md,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {row.label}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {row.trip_count} {row.trip_count === 1 ? 'trip' : 'trips'}
                      </AppText>
                    </View>
                    <AppText variant="bodyStrong">{currency(row.revenue)}</AppText>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          <Notice icon="information-circle-outline">
            Revenue counts invoice totals, not payments received — check a client ledger
            for what has actually come in.
          </Notice>
        </>
      ) : null}
    </Screen>
  );
}
