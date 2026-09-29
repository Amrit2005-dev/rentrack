import React from 'react';
import { router } from 'expo-router';
import { Screen, ScreenHeader } from '@/components/ui';
import { TripForm, toTripPayload } from '@/features/trips/TripForm';
import { useCreateTrip } from '@/hooks/trips';
import { SuperAdminWriteNotice } from '@/features/accounts/SuperAdminWriteNotice';
import { usePermissions } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';
export default function NewTripScreen() {
  const { canManageOrganizations: isPlatformAdmin } = usePermissions();
  // Managing a company supplies the org_id the create route needs.
  const scopedCompanyId = useScopedCompanyId();
  if (isPlatformAdmin && !scopedCompanyId) {
    return <SuperAdminWriteNotice title="Create Trip" resource="Trips" />;
  }

  const create = useCreateTrip();
  const submit = (values) =>
    create.mutate(toTripPayload(values), {
      onSuccess: (trip) => router.replace(`/admin/trip/${trip.id}`),
    });
  return (
    <Screen>
      <ScreenHeader
        title="Create Trip"
        subtitle="Add trip details to create a new trip"
        back
      />
      <TripForm
        mode="create"
        submitting={create.isPending}
        error={create.error}
        onSubmit={submit}
      />
    </Screen>
  );
}
