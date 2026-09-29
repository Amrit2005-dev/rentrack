import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  Screen,
  ScreenHeader,
  SearchBar,
  SkeletonList,
} from '@/components/ui';
import { clientLabel } from '@/features/billing/ClientField';
import { useInvoices } from '@/hooks/billing';
import { currency } from '@/utils/format';
import { useTheme } from '@/theme';
/**
 * The ledger is addressed per client — GET /ledger/?client_id=… — and the
 * clients listed here are the ones that already have invoices, because that is
 * what a statement is for. Their outstanding figures come from those invoices,
 * which is the same arithmetic the ledger balance follows.
 */
export default function LedgerIndexScreen() {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const invoices = useInvoices({
    page_size: 200,
  });
  const clients = useMemo(() => {
    const map = new Map();
    for (const invoice of invoices.data?.items ?? []) {
      if (!invoice.client_id) continue;
      const row = map.get(invoice.client_id) ?? {
        id: invoice.client_id,
        invoices: 0,
        billed: 0,
        outstanding: 0,
      };
      row.invoices += 1;
      row.billed += Number(invoice.final_amount ?? 0);
      if (invoice.status !== 'cancelled') {
        row.outstanding += Math.max(
          Number(invoice.final_amount ?? 0) - Number(invoice.paid_amount ?? 0),
          0,
        );
      }
      map.set(invoice.client_id, row);
    }
    return [...map.values()].sort((a, b) => b.outstanding - a.outstanding);
  }, [invoices.data]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) =>
      clientLabel(client.id).toLowerCase().includes(needle),
    );
  }, [clients, query]);
  return (
    <Screen>
      <ScreenHeader title="Client Ledger" subtitle="Statements and payments" back />

      {invoices.isLoading ? <SkeletonList count={3} /> : null}
      {invoices.error ? (
        <ErrorState error={invoices.error} onRetry={invoices.refetch} />
      ) : null}

      {!invoices.isLoading && !invoices.error ? (
        <>
          <Notice icon="information-circle-outline">
            Clients appear here once they have an invoice.
          </Notice>

          {clients.length ? (
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search client"
            />
          ) : null}

          {visible.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              {visible.map((client) => (
                <Pressable
                  key={client.id}
                  accessibilityRole="button"
                  accessibilityLabel={clientLabel(client.id)}
                  onPress={() => router.push(`/admin/ledger/${client.id}`)}
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
                          name="business-outline"
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
                        <AppText variant="bodyStrong">{clientLabel(client.id)}</AppText>
                        <AppText variant="caption" tone="muted">
                          {client.invoices}{' '}
                          {client.invoices === 1 ? 'invoice' : 'invoices'}
                        </AppText>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={t.color.faint} />
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
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
                          BILLED
                        </AppText>
                        <AppText variant="bodyStrong">{currency(client.billed)}</AppText>
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
                            client.outstanding > 0
                              ? {
                                  color: t.status.warningFg,
                                }
                              : undefined
                          }
                        >
                          {currency(client.outstanding)}
                        </AppText>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="book-outline"
              title={clients.length ? 'No client matches' : 'No ledgers yet'}
              message={
                clients.length
                  ? 'Clear the search to see every client.'
                  : 'Raise an invoice and the client statement starts here.'
              }
              actionLabel={clients.length ? undefined : 'New Invoice'}
              onAction={
                clients.length ? undefined : () => router.push('/admin/invoices/new')
              }
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}
