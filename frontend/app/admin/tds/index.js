import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineError,
  Notice,
  PillTabs,
  Screen,
  ScreenHeader,
  SelectField,
  Sheet,
  SkeletonList,
  StatRow,
  StatTile,
  TextField,
} from '@/components/ui';
import { ClientField, clientLabel } from '@/features/billing/ClientField';
import {
  useCreateTds,
  useInvoices,
  useTdsRecords,
  useUpdateTdsCertificate,
} from '@/hooks/billing';
import { compactCurrency, currency, formatDate } from '@/utils/format';
import { useTheme } from '@/theme';
/** Indian financial years run April to March. */
function financialYears(count = 4) {
  const now = dayjs();
  const startYear = now.month() >= 3 ? now.year() : now.year() - 1;
  return Array.from(
    {
      length: count,
    },
    (_, index) => {
      const from = startYear - index;
      return `${from}-${String((from + 1) % 100).padStart(2, '0')}`;
    },
  );
}

/**
 * SRS Module 5 — TDS register. GET /tds takes page and page_size only, so the
 * financial-year tabs narrow the loaded page. PUT /tds/{id} accepts a
 * certificate number and nothing else, which is why that is the only field the
 * edit sheet offers.
 */
export default function TdsScreen() {
  const t = useTheme();
  const years = useMemo(() => financialYears(), []);
  const [year, setYear] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const records = useTdsRecords({
    page_size: 200,
  });
  const invoices = useInvoices({
    page_size: 200,
  });
  const create = useCreateTds();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [invoiceId, setInvoiceId] = useState(null);
  const [financialYear, setFinancialYear] = useState(years[0]);
  const [percentage, setPercentage] = useState('2');
  const [deducted, setDeducted] = useState('');
  const [certificate, setCertificate] = useState('');
  const [error, setError] = useState();
  const rows = records.data?.items ?? [];
  const visible = useMemo(
    () => (year === 'all' ? rows : rows.filter((row) => row.financial_year === year)),
    [rows, year],
  );
  const totals = useMemo(
    () => ({
      deducted: visible.reduce((sum, row) => sum + Number(row.deducted_amount ?? 0), 0),
      certified: visible.filter((row) => row.certificate_number).length,
    }),
    [visible],
  );
  const tabs = [
    {
      key: 'all',
      label: 'All',
      count: rows.length,
    },
    ...years.map((value) => ({
      key: value,
      label: value,
      count: rows.filter((row) => row.financial_year === value).length,
    })),
  ];
  const onRefresh = async () => {
    setRefreshing(true);
    await records.refetch();
    setRefreshing(false);
  };
  const openCreate = () => {
    setClientId(null);
    setInvoiceId(null);
    setFinancialYear(years[0]);
    setPercentage('2');
    setDeducted('');
    setCertificate('');
    setError(undefined);
    create.reset();
    setCreateOpen(true);
  };

  /** Picking an invoice fills the client and the deducted amount it carries. */
  const chooseInvoice = (next) => {
    setInvoiceId(next);
    const invoice = (invoices.data?.items ?? []).find((row) => row.id === next);
    if (!invoice) return;
    setClientId(invoice.client_id);
    if (Number(invoice.tds_amount ?? 0) > 0) setDeducted(String(invoice.tds_amount));
  };
  const submitCreate = () => {
    if (!clientId) {
      setError('A TDS entry belongs to a client');
      return;
    }
    if (!financialYear) {
      setError('Pick the financial year');
      return;
    }
    const pct = Number(percentage);
    const amount = Number(deducted);
    if (Number.isNaN(pct) || pct < 0) {
      setError('Enter a valid TDS percentage');
      return;
    }
    if (!deducted.trim() || Number.isNaN(amount) || amount <= 0) {
      setError('Enter the amount deducted');
      return;
    }
    setError(undefined);
    create.mutate(
      {
        client_id: clientId,
        invoice_id: invoiceId,
        financial_year: financialYear,
        tds_percentage: pct,
        deducted_amount: amount,
        certificate_number: certificate.trim() || null,
      },
      {
        onSuccess: () => setCreateOpen(false),
      },
    );
  };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader
        title="TDS Register"
        subtitle="Tax deducted at source, by financial year"
        back
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New TDS entry"
            hitSlop={10}
            onPress={openCreate}
          >
            <Ionicons name="add-circle" size={24} color={t.accent.primary} />
          </Pressable>
        }
      />

      {records.isLoading ? <SkeletonList count={4} /> : null}
      {records.error ? (
        <ErrorState error={records.error} onRetry={records.refetch} />
      ) : null}

      {!records.isLoading && !records.error ? (
        <>
          <StatRow>
            <StatTile
              label="Entries"
              value={visible.length}
              icon="document-text-outline"
              tone="accent"
            />
            <StatTile
              label="Deducted"
              value={compactCurrency(totals.deducted)}
              icon="remove-circle-outline"
              tone="warning"
            />
            <StatTile
              label="Certified"
              value={totals.certified}
              icon="ribbon-outline"
              tone="success"
            />
          </StatRow>

          <PillTabs items={tabs} value={year} onChange={setYear} />

          {visible.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              {visible.map((row) => (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  accessibilityLabel={`TDS ${row.financial_year}`}
                  onPress={() => {
                    setEditing(row);
                    setCertificate(row.certificate_number ?? '');
                    setError(undefined);
                  }}
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
                          name="pricetags-outline"
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
                        <AppText variant="bodyStrong">
                          {clientLabel(row.client_id)}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          FY {row.financial_year} · {Number(row.tds_percentage)}%
                        </AppText>
                      </View>
                      <Badge
                        label={row.certificate_number ? 'Certified' : 'No certificate'}
                        tone={row.certificate_number ? 'success' : 'warning'}
                      />
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
                          DEDUCTED
                        </AppText>
                        <AppText variant="bodyStrong" tone="accent">
                          {currency(row.deducted_amount)}
                        </AppText>
                      </View>
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <AppText variant="micro" tone="faint">
                          CERTIFICATE
                        </AppText>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {row.certificate_number ?? '—'}
                        </AppText>
                      </View>
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <AppText variant="micro" tone="faint">
                          RECORDED
                        </AppText>
                        <AppText variant="bodyStrong">
                          {formatDate(row.created_at)}
                        </AppText>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="pricetags-outline"
              title={rows.length ? 'Nothing in this year' : 'No TDS entries yet'}
              message={
                rows.length
                  ? 'Pick another financial year.'
                  : 'Record what a client deducted so the certificate can be chased.'
              }
              actionLabel={rows.length ? undefined : 'New Entry'}
              onAction={rows.length ? undefined : openCreate}
            />
          )}

          <Sheet
            visible={createOpen}
            title="New TDS entry"
            onClose={() => setCreateOpen(false)}
          >
            <View
              style={{
                paddingHorizontal: t.spacing.xl,
                gap: t.spacing.lg,
              }}
            >
              <SelectField
                label="Against Invoice"
                placeholder="Optional — fills the client and amount"
                allowClear
                searchable={(invoices.data?.items ?? []).length > 6}
                value={invoiceId}
                onChange={chooseInvoice}
                options={(invoices.data?.items ?? []).map((invoice) => ({
                  value: invoice.id,
                  label: invoice.invoice_number,
                  hint: `TDS ${currency(invoice.tds_amount)}`,
                }))}
              />
              <ClientField
                value={clientId}
                onChange={setClientId}
                hint="Required — whose deduction this is."
              />
              <SelectField
                label="Financial Year"
                required
                placeholder="Select year"
                value={financialYear}
                onChange={setFinancialYear}
                options={years.map((value) => ({
                  value,
                  label: `FY ${value}`,
                }))}
              />
              <View
                style={{
                  flexDirection: 'row',
                  gap: t.spacing.md,
                }}
              >
                <TextField
                  label="TDS %"
                  containerStyle={{
                    flex: 1,
                  }}
                  value={percentage}
                  onChangeText={setPercentage}
                  keyboardType="decimal-pad"
                  placeholder="2"
                />
                <TextField
                  label="Deducted"
                  containerStyle={{
                    flex: 1,
                  }}
                  value={deducted}
                  onChangeText={setDeducted}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <TextField
                label="Certificate Number"
                value={certificate}
                onChangeText={setCertificate}
                placeholder="Form 16A reference, if you have it"
              />

              {error ? (
                <AppText variant="caption" tone="danger">
                  {error}
                </AppText>
              ) : null}
              {create.error ? <InlineError error={create.error} /> : null}

              <Button
                label="Save Entry"
                loading={create.isPending}
                onPress={submitCreate}
              />
            </View>
          </Sheet>

          <CertificateSheet
            record={editing}
            value={certificate}
            onChange={setCertificate}
            onClose={() => setEditing(null)}
          />
        </>
      ) : null}
    </Screen>
  );
}

/** PUT /tds/{id} takes a certificate number and nothing else. */
function CertificateSheet({ record, value, onChange, onClose }) {
  const t = useTheme();
  const update = useUpdateTdsCertificate(record?.id);
  return (
    <Sheet visible={!!record} title="TDS certificate" onClose={onClose}>
      <View
        style={{
          paddingHorizontal: t.spacing.xl,
          gap: t.spacing.lg,
        }}
      >
        {record ? (
          <Card tone="canvas">
            <AppText variant="bodyStrong">{clientLabel(record.client_id)}</AppText>
            <AppText variant="caption" tone="muted">
              FY {record.financial_year} · {currency(record.deducted_amount)} deducted
            </AppText>
          </Card>
        ) : null}

        <TextField
          label="Certificate Number"
          value={value}
          onChangeText={onChange}
          placeholder="Form 16A reference"
          hint="The only field this endpoint updates."
        />

        {update.error ? <InlineError error={update.error} /> : null}

        <Notice icon="cloud-upload-outline">
          The certificate file itself is uploaded elsewhere — this API version stores the
          number only.
        </Notice>

        <Button
          label="Save Certificate"
          loading={update.isPending}
          onPress={() =>
            update.mutate(value.trim(), {
              onSuccess: onClose,
            })
          }
        />
      </View>
    </Sheet>
  );
}
