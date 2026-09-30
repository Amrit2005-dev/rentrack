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
import { useInvoices } from '@/hooks/billing';
import { invoiceStatusMeta, statusMeta } from '@/constants/status';
import { compactCurrency, currency, formatDate, isPast } from '@/utils/format';
import { useTheme } from '@/theme';
/**
 * Invoice history. GET /invoices takes page and page_size only, so the tabs
 * narrow the loaded page. Outstanding is final_amount − paid_amount, the same
 * arithmetic the server uses when it moves an invoice to partial or paid.
 */
export default function InvoicesScreen() {
  const t = useTheme();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const invoices = useInvoices({
    page_size: 200,
  });
  const isLoading = invoices.isLoading && invoices.fetchStatus !== 'idle';
  const rows = invoices.data?.items ?? [];
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
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const final = Number(row.final_amount ?? 0);
          const paid = Number(row.paid_amount ?? 0);
          return {
            billed: acc.billed + final,
            outstanding:
              acc.outstanding +
              (row.status === 'cancelled' ? 0 : Math.max(final - paid, 0)),
          };
        },
        {
          billed: 0,
          outstanding: 0,
        },
      ),
    [rows],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false;
      if (!needle) return true;
      return row.invoice_number?.toLowerCase().includes(needle);
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
      key: 'pending',
      label: 'Pending',
      count: counts.pending ?? 0,
    },
    {
      key: 'partial',
      label: 'Partial',
      count: counts.partial ?? 0,
    },
    {
      key: 'paid',
      label: 'Paid',
      count: counts.paid ?? 0,
    },
  ];
  const onRefresh = async () => {
    setRefreshing(true);
    await invoices.refetch();
    setRefreshing(false);
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader
        title="Invoices"
        subtitle="What has been billed and what is owed"
        back
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New invoice"
            hitSlop={10}
            onPress={() => router.push('/admin/invoices/new')}
          >
            <Ionicons name="add-circle" size={24} color={t.accent.primary} />
          </Pressable>
        }
      />

      {isLoading ? <SkeletonList count={4} /> : null}
      {invoices.error ? (
        <ErrorState error={invoices.error} onRetry={invoices.refetch} />
      ) : null}

      {!isLoading && !invoices.error ? (
        <>
          <StatRow>
            <StatTile
              label="Invoices"
              value={invoices.data?.total ?? rows.length}
              icon="receipt-outline"
              tone="accent"
            />
            <StatTile
              label="Billed"
              value={compactCurrency(totals.billed)}
              icon="cash-outline"
              tone="info"
            />
            <StatTile
              label="Outstanding"
              value={compactCurrency(totals.outstanding)}
              icon="alert-circle-outline"
              tone={totals.outstanding > 0 ? 'warning' : 'success'}
            />
          </StatRow>

          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search invoice number"
          />
          <PillTabs items={tabs} value={filter} onChange={setFilter} />

          {visible.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              {visible.map((row) => {
                const outstanding = Math.max(
                  Number(row.final_amount ?? 0) - Number(row.paid_amount ?? 0),
                  0,
                );
                const overdue =
                  outstanding > 0 && row.due_date ? isPast(row.due_date) : false;
                return (
                  <Pressable
                    key={row.id}
                    accessibilityRole="button"
                    accessibilityLabel={row.invoice_number}
                    onPress={() => router.push(`/admin/invoices/${row.id}`)}
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
                            name="receipt-outline"
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
                            {row.invoice_number}
                          </AppText>
                          <AppText variant="caption" tone="muted" numberOfLines={1}>
                            {clientLabel(row.client_id)} · {row.items?.length ?? 0}{' '}
                            {row.items?.length === 1 ? 'line' : 'lines'}
                          </AppText>
                        </View>
                        <StatusBadge meta={statusMeta(invoiceStatusMeta, row.status)} />
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
                            PAYABLE
                          </AppText>
                          <AppText variant="bodyStrong" tone="accent">
                            {currency(row.final_amount)}
                          </AppText>
                        </View>
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <AppText variant="micro" tone="faint">
                            OUTSTANDING
                          </AppText>
                          <AppText
                            variant="bodyStrong"
                            style={
                              outstanding > 0
                                ? {
                                    color: t.status.warningFg,
                                  }
                                : undefined
                            }
                          >
                            {currency(outstanding)}
                          </AppText>
                        </View>
                        {row.due_date ? (
                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <AppText variant="micro" tone="faint">
                              {overdue ? 'OVERDUE' : 'DUE'}
                            </AppText>
                            <AppText
                              variant="bodyStrong"
                              style={
                                overdue
                                  ? {
                                      color: t.status.dangerFg,
                                    }
                                  : undefined
                              }
                            >
                              {formatDate(row.due_date)}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title={rows.length ? 'Nothing in this bucket' : 'No invoices yet'}
              message={
                rows.length
                  ? 'Try another status or clear the search.'
                  : 'Raise an invoice from a challan or a completed trip.'
              }
              actionLabel={rows.length ? undefined : 'New Invoice'}
              onAction={
                rows.length ? undefined : () => router.push('/admin/invoices/new')
              }
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}
