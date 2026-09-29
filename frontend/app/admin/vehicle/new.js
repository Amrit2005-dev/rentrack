import React, { useState } from 'react';
import { router } from 'expo-router';
import { Notice, Screen, ScreenHeader } from '@/components/ui';
import { SuperAdminWriteNotice } from '@/features/accounts/SuperAdminWriteNotice';
import { VehicleForm, toVehicleCreatePayload } from '@/features/vehicles/VehicleForm';
import { useCreateVehicle } from '@/hooks/fleet';
import { usePermissions } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';

export default function NewVehicleScreen() {
  const create = useCreateVehicle();
  const { canManageOrganizations } = usePermissions();
  const scopedCompanyId = useScopedCompanyId();

  const [uploadWarning, setUploadWarning] = useState(null);

  const submit = (values, documents) =>
    create.mutate(
      { body: toVehicleCreatePayload(values), documents },
      {
        onSuccess: (vehicle) => {
          // The vehicle exists now; a scan that failed is reported, and the
          // operator can attach it again from the edit screen.
          if (vehicle.failedDocuments?.length) {
            setUploadWarning(vehicle.failedDocuments.join(', '));
            return;
          }
          router.back();
        },
      },
    );

  /**
   * A super admin belongs to no company, so the create route has nothing to
   * stamp the new vehicle with — unless they name one. Entering a company from
   * the Companies tab supplies that `org_id`, so the form is only withheld
   * while no company is selected.
   */
  if (canManageOrganizations && !scopedCompanyId) {
    return <SuperAdminWriteNotice title="Add Vehicle" resource="Vehicles" />;
  }

  return (
    <Screen>
      <ScreenHeader
        title="Add Vehicle"
        subtitle="Enter details to add a new vehicle"
        back
      />
      {uploadWarning ? (
        <Notice icon="alert-circle-outline" tone="warning">
          The vehicle was saved, but these documents were not: {uploadWarning}. Open the
          vehicle from the list to attach them again.
        </Notice>
      ) : null}
      <VehicleForm
        mode="create"
        submitting={create.isPending}
        error={create.error}
        onSubmit={submit}
      />
    </Screen>
  );
}
