import React, { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  InfoRow,
  InlineError,
  Notice,
  Screen,
  ScreenHeader,
  SectionCard,
  SelectField,
  Sheet,
  SkeletonList,
  StatusBadge,
  TextField,
} from '@/components/ui';
import { clientLabel } from '@/features/billing/ClientField';
import { useInvoice, useSetInvoiceStatus } from '@/hooks/billing';
import { invoiceStatusMeta, statusMeta } from '@/constants/status';
import { currency, formatDate, formatDateTime, isPast } from '@/utils/format';
import { useTheme } from '@/theme';
const STATUS_OPTIONS = [
  {
    value: 'draft',
    label: 'Draft',
    hint: 'Not sent to the client yet',
  },
  {
    value: 'pending',
    label: 'Pending',
    hint: 'Sent and awaiting payment',
  },
  {
    value: 'partial',
    label: 'Partial',
    hint: 'Some of it has been paid',
  },
  {
    value: 'paid',
    label: 'Paid',
    hint: 'Settled in full',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    hint: 'Withdrawn — nothing is owed',
  },
];

/**
 * Invoice detail. PUT /invoices/{id}/status carries both the new status and an
 * optional paid amount, so recording a part payment and moving the status are
 * the same call.
 */
export default function InvoiceDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams();
  const id = params.id;
  const invoice = useInvoice(id);
  const setStatus = useSetInvoiceStatus(id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [status, setStatusValue] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [error, setError] = useState();
  const data = invoice.data;
  const outstanding = data
    ? Math.max(Number(data.final_amount ?? 0) - Number(data.paid_amount ?? 0), 0)
    : 0;
  const overdue = data?.due_date ? outstanding > 0 && isPast(data.due_date) : false;
  const openSheet = () => {
    setStatusValue(data?.status ?? 'pending');
    setPaidAmount(data?.paid_amount ? String(data.paid_amount) : '');
    setError(undefined);
    setSheetOpen(true);
  };
  const submit = () => {
    if (!status) {
      setError('Pick a status');
      return;
    }
    const parsed = paidAmount.trim() ? Number(paidAmount) : undefined;
    if (parsed !== undefined && (Number.isNaN(parsed) || parsed < 0)) {
      setError('Enter a valid paid amount');
      return;
    }
    setStatus.mutate(
      {
        status,
        paid_amount: parsed,
      },
      {
        onSuccess: () => setSheetOpen(false),
      },
    );
  };
  const confirmCancel = () => {
    const run = () =>
      setStatus.mutate({
        status: 'cancelled',
      });
    const message = 'This invoice will be marked cancelled.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) run();
      return;
    }
    Alert.alert('Cancel invoice', message, [
      {
        text: 'Keep',
        style: 'cancel',
      },
      {
        text: 'Cancel invoice',
        style: 'destructive',
        onPress: run,
      },
    ]);
  };
  return (
    <Screen>
      <ScreenHeader
        title={data?.invoice_number ?? 'Invoice'}
        subtitle={data ? clientLabel(data.client_id) : undefined}
        back
        right={
          data ? (
            <StatusBadge meta={statusMeta(invoiceStatusMeta, data.status)} />
          ) : undefined
        }
      />

      {invoice.isLoading ? <SkeletonList count={3} /> : null}
      {invoice.error ? (
        <ErrorState error={invoice.error} onRetry={invoice.refetch} />
      ) : null}

      {data ? (
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
                  {outstanding > 0 ? 'Outstanding' : 'Invoice Total'}
                </AppText>
                <AppText variant="display" tone="accent">
                  {currency(outstanding > 0 ? outstanding : data.final_amount)}
                </AppText>
                <AppText variant="caption" tone="faint">
                  {currency(data.paid_amount)} paid of {currency(data.final_amount)}
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
                <Ionicons name="receipt-outline" size={24} color={t.accent.primary} />
              </View>
            </View>
          </Card>

          {overdue ? (
            <Notice icon="alert-circle-outline">
              This invoice passed its due date on {formatDate(data.due_date)} with{' '}
              {currency(outstanding)} still open.
            </Notice>
          ) : null}

          <SectionCard title="Amounts" icon="calculator-outline">
            <InfoRow
              label="Subtotal"
              value={currency(data.total_amount)}
              icon="cash-outline"
            />
            <InfoRow
              label="GST"
              value={`+ ${currency(data.gst_amount)}`}
              icon="add-outline"
            />
            <InfoRow
              label="TDS"
              value={`− ${currency(data.tds_amount)}`}
              icon="remove-outline"
            />
            <InfoRow
              label="Payable"
              value={currency(data.final_amount)}
              icon="wallet-outline"
            />
            <InfoRow
              label="Paid"
              value={currency(data.paid_amount)}
              icon="checkmark-circle-outline"
              last
            />
          </SectionCard>

          <SectionCard title="Line Items" icon="list-outline">
            {data.items?.length ? (
              data.items.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing.md,
                    paddingVertical: t.spacing.md,
                    borderBottomWidth: index === data.items.length - 1 ? 0 : 1,
                    borderBottomColor: t.color.lineSoft,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      gap: 2,
                    }}
                  >
                    <AppText variant="body">{item.description}</AppText>
                    {item.challan_id || item.trip_id ? (
                      <AppText variant="caption" tone="faint">
                        {item.challan_id ? 'From challan' : 'From trip'}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="bodyStrong">{currency(item.amount)}</AppText>
                </View>
              ))
            ) : (
              <AppText
                variant="body"
                tone="muted"
                style={{
                  paddingVertical: t.spacing.md,
                }}
              >
                No line items on this invoice.
              </AppText>
            )}
          </SectionCard>

          <SectionCard title="Invoice Information" icon="information-circle-outline">
            <InfoRow
              label="Client"
              value={clientLabel(data.client_id)}
              icon="business-outline"
            />
            <InfoRow
              label="Due Date"
              value={formatDate(data.due_date)}
              icon="calendar-outline"
            />
            <InfoRow
              label="Notes"
              value={data.notes ?? '—'}
              icon="document-text-outline"
            />
            <InfoRow
              label="Created"
              value={formatDateTime(data.created_at)}
              icon="time-outline"
              last
            />
          </SectionCard>

          {setStatus.error ? <InlineError error={setStatus.error} /> : null}

          <Button
            label={outstanding > 0 ? 'Record Payment / Status' : 'Update Status'}
            icon="cash-outline"
            onPress={openSheet}
          />

          <Button
            label="Client Ledger"
            icon="book-outline"
            variant="outline"
            onPress={() => router.push(`/admin/ledger/${data.client_id}`)}
          />

          {data.pdf_url ? (
            <Button
              label="Open PDF"
              icon="document-outline"
              variant="outline"
              onPress={() => void Linking.openURL(data.pdf_url)}
            />
          ) : null}

          {data.status !== 'cancelled' && data.status !== 'paid' ? (
            <Button label="Cancel Invoice" variant="danger" onPress={confirmCancel} />
          ) : null}

          <Sheet
            visible={sheetOpen}
            title="Update invoice"
            onClose={() => setSheetOpen(false)}
          >
            <View
              style={{
                paddingHorizontal: t.spacing.xl,
                gap: t.spacing.lg,
              }}
            >
              <SelectField
                label="Status"
                required
                placeholder="Choose a status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={setStatusValue}
              />
              <TextField
                label="Paid Amount"
                value={paidAmount}
                onChangeText={setPaidAmount}
                placeholder="0"
                keyboardType="decimal-pad"
                icon="cash-outline"
                hint={`Total paid to date, not this instalment. Payable is ${currency(data.final_amount)}.`}
                error={error}
              />
              <Button label="Save" loading={setStatus.isPending} onPress={submit} />
            </View>
          </Sheet>
        </>
      ) : null}
    </Screen>
  );
}
