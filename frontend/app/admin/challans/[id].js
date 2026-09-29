import React, { useState } from 'react';
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
import { useChallan, useNotifyChallan } from '@/hooks/billing';
import { useDrivers, useVehicles } from '@/hooks/fleet';
import { challanStatusMeta, statusMeta } from '@/constants/status';
import { currency, formatDate, formatDateTime } from '@/utils/format';
import { useTheme } from '@/theme';
/**
 * Challan detail — the vehicle-wise hours table the SRS asks for, plus the SMS
 * trigger. Approve and Request Edit are drawn but inert: this API version has
 * no status route for challans (schemas/challan.py defines ChallanUpdate, but
 * endpoints/challans.py exposes only list, get, create and notify).
 */
export default function ChallanDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams();
  const id = params.id;
  const challan = useChallan(id);
  const notify = useNotifyChallan(id);
  const vehicles = useVehicles({
    page_size: 200,
  });
  const drivers = useDrivers({
    page_size: 200,
  });
  const [justCreated, setJustCreated] = useState(params.created === '1');
  const [sent, setSent] = useState(false);
  const vehicleLabel = (vehicleId) =>
    vehicles.data?.items.find((vehicle) => vehicle.id === vehicleId)?.registration_no ??
    (vehicleId ? 'Vehicle removed' : '—');
  const driverLabel = (driverId) =>
    drivers.data?.items.find((driver) => driver.id === driverId)?.full_name ??
    (driverId ? 'Driver removed' : '—');
  const confirmNotify = () => {
    const run = () =>
      notify.mutate(undefined, {
        onSuccess: () => {
          setJustCreated(false);
          setSent(true);
        },
      });
    const message = "The day's challan will be sent to the client by SMS.";
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) run();
      return;
    }
    Alert.alert('Send challan SMS', message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Send',
        onPress: run,
      },
    ]);
  };
  const data = challan.data;
  return (
    <Screen>
      <ScreenHeader
        title="Challan"
        subtitle={data ? formatDate(data.challan_date) : undefined}
        back
        right={
          data ? (
            <StatusBadge meta={statusMeta(challanStatusMeta, data.status)} />
          ) : undefined
        }
      />

      {challan.isLoading ? <SkeletonList count={3} /> : null}
      {challan.error ? (
        <ErrorState error={challan.error} onRetry={challan.refetch} />
      ) : null}

      {data ? (
        <>
          {/* SRS: the "Challan Generated" confirmation that prompts the day's SMS. */}
          {justCreated ? (
            <Card tone="accentSoft">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.md,
                }}
              >
                <Ionicons name="checkmark-circle" size={24} color={t.status.successFg} />
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <AppText variant="bodyStrong">Challan Generated</AppText>
                  <AppText variant="caption" tone="muted">
                    Send it to the client so today&apos;s hours are on record with them.
                  </AppText>
                </View>
              </View>
            </Card>
          ) : null}

          {sent ? (
            <Notice icon="chatbubble-ellipses-outline">
              The API accepted the notification request for this challan.
            </Notice>
          ) : null}

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
                  Total Amount
                </AppText>
                <AppText variant="display" tone="accent">
                  {currency(data.total_amount)}
                </AppText>
                <AppText variant="caption" tone="faint">
                  {Number(data.total_hours ?? 0)} running hours across {data.items.length}{' '}
                  {data.items.length === 1 ? 'vehicle' : 'vehicles'}
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

          <SectionCard title="Challan Information" icon="information-circle-outline">
            <InfoRow
              label="Date"
              value={formatDate(data.challan_date)}
              icon="calendar-outline"
            />
            <InfoRow
              label="Client"
              value={data.client_id ? clientLabel(data.client_id) : 'Not linked'}
              icon="business-outline"
            />
            <InfoRow
              label="Status"
              value={statusMeta(challanStatusMeta, data.status).label}
              icon="flag-outline"
            />
            <InfoRow
              label="SMS Sent"
              value={data.sms_sent_at ? formatDateTime(data.sms_sent_at) : 'Not sent'}
              icon="chatbubble-ellipses-outline"
            />
            <InfoRow
              label="Created"
              value={formatDateTime(data.created_at)}
              icon="time-outline"
              last
            />
          </SectionCard>

          <SectionCard title="Vehicle-wise Running Hours" icon="bus-outline">
            <View
              style={{
                flexDirection: 'row',
                paddingBottom: t.spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: t.color.line,
              }}
            >
              <AppText
                variant="micro"
                tone="faint"
                style={{
                  flex: 1.4,
                }}
              >
                VEHICLE
              </AppText>
              <AppText
                variant="micro"
                tone="faint"
                style={{
                  width: 56,
                  textAlign: 'right',
                }}
              >
                HOURS
              </AppText>
              <AppText
                variant="micro"
                tone="faint"
                style={{
                  width: 84,
                  textAlign: 'right',
                }}
              >
                AMOUNT
              </AppText>
            </View>

            {data.items.length ? (
              data.items.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: t.spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: t.color.lineSoft,
                  }}
                >
                  <View
                    style={{
                      flex: 1.4,
                      gap: 2,
                    }}
                  >
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {vehicleLabel(item.vehicle_id)}
                    </AppText>
                    <AppText variant="caption" tone="muted" numberOfLines={1}>
                      {driverLabel(item.driver_id)}
                    </AppText>
                  </View>
                  <AppText
                    variant="body"
                    style={{
                      width: 56,
                      textAlign: 'right',
                    }}
                  >
                    {Number(item.running_hours)}
                  </AppText>
                  <AppText
                    variant="bodyStrong"
                    style={{
                      width: 84,
                      textAlign: 'right',
                    }}
                  >
                    {currency(item.amount)}
                  </AppText>
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
                No vehicle rows on this challan.
              </AppText>
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: t.spacing.md,
              }}
            >
              <AppText
                variant="bodyStrong"
                style={{
                  flex: 1.4,
                }}
              >
                Total
              </AppText>
              <AppText
                variant="bodyStrong"
                style={{
                  width: 56,
                  textAlign: 'right',
                }}
              >
                {Number(data.total_hours ?? 0)}
              </AppText>
              <AppText
                variant="bodyStrong"
                tone="accent"
                style={{
                  width: 84,
                  textAlign: 'right',
                }}
              >
                {currency(data.total_amount)}
              </AppText>
            </View>
          </SectionCard>

          {notify.error ? <InlineError error={notify.error} /> : null}

          <Button
            label={data.sms_sent_at ? 'Resend Challan SMS' : 'Send Challan to Client'}
            icon="chatbubble-ellipses-outline"
            loading={notify.isPending}
            onPress={confirmNotify}
          />

          {data.pdf_url ? (
            <Button
              label="Open PDF"
              icon="document-outline"
              variant="outline"
              onPress={() => void Linking.openURL(data.pdf_url)}
            />
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            <Button
              label="Request Edit"
              variant="outline"
              disabled
              style={{
                flex: 1,
              }}
            />
            <Button
              label="Approve Challan"
              variant="success"
              disabled
              style={{
                flex: 1,
              }}
            />
          </View>

          <Notice icon="lock-closed-outline">
            Approval and edit requests need a challan status route. This API version
            exposes only list, detail, create and notify, so both actions stay disabled
            until the backend adds one.
          </Notice>
        </>
      ) : null}
    </Screen>
  );
}
