import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  DateField,
  InlineError,
  Notice,
  Screen,
  ScreenHeader,
  SectionCard,
  Sheet,
  TextField,
} from '@/components/ui';
import { ClientField } from '@/features/billing/ClientField';
import { useChallans, useCreateInvoice } from '@/hooks/billing';
import { useTrips } from '@/hooks/trips';
import { currency, formatDate } from '@/utils/format';
import { useTheme } from '@/theme';
import { SuperAdminWriteNotice } from '@/features/accounts/SuperAdminWriteNotice';
import { usePermissions } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';
const toNumber = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};
let lineSeq = 0;
const newLine = (partial = {}) => ({
  key: `line-${(lineSeq += 1)}`,
  description: '',
  amount: 0,
  trip_id: null,
  challan_id: null,
  ...partial,
});

/**
 * SRS Module 5 — invoice entry. The server recomputes every total from the
 * line items and the two percentages, so the figures shown here mirror its
 * formula exactly: final = subtotal + GST − TDS.
 */
export default function NewInvoiceScreen() {
  const { canManageOrganizations: isPlatformAdmin } = usePermissions();
  // Managing a company supplies the org_id the create route needs.
  const scopedCompanyId = useScopedCompanyId();
  if (isPlatformAdmin && !scopedCompanyId) {
    return <SuperAdminWriteNotice title="New Invoice" resource="Invoices" />;
  }

  const t = useTheme();
  const create = useCreateInvoice();
  const [clientId, setClientId] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [notes, setNotes] = useState('');
  const [gst, setGst] = useState('18');
  const [tds, setTds] = useState('0');
  const [lines, setLines] = useState([newLine()]);
  const [amounts, setAmounts] = useState({});
  const [picker, setPicker] = useState(null);
  const [formError, setFormError] = useState();
  const challans = useChallans({
    page_size: 100,
  });
  const trips = useTrips({
    page_size: 100,
  });
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
    [lines],
  );
  const gstAmount = (subtotal * (toNumber(gst) ?? 0)) / 100;
  const tdsAmount = (subtotal * (toNumber(tds) ?? 0)) / 100;
  const finalAmount = subtotal + gstAmount - tdsAmount;
  const setLine = (key, patch) =>
    setLines((prev) =>
      prev.map((line) =>
        line.key === key
          ? {
              ...line,
              ...patch,
            }
          : line,
      ),
    );
  const addFromChallan = (challanId, label, amount) => {
    setLines((prev) => [
      ...prev.filter((line) => line.description || line.amount),
      newLine({
        description: label,
        amount,
        challan_id: challanId,
      }),
    ]);
    setPicker(null);
  };
  const addFromTrip = (tripId, label, amount) => {
    setLines((prev) => [
      ...prev.filter((line) => line.description || line.amount),
      newLine({
        description: label,
        amount,
        trip_id: tripId,
      }),
    ]);
    setPicker(null);
  };
  const submit = () => {
    if (!clientId) {
      setFormError('An invoice must be raised against a client');
      return;
    }
    const items = lines.filter(
      (line) => line.description.trim() && Number(line.amount) > 0,
    );
    if (!items.length) {
      setFormError('Add at least one line with a description and an amount');
      return;
    }
    setFormError(undefined);
    create.mutate(
      {
        client_id: clientId,
        due_date: dueDate,
        notes: notes.trim() || null,
        gst_percentage: toNumber(gst) ?? 0,
        tds_percentage: toNumber(tds) ?? 0,
        items: items.map(({ description, amount, trip_id, challan_id }) => ({
          description: description.trim(),
          amount: Number(amount),
          trip_id,
          challan_id,
        })),
      },
      {
        onSuccess: (invoice) => router.replace(`/admin/invoices/${invoice.id}`),
      },
    );
  };
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <ScreenHeader
          title="New Invoice"
          subtitle="Bill a client for completed work"
          back
        />

        <SectionCard title="Invoice Details" icon="receipt-outline">
          <ClientField
            value={clientId}
            onChange={setClientId}
            hint="Required — the invoice and its ledger entries hang off the client."
          />
          <DateField
            label="Due Date"
            value={dueDate}
            onChange={setDueDate}
            hint="When payment is expected."
          />
        </SectionCard>

        <SectionCard title="Line Items" icon="list-outline">
          {lines.map((line, index) => (
            <View
              key={line.key}
              style={{
                gap: t.spacing.sm,
                marginBottom: t.spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <AppText
                  variant="label"
                  tone="muted"
                  style={{
                    flex: 1,
                  }}
                >
                  Line {index + 1}
                  {line.challan_id
                    ? ' · from challan'
                    : line.trip_id
                      ? ' · from trip'
                      : ''}
                </AppText>
                {lines.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove line ${index + 1}`}
                    hitSlop={8}
                    onPress={() =>
                      setLines((prev) => prev.filter((item) => item.key !== line.key))
                    }
                  >
                    <Ionicons name="close-circle" size={20} color={t.color.faint} />
                  </Pressable>
                ) : null}
              </View>
              <TextField
                value={line.description}
                onChangeText={(text) =>
                  setLine(line.key, {
                    description: text,
                  })
                }
                placeholder="Machine hire — August"
              />
              <TextField
                value={amounts[line.key] ?? (line.amount ? String(line.amount) : '')}
                onChangeText={(text) => {
                  setAmounts((prev) => ({
                    ...prev,
                    [line.key]: text,
                  }));
                  setLine(line.key, {
                    amount: toNumber(text) ?? 0,
                  });
                }}
                placeholder="0"
                keyboardType="decimal-pad"
                icon="cash-outline"
                suffix="₹"
              />
            </View>
          ))}

          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.sm,
            }}
          >
            <Button
              label="Add Line"
              variant="outline"
              size="sm"
              icon="add"
              style={{
                flex: 1,
              }}
              onPress={() => setLines((prev) => [...prev, newLine()])}
            />
            <Button
              label="From Challan"
              variant="outline"
              size="sm"
              icon="receipt-outline"
              style={{
                flex: 1,
              }}
              onPress={() => setPicker('challan')}
            />
            <Button
              label="From Trip"
              variant="outline"
              size="sm"
              icon="map-outline"
              style={{
                flex: 1,
              }}
              onPress={() => setPicker('trip')}
            />
          </View>
        </SectionCard>

        <SectionCard title="Taxes" icon="calculator-outline">
          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            <TextField
              label="GST %"
              containerStyle={{
                flex: 1,
              }}
              value={gst}
              onChangeText={setGst}
              keyboardType="decimal-pad"
              placeholder="18"
            />
            <TextField
              label="TDS %"
              containerStyle={{
                flex: 1,
              }}
              value={tds}
              onChangeText={setTds}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>

          <View
            style={{
              backgroundColor: t.accent.primaryFaint,
              borderRadius: t.radius.md,
              padding: t.spacing.md,
              gap: 6,
            }}
          >
            <Row label="Subtotal" value={currency(subtotal)} />
            <Row
              label={`GST (${toNumber(gst) ?? 0}%)`}
              value={`+ ${currency(gstAmount)}`}
            />
            <Row
              label={`TDS (${toNumber(tds) ?? 0}%)`}
              value={`− ${currency(tdsAmount)}`}
            />
            <View
              style={{
                height: 1,
                backgroundColor: t.accent.primarySoft,
                marginVertical: 4,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
              }}
            >
              <AppText
                variant="bodyStrong"
                style={{
                  flex: 1,
                }}
              >
                Payable
              </AppText>
              <AppText variant="bodyStrong" tone="accent">
                {currency(finalAmount)}
              </AppText>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Notes" icon="document-text-outline">
          <TextField
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything the client should see on the invoice"
            multiline
          />
        </SectionCard>

        {formError ? (
          <AppText variant="caption" tone="danger">
            {formError}
          </AppText>
        ) : null}
        {create.error ? <InlineError error={create.error} /> : null}

        <Button
          label="Create Invoice"
          icon="receipt-outline"
          loading={create.isPending}
          onPress={submit}
        />

        <Sheet
          visible={picker === 'challan'}
          title="Add from challan"
          onClose={() => setPicker(null)}
        >
          <View
            style={{
              paddingHorizontal: t.spacing.xl,
              gap: t.spacing.sm,
            }}
          >
            {(challans.data?.items ?? []).length ? (
              (challans.data?.items ?? []).slice(0, 15).map((challan) => (
                <Pressable
                  key={challan.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Challan ${formatDate(challan.challan_date)}`}
                  onPress={() =>
                    addFromChallan(
                      challan.id,
                      `Challan ${formatDate(challan.challan_date)} — ${Number(challan.total_hours ?? 0)} h`,
                      Number(challan.total_amount ?? 0),
                    )
                  }
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
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <AppText variant="bodyStrong">
                          {formatDate(challan.challan_date)}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {Number(challan.total_hours ?? 0)} h · {challan.items.length}{' '}
                          vehicles
                        </AppText>
                      </View>
                      <AppText variant="bodyStrong" tone="accent">
                        {currency(challan.total_amount)}
                      </AppText>
                    </View>
                  </Card>
                </Pressable>
              ))
            ) : (
              <Notice icon="information-circle-outline">No challans to bill yet.</Notice>
            )}
          </View>
        </Sheet>

        <Sheet
          visible={picker === 'trip'}
          title="Add from trip"
          onClose={() => setPicker(null)}
        >
          <View
            style={{
              paddingHorizontal: t.spacing.xl,
              gap: t.spacing.sm,
            }}
          >
            {(trips.data?.items ?? []).length ? (
              (trips.data?.items ?? [])
                .filter((trip) => trip.status === 'completed')
                .slice(0, 15)
                .map((trip) => (
                  <Pressable
                    key={trip.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Trip to ${trip.destination ?? 'destination'}`}
                    onPress={() =>
                      addFromTrip(
                        trip.id,
                        `Trip ${trip.origin ?? '—'} → ${trip.destination ?? '—'}`,
                        Number(trip.final_amount ?? 0),
                      )
                    }
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
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <AppText variant="bodyStrong" numberOfLines={1}>
                            {trip.origin ?? '—'} → {trip.destination ?? '—'}
                          </AppText>
                          <AppText variant="caption" tone="muted">
                            {formatDate(trip.completed_at ?? trip.created_at)}
                          </AppText>
                        </View>
                        <AppText variant="bodyStrong" tone="accent">
                          {currency(trip.final_amount)}
                        </AppText>
                      </View>
                    </Card>
                  </Pressable>
                ))
            ) : (
              <Notice icon="information-circle-outline">
                No completed trips to bill.
              </Notice>
            )}
          </View>
        </Sheet>
      </Screen>
    </KeyboardAvoidingView>
  );
}
function Row({ label, value }) {
  return (
    <View
      style={{
        flexDirection: 'row',
      }}
    >
      <AppText
        variant="caption"
        tone="muted"
        style={{
          flex: 1,
        }}
      >
        {label}
      </AppText>
      <AppText variant="caption">{value}</AppText>
    </View>
  );
}
