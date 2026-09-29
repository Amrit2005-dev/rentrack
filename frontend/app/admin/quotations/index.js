import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Card,
  EmptyState,
  ErrorState,
  PillTabs,
  Screen,
  ScreenHeader,
  SearchBar,
  SkeletonList,
  StatRow,
  StatTile,
  StatusBadge,
} from '@/components/ui';
import { clientLabel } from '@/features/billing/ClientField';
import { useQuotations } from '@/hooks/billing';
import { quotationStatusMeta, statusMeta } from '@/constants/status';
import { compactCurrency, currency, formatDate, humanise, isPast } from '@/utils/format';
import { useTheme } from '@/theme';
/**
 * Quotation history. GET /quotations takes page and page_size only, so the
 * tabs narrow the loaded page rather than re-querying.
 */
export default function QuotationsScreen() {
  const t = useTheme();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const quotations = useQuotations({
    page_size: 200,
  });
  const rows = quotations.data?.items ?? [];
  const counts = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          ...acc,
          [row.status]: (acc[row.status] ?? 0) + 1,
        }),
        {},
      ),
    [rows],
  );
  const quoted = rows.reduce((sum, row) => sum + Number(row.total_rate ?? 0), 0);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false;
      if (!needle) return true;
      return (
        row.quotation_number?.toLowerCase().includes(needle) ||
        (row.machine_type ?? '').toLowerCase().includes(needle)
      );
    });
  }, [rows, filter, query]);
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
      key: 'accepted',
      label: 'Accepted',
      count: counts.accepted ?? 0,
    },
    {
      key: 'rejected',
      label: 'Rejected',
      count: counts.rejected ?? 0,
    },
  ];
  const onRefresh = async () => {
    setRefreshing(true);
    await quotations.refetch();
    setRefreshing(false);
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader
        title="Quotations"
        subtitle="Rate offers sent to clients"
        back
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New quotation"
            hitSlop={10}
            onPress={() => router.push('/admin/quotations/new')}
          >
            <Ionicons name="add-circle" size={24} color={t.accent.primary} />
          </Pressable>
        }
      />

      {quotations.isLoading ? <SkeletonList count={4} /> : null}
      {quotations.error ? (
        <ErrorState error={quotations.error} onRetry={quotations.refetch} />
      ) : null}

      {!quotations.isLoading && !quotations.error ? (
        <>
          <StatRow>
            <StatTile
              label="Quotations"
              value={quotations.data?.total ?? rows.length}
              icon="document-text-outline"
              tone="accent"
            />
            <StatTile
              label="Accepted"
              value={counts.accepted ?? 0}
              icon="checkmark-circle-outline"
              tone="success"
            />
            <StatTile
              label="Quoted"
              value={compactCurrency(quoted)}
              icon="pricetag-outline"
              tone="info"
            />
          </StatRow>

          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search number or machine type"
          />
          <PillTabs items={tabs} value={filter} onChange={setFilter} />

          {visible.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              {visible.map((row) => {
                const expired = row.validity_date ? isPast(row.validity_date) : false;
                return (
                  <Pressable
                    key={row.id}
                    accessibilityRole="button"
                    accessibilityLabel={row.quotation_number ?? 'Quotation'}
                    onPress={() => router.push(`/admin/quotations/${row.id}`)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Card
                      padded={false}
                      style={{
                        padding: t.spacing.lg,
                        gap: t.spacing.md,
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
                            name="document-text-outline"
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
                            {row.quotation_number ?? 'Quotation'}
                          </AppText>
                          <AppText variant="caption" tone="muted" numberOfLines={1}>
                            {row.machine_type
                              ? humanise(row.machine_type)
                              : 'Machine not set'}
                            {' · '}
                            {row.client_id ? clientLabel(row.client_id) : 'No client'}
                          </AppText>
                        </View>
                        <StatusBadge meta={statusMeta(quotationStatusMeta, row.status)} />
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: t.spacing.lg,
                          paddingTop: t.spacing.md,
                          borderTopWidth: 1,
                          borderTopColor: t.color.lineSoft,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <AppText variant="micro" tone="faint">
                            TOTAL RATE
                          </AppText>
                          <AppText variant="bodyStrong" tone="accent">
                            {currency(row.total_rate)}
                          </AppText>
                        </View>
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <AppText variant="micro" tone="faint">
                            VALID TILL
                          </AppText>
                          <AppText
                            variant="bodyStrong"
                            style={
                              expired
                                ? {
                                    color: t.status.dangerFg,
                                  }
                                : undefined
                            }
                          >
                            {formatDate(row.validity_date)}
                          </AppText>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="document-text-outline"
              title={rows.length ? 'Nothing in this bucket' : 'No quotations yet'}
              message={
                rows.length
                  ? 'Try another status or clear the search.'
                  : 'Quote a machine rate to start the billing trail.'
              }
              actionLabel={rows.length ? undefined : 'New Quotation'}
              onAction={
                rows.length ? undefined : () => router.push('/admin/quotations/new')
              }
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}
