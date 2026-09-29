import React from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
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
  SkeletonList,
  StatusBadge,
} from '@/components/ui';
import { clientLabel } from '@/features/billing/ClientField';
import { useQuotation, useSetQuotationStatus } from '@/hooks/billing';
import { quotationStatusMeta, statusMeta } from '@/constants/status';
import { currency, formatDate, formatDateTime, humanise, isPast } from '@/utils/format';
import { useTheme } from '@/theme';
/** The transitions PUT /quotations/{id}/status accepts, in the order they happen. */
const NEXT_STATUS = {
  draft: [
    {
      label: 'Mark as Sent',
      value: 'sent',
      variant: 'primary',
    },
  ],
  sent: [
    {
      label: 'Accepted',
      value: 'accepted',
      variant: 'success',
    },
    {
      label: 'Rejected',
      value: 'rejected',
      variant: 'danger',
    },
  ],
  accepted: [],
  rejected: [
    {
      label: 'Reopen as Draft',
      value: 'draft',
      variant: 'primary',
    },
  ],
  expired: [
    {
      label: 'Reopen as Draft',
      value: 'draft',
      variant: 'primary',
    },
  ],
};
export default function QuotationDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams();
  const id = params.id;
  const quotation = useQuotation(id);
  const setStatus = useSetQuotationStatus(id);
  const data = quotation.data;
  const expired = data?.validity_date ? isPast(data.validity_date) : false;
  const actions = data ? (NEXT_STATUS[data.status] ?? []) : [];
  const confirmStatus = (label, value) => {
    const run = () => setStatus.mutate(value);
    const message = `This quotation will be marked "${label}".`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) run();
      return;
    }
    Alert.alert('Update quotation', message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Update',
        onPress: run,
      },
    ]);
  };
  return (
    <Screen>
      <ScreenHeader
        title={data?.quotation_number ?? 'Quotation'}
        subtitle={data?.machine_type ? humanise(data.machine_type) : undefined}
        back
        right={
          data ? (
            <StatusBadge meta={statusMeta(quotationStatusMeta, data.status)} />
          ) : undefined
        }
      />

      {quotation.isLoading ? <SkeletonList count={3} /> : null}
      {quotation.error ? (
        <ErrorState error={quotation.error} onRetry={quotation.refetch} />
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
                  Quoted Total
                </AppText>
                <AppText variant="display" tone="accent">
                  {currency(data.total_rate)}
                </AppText>
                <AppText variant="caption" tone="faint">
                  {data.client_id ? clientLabel(data.client_id) : 'No client linked'}
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
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color={t.accent.primary}
                />
              </View>
            </View>
          </Card>

          {expired && data.status !== 'accepted' ? (
            <Notice icon="time-outline">
              The validity date has passed. Reissue the quotation before the client acts
              on it.
            </Notice>
          ) : null}

          <SectionCard title="Rate Card" icon="pricetag-outline">
            <InfoRow
              label="Base Rate"
              value={currency(data.base_rate)}
              icon="cash-outline"
            />
            <InfoRow
              label="Per KM"
              value={currency(data.per_km_rate)}
              icon="speedometer-outline"
            />
            <InfoRow
              label="Per Ton"
              value={currency(data.per_ton_rate)}
              icon="scale-outline"
            />
            <InfoRow
              label="Total"
              value={currency(data.total_rate)}
              icon="calculator-outline"
              last
            />
          </SectionCard>

          <SectionCard title="Quotation Information" icon="information-circle-outline">
            <InfoRow
              label="Machine"
              value={data.machine_type ? humanise(data.machine_type) : '—'}
              icon="construct-outline"
            />
            <InfoRow
              label="Package"
              value={data.package_details ?? '—'}
              icon="cube-outline"
            />
            <InfoRow
              label="Valid Until"
              value={formatDate(data.validity_date)}
              icon="calendar-outline"
            />
            <InfoRow
              label="Linked Trip"
              value={data.trip_id ? 'Yes' : 'Not linked'}
              icon="map-outline"
            />
            <InfoRow
              label="Created"
              value={formatDateTime(data.created_at)}
              icon="time-outline"
              last
            />
          </SectionCard>

          {data.custom_terms ? (
            <SectionCard title="Terms" icon="reader-outline">
              <AppText variant="body" tone="body">
                {data.custom_terms}
              </AppText>
            </SectionCard>
          ) : null}

          {setStatus.error ? <InlineError error={setStatus.error} /> : null}

          {actions.length ? (
            <View
              style={{
                flexDirection: 'row',
                gap: t.spacing.md,
              }}
            >
              {actions.map((action) => (
                <Button
                  key={action.value}
                  label={action.label}
                  variant={action.variant}
                  loading={setStatus.isPending}
                  style={{
                    flex: 1,
                  }}
                  onPress={() => confirmStatus(action.label, action.value)}
                />
              ))}
            </View>
          ) : (
            <Notice icon="checkmark-circle-outline">
              This quotation is accepted. Raise the invoice from the Invoices screen when
              the work is done.
            </Notice>
          )}

          {'pdf_url' in data && data.pdf_url ? (
            <Button
              label="Open PDF"
              icon="document-outline"
              variant="outline"
              onPress={() => void Linking.openURL(data.pdf_url)}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
