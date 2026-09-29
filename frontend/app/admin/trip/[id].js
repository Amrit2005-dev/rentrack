import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  AppText,
  Button,
  ErrorState,
  InfoRow,
  InlineError,
  Notice,
  Screen,
  ScreenHeader,
  SectionCard,
  Sheet,
  SkeletonList,
  SplitStat,
  StatusBadge,
  TextField,
} from '@/components/ui';
import { TripProgress } from '@/features/trips/TripProgress';
import { TripRoute } from '@/features/trips/TripRoute';
import { useSettleTrip, useSetTripStatus, useTrip, useTripReceipt } from '@/hooks/trips';
import { useDrivers, useVehicles } from '@/hooks/fleet';
import { statusMeta, tripStatusMeta } from '@/constants/status';
import { usePermissions } from '@/store/auth';
import { currency, distance, formatDateTime, tons } from '@/utils/format';
import { useTheme } from '@/theme';
export default function AdminTripDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams();
  const { canManageTrips } = usePermissions();
  const trip = useTrip(id);
  const setStatus = useSetTripStatus(id);
  const settle = useSettleTrip(id);
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const [settleOpen, setSettleOpen] = useState(false);
  const [form, setForm] = useState({
    distance_km: '',
    weight_tons: '',
    waiting_hours: '',
    toll_charge: '',
    extra_charge: '',
    gst_rate: '18',
  });
  const data = trip.data;
  // Only fetch a receipt once the trip is far enough along to have one.
  const receipt = useTripReceipt(id, data?.status === 'completed');
  if (trip.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Trip Details" back />
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (trip.error || !data) {
    return (
      <Screen>
        <ScreenHeader title="Trip Details" back />
        <ErrorState error={trip.error} onRetry={trip.refetch} />
      </Screen>
    );
  }
  const vehicleLabel = data.vehicle_id
    ? (vehicles.data?.items ?? []).find((v) => v.id === data.vehicle_id)?.registration_no
    : undefined;
  const driverLabel = data.driver_id
    ? (drivers.data?.items ?? []).find((d) => d.id === data.driver_id)?.full_name
    : undefined;
  const confirm = (title, message, run) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) run();
      return;
    }
    Alert.alert(title, message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Confirm',
        onPress: run,
      },
    ]);
  };
  const num = (v) => (v.trim() ? Number(v) : 0);
  const submitSettlement = () =>
    settle.mutate(
      {
        distance_km: num(form.distance_km),
        weight_tons: num(form.weight_tons),
        waiting_hours: num(form.waiting_hours),
        toll_charge: num(form.toll_charge),
        extra_charge: num(form.extra_charge),
        gst_rate: num(form.gst_rate),
      },
      {
        onSuccess: () => setSettleOpen(false),
      },
    );
  const canCancel = data.status !== 'completed' && data.status !== 'cancelled';
  const canSettle = data.status === 'completed';
  const field = (key, label, placeholder, suffix) => (
    <TextField
      containerStyle={{
        flex: 1,
      }}
      label={label}
      value={form[key]}
      onChangeText={(next) =>
        setForm((prev) => ({
          ...prev,
          [key]: next.replace(/[^0-9.]/g, ''),
        }))
      }
      placeholder={placeholder}
      suffix={suffix}
      keyboardType="decimal-pad"
    />
  );
  return (
    <Screen>
      <ScreenHeader
        title="Trip Details"
        back
        right={<StatusBadge meta={statusMeta(tripStatusMeta, data.status)} />}
      />

      <SectionCard title="Route Details" icon="location-outline">
        <TripRoute
          origin={data.origin}
          destination={data.destination}
          startedAt={data.started_at}
          reachedAt={data.reached_at}
        />
      </SectionCard>

      <SplitStat
        items={[
          {
            label: 'Distance',
            icon: 'speedometer-outline',
            value: distance(data.distance_km),
          },
          {
            label: 'Final Amount',
            icon: 'cash-outline',
            value: currency(data.final_amount),
          },
        ]}
      />

      <SectionCard title="Vehicle & Driver" icon="people-outline">
        <InfoRow
          label="Vehicle"
          value={vehicleLabel ?? 'Unassigned'}
          icon="bus-outline"
        />
        <InfoRow
          label="Driver"
          value={driverLabel ?? 'Unassigned'}
          icon="person-outline"
        />
        <InfoRow label="Weight" value={tons(data.weight_tons)} icon="cube-outline" last />
      </SectionCard>

      <SectionCard title="Trip Progress" icon="git-commit-outline">
        <TripProgress trip={data} />
      </SectionCard>

      <SectionCard title="Earnings Breakdown" icon="calculator-outline">
        <InfoRow label="Base Fare" value={currency(data.base_fare)} />
        <InfoRow label="Distance Charge" value={currency(data.distance_charge)} />
        <InfoRow label="Weight Charge" value={currency(data.weight_charge)} />
        <InfoRow label="Waiting Charge" value={currency(data.waiting_charge)} />
        <InfoRow label="Toll Charges" value={currency(data.toll_charge)} />
        <InfoRow label="Other Charges" value={currency(data.extra_charge)} />
        <InfoRow
          label={`GST (${data.gst_rate ?? 0}%)`}
          value={currency(data.gst_amount)}
        />
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
              flex: 1,
            }}
          >
            Final Amount
          </AppText>
          <AppText variant="title" tone="accent">
            {currency(data.final_amount)}
          </AppText>
        </View>
      </SectionCard>

      {receipt.data ? (
        <SectionCard title="Delivery Receipt" icon="receipt-outline">
          <InfoRow label="Received By" value={receipt.data.receiver_name ?? '—'} />
          <InfoRow
            label="Received At"
            value={formatDateTime(receipt.data.received_at)}
            last
          />
        </SectionCard>
      ) : null}

      {data.notes ? (
        <SectionCard title="Additional Notes" icon="document-text-outline">
          <AppText variant="body" tone="body">
            {data.notes}
          </AppText>
        </SectionCard>
      ) : null}

      <InlineError error={setStatus.error ?? settle.error} />

      {/*
        There is no general trip-update route on this API — only /status and
        /settle — so a trip's details are fixed once created.
       */}
      {canManageTrips ? (
        <Notice icon="information-circle-outline">
          Trip details cannot be edited after creation. The driver moves the trip through
          its stages from their app.
        </Notice>
      ) : null}

      <View
        style={{
          gap: t.spacing.sm,
        }}
      >
        {canSettle ? (
          <Button
            label="Settle Trip"
            icon="calculator-outline"
            onPress={() => {
              setForm((prev) => ({
                ...prev,
                distance_km: data.distance_km != null ? String(data.distance_km) : '',
                weight_tons: data.weight_tons != null ? String(data.weight_tons) : '',
                gst_rate: data.gst_rate != null ? String(data.gst_rate) : '18',
              }));
              setSettleOpen(true);
            }}
          />
        ) : null}

        {canCancel && canManageTrips ? (
          <Button
            label="Cancel Trip"
            variant="danger"
            icon="close-circle-outline"
            onPress={() =>
              confirm('Cancel trip', 'The trip will be marked cancelled.', () =>
                setStatus.mutate('cancelled'),
              )
            }
          />
        ) : null}
      </View>

      <Sheet
        visible={settleOpen}
        title="Settle trip"
        onClose={() => setSettleOpen(false)}
      >
        <View
          style={{
            paddingHorizontal: t.spacing.xl,
            gap: t.spacing.lg,
          }}
        >
          <Notice icon="information-circle-outline">
            The API recalculates every charge from these figures and writes the final
            amount.
          </Notice>

          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            {field('distance_km', 'Distance', '120', 'km')}
            {field('weight_tons', 'Weight', '18.5', 'ton')}
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            {field('waiting_hours', 'Waiting', '0', 'hr')}
            {field('gst_rate', 'GST Rate', '18', '%')}
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            {field('toll_charge', 'Toll Charges', '600')}
            {field('extra_charge', 'Other Charges', '300')}
          </View>

          <Button
            label="Settle & Close"
            loading={settle.isPending}
            onPress={submitSettlement}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
