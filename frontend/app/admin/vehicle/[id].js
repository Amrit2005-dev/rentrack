import React, { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppText,
  Card,
  ErrorState,
  Notice,
  Screen,
  ScreenHeader,
  SkeletonList,
  StatusBadge,
} from '@/components/ui';
import { VehicleAssignments } from '@/features/vehicles/VehicleAssignments';
import { VehicleForm, toVehicleUpdatePayload } from '@/features/vehicles/VehicleForm';
import { useDeleteVehicle, useUpdateVehicle, useVehicle } from '@/hooks/fleet';
import { expiryStatusMeta, statusMeta, vehicleStatusMeta } from '@/constants/status';
import { usePermissions } from '@/store/auth';
import { useTheme } from '@/theme';
export default function EditVehicleScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams();
  const { canManageResources } = usePermissions();
  const vehicle = useVehicle(id);
  const update = useUpdateVehicle(id);
  const remove = useDeleteVehicle();
  const [uploadWarning, setUploadWarning] = useState(null);
  const submit = (values, documents) =>
    update.mutate(
      { body: toVehicleUpdatePayload(values), documents },
      {
        onSuccess: (saved) => {
          // The edit is saved either way; a scan that failed reports itself.
          if (saved.failedDocuments?.length) {
            setUploadWarning(saved.failedDocuments.join(', '));
            return;
          }
          router.back();
        },
      },
    );
  const confirmDelete = () => {
    const run = () =>
      remove.mutate(id, {
        onSuccess: () => router.back(),
      });
    const message = 'This vehicle will be deactivated and removed from the fleet list.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) run();
      return;
    }
    Alert.alert('Deactivate vehicle', message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: run,
      },
    ]);
  };
  const data = vehicle.data;

  /** The API computes these, so expiry warnings need no client-side date maths. */
  const expiries = data
    ? [
        ['RC', data.rc_expiry_status],
        ['Insurance', data.insurance_expiry_status],
        ['Fitness', data.fitness_expiry_status],
        ['PUC', data.pollution_expiry_status],
      ].filter(([, value]) => value && value !== 'valid')
    : [];
  return (
    <Screen>
      <ScreenHeader
        title="Edit Vehicle"
        subtitle={data?.registration_no}
        back
        right={
          canManageResources ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Deactivate vehicle"
              hitSlop={10}
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={20} color={t.status.dangerFg} />
            </Pressable>
          ) : undefined
        }
      />

      {vehicle.isLoading ? <SkeletonList count={2} /> : null}
      {vehicle.error ? (
        <ErrorState error={vehicle.error} onRetry={vehicle.refetch} />
      ) : null}

      {data ? (
        <>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                gap: t.spacing.md,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: t.radius.md,
                  backgroundColor: t.accent.primaryFaint,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="bus-outline" size={26} color={t.accent.primary} />
              </View>
              <View
                style={{
                  flex: 1,
                  gap: 4,
                }}
              >
                <AppText variant="heading">{data.registration_no}</AppText>
                <AppText variant="caption" tone="muted">
                  {data.type}
                  {data.capacity_tons != null ? ` · ${data.capacity_tons} Ton` : ''}
                </AppText>
              </View>
              <StatusBadge meta={statusMeta(vehicleStatusMeta, data.status)} />
            </View>
          </Card>

          {expiries.length ? (
            <Notice icon="warning-outline" tone="warning">
              {expiries
                .map(
                  ([label, value]) =>
                    `${label}: ${statusMeta(expiryStatusMeta, value).label}`,
                )
                .join('   ·   ')}
            </Notice>
          ) : null}

          <VehicleAssignments vehicleId={data.id} />

          {uploadWarning ? (
            <Notice icon="alert-circle-outline" tone="warning">
              The vehicle was saved, but these documents were not: {uploadWarning}
            </Notice>
          ) : null}

          <VehicleForm
            mode="edit"
            initial={data}
            submitting={update.isPending}
            error={update.error ?? remove.error}
            onSubmit={submit}
          />
        </>
      ) : null}
    </Screen>
  );
}
