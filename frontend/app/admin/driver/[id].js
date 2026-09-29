import React, { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppText,
  Avatar,
  Card,
  ErrorState,
  Notice,
  Screen,
  ScreenHeader,
  SkeletonList,
  StatusBadge,
} from '@/components/ui';
import { DriverForm, toDriverPayload } from '@/features/drivers/DriverForm';
import { driversApi } from '@/api/drivers';
import { useDeleteDriver, useDriver, useUpdateDriver } from '@/hooks/fleet';
import { driverAvailabilityMeta, statusMeta } from '@/constants/status';
import { usePermissions } from '@/store/auth';
import { useTheme } from '@/theme';
export default function EditDriverScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams();
  const { canManageResources } = usePermissions();
  const driver = useDriver(id);
  const update = useUpdateDriver(id);
  const remove = useDeleteDriver();
  const [uploadWarning, setUploadWarning] = useState(null);
  const submit = (values, licenceDocument) =>
    update.mutate(toDriverPayload(values), {
      onSuccess: async () => {
        // The driver is saved either way; a document that cannot be stored
        // reports itself rather than undoing the edit.
        if (licenceDocument) {
          const upload = await driversApi.uploadLicence(id, licenceDocument);
          if (!upload.ok) {
            setUploadWarning(upload.reason);
            return;
          }
        }
        router.back();
      },
    });
  const confirmDelete = () => {
    const run = () =>
      remove.mutate(id, {
        onSuccess: () => router.back(),
      });
    const message = 'This driver will be removed from your organisation.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) run();
      return;
    }
    Alert.alert('Delete driver', message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: run,
      },
    ]);
  };
  return (
    <Screen>
      <ScreenHeader
        title="Edit Driver"
        subtitle={driver.data?.full_name}
        back
        right={
          canManageResources ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete driver"
              hitSlop={10}
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={20} color={t.status.dangerFg} />
            </Pressable>
          ) : undefined
        }
      />

      {driver.isLoading ? <SkeletonList count={2} /> : null}
      {driver.error ? <ErrorState error={driver.error} onRetry={driver.refetch} /> : null}

      {driver.data ? (
        <>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                gap: t.spacing.md,
                alignItems: 'center',
              }}
            >
              <Avatar name={driver.data.full_name} size={54} />
              <View
                style={{
                  flex: 1,
                  gap: 2,
                }}
              >
                <AppText variant="heading">{driver.data.full_name}</AppText>
                <AppText variant="caption" tone="muted">
                  {driver.data.mobile}
                </AppText>
              </View>
              <StatusBadge
                meta={statusMeta(driverAvailabilityMeta, driver.data.availability)}
              />
            </View>
          </Card>

          {uploadWarning ? (
            <Notice icon="alert-circle-outline" tone="warning">
              The driver was saved, but the licence document was not: {uploadWarning}
            </Notice>
          ) : null}

          <DriverForm
            mode="edit"
            initial={driver.data}
            submitting={update.isPending}
            error={update.error ?? remove.error}
            onSubmit={submit}
          />
        </>
      ) : null}
    </Screen>
  );
}
