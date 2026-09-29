import React, { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineError,
  Notice,
  Screen,
  ScreenHeader,
  SelectField,
  Sheet,
  SkeletonList,
  StatRow,
  StatTile,
  TextField,
} from '@/components/ui';
import { clientLabel } from '@/features/billing/ClientField';
import { useClientLedger, useInvoices, useRecordPayment } from '@/hooks/billing';
import { ledgerEntryMeta, statusMeta } from '@/constants/status';
import { compactCurrency, currency, formatDateTime, humanise } from '@/utils/format';
import { useTheme } from '@/theme';
const PAYMENT_MODES = [
  {
    value: 'cash',
    label: 'Cash',
  },
  {
    value: 'upi',
    label: 'UPI',
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
  },
  {
    value: 'cheque',
    label: 'Cheque',
  },
];

/**
 * One client's statement. The API records a payment as a credit that reduces
 * `balance_after`, so the running balance is what the client still owes.
 *
 * Note for whoever reads the saved entry: the service stores amount, notes and
 * the linked invoice, but drops payment_mode and reference_no — they are in the
 * request schema and not yet persisted.
 */
export default function ClientLedgerScreen() {
  const t = useTheme();
  const params = useLocalSearchParams();
  const clientId = params.clientId;
  const ledger = useClientLedger(clientId, {
    page_size: 200,
  });
  const invoices = useInvoices({
    page_size: 200,
  });
  const record = useRecordPayment(clientId);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('upi');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceId, setInvoiceId] = useState(null);
  const [error, setError] = useState();
  const [refreshing, setRefreshing] = useState(false);
  const entries = ledger.data?.items ?? [];

  /** The newest entry carries the current balance; the list is newest first. */
  const balance = entries.length ? Number(entries[0].balance_after ?? 0) : 0;
  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => {
          const value = Number(entry.amount ?? 0);
          return entry.is_credit
            ? {
                ...acc,
                credited: acc.credited + value,
              }
            : {
                ...acc,
                debited: acc.debited + value,
              };
        },
        {
          credited: 0,
          debited: 0,
        },
      ),
    [entries],
  );
  const clientInvoices = useMemo(
    () =>
      (invoices.data?.items ?? []).filter((invoice) => invoice.client_id === clientId),
    [invoices.data, clientId],
  );
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([ledger.refetch(), invoices.refetch()]);
    setRefreshing(false);
  };
  const submit = () => {
    const parsed = Number(amount);
    if (!amount.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter the amount received');
      return;
    }
    setError(undefined);
    record.mutate(
      {
        amount: parsed,
        payment_mode: mode ?? 'cash',
        reference_no: reference.trim() || null,
        notes: notes.trim() || null,
        invoice_id: invoiceId,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setAmount('');
          setReference('');
          setNotes('');
          setInvoiceId(null);
        },
      },
    );
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader
        title={clientId ? clientLabel(clientId) : 'Ledger'}
        subtitle="Statement of account"
        back
      />

      {ledger.isLoading ? <SkeletonList count={4} /> : null}
      {ledger.error ? <ErrorState error={ledger.error} onRetry={ledger.refetch} /> : null}

      {!ledger.isLoading && !ledger.error ? (
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
                  Current Balance
                </AppText>
                <AppText
                  variant="display"
                  style={{
                    color: balance > 0 ? t.status.warningFg : t.status.successFg,
                  }}
                >
                  {currency(Math.abs(balance))}
                </AppText>
                <AppText variant="caption" tone="faint">
                  {balance > 0
                    ? 'Owed by the client'
                    : balance < 0
                      ? 'Paid in advance'
                      : 'Nothing outstanding'}
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
                <Ionicons name="book-outline" size={24} color={t.accent.primary} />
              </View>
            </View>
          </Card>

          <StatRow>
            <StatTile
              label="Entries"
              value={ledger.data?.total ?? entries.length}
              icon="list-outline"
              tone="accent"
            />
            <StatTile
              label="Debited"
              value={compactCurrency(totals.debited)}
              icon="arrow-up-outline"
              tone="danger"
            />
            <StatTile
              label="Credited"
              value={compactCurrency(totals.credited)}
              icon="arrow-down-outline"
              tone="success"
            />
          </StatRow>

          <Button
            label="Record Payment"
            icon="cash-outline"
            onPress={() => setOpen(true)}
          />

          {entries.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              <AppText variant="heading">Statement</AppText>
              {entries.map((entry) => {
                const credit = entry.is_credit;
                return (
                  <Card
                    key={entry.id}
                    padded={false}
                    style={{
                      padding: t.spacing.lg,
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
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: credit
                            ? t.status.successBg
                            : t.status.dangerBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons
                          name={credit ? 'arrow-down' : 'arrow-up'}
                          size={18}
                          color={credit ? t.status.successFg : t.status.dangerFg}
                        />
                      </View>
                      <View
                        style={{
                          flex: 1,
                          gap: 2,
                        }}
                      >
                        <AppText variant="bodyStrong">
                          {statusMeta(ledgerEntryMeta, entry.entry_type).label}
                          {entry.reference_type
                            ? ` · ${humanise(entry.reference_type)}`
                            : ''}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {formatDateTime(entry.created_at)}
                        </AppText>
                        {entry.notes ? (
                          <AppText variant="caption" tone="faint" numberOfLines={2}>
                            {entry.notes}
                          </AppText>
                        ) : null}
                      </View>
                      <View
                        style={{
                          alignItems: 'flex-end',
                          gap: 2,
                        }}
                      >
                        <AppText
                          variant="bodyStrong"
                          style={{
                            color: credit ? t.status.successFg : t.status.dangerFg,
                          }}
                        >
                          {credit ? '−' : '+'} {currency(entry.amount)}
                        </AppText>
                        <AppText variant="micro" tone="faint">
                          Bal {currency(entry.balance_after)}
                        </AppText>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="book-outline"
              title="No entries yet"
              message="Invoices and payments for this client will appear here."
            />
          )}

          <Sheet visible={open} title="Record payment" onClose={() => setOpen(false)}>
            <View
              style={{
                paddingHorizontal: t.spacing.xl,
                gap: t.spacing.lg,
              }}
            >
              <TextField
                label="Amount Received"
                required
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="decimal-pad"
                icon="cash-outline"
                error={error}
              />
              <SelectField
                label="Payment Mode"
                placeholder="How was it paid"
                options={PAYMENT_MODES}
                value={mode}
                onChange={setMode}
              />
              <TextField
                label="Reference No."
                value={reference}
                onChangeText={setReference}
                placeholder="UTR or cheque number"
              />
              {clientInvoices.length ? (
                <SelectField
                  label="Against Invoice"
                  placeholder="Optional"
                  allowClear
                  searchable={clientInvoices.length > 6}
                  value={invoiceId}
                  onChange={setInvoiceId}
                  options={clientInvoices.map((invoice) => ({
                    value: invoice.id,
                    label: invoice.invoice_number,
                    hint: currency(invoice.final_amount),
                  }))}
                />
              ) : null}
              <TextField
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything worth remembering"
                multiline
              />

              <Notice icon="information-circle-outline">
                The API stores the amount, the linked invoice and the notes. Payment mode
                and reference number are accepted but not yet persisted.
              </Notice>

              {record.error ? <InlineError error={record.error} /> : null}

              <Button label="Save Payment" loading={record.isPending} onPress={submit} />
            </View>
          </Sheet>
        </>
      ) : null}
    </Screen>
  );
}
