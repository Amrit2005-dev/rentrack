import React, { useState } from 'react';
import { router } from 'expo-router';
import { Screen, ScreenHeader } from '@/components/ui';
import {
  DriverForm,
  toDriverLogin,
  toDriverPayload,
} from '@/features/drivers/DriverForm';
import { driversApi } from '@/api/drivers';
import { useCreateDriver } from '@/hooks/fleet';
import { ApiError } from '@/api/client';
import { SuperAdminWriteNotice } from '@/features/accounts/SuperAdminWriteNotice';
import { usePermissions } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';

export default function NewDriverScreen() {
  const { canManageOrganizations: isPlatformAdmin } = usePermissions();
  // Managing a company supplies the org_id the create route needs.
  const scopedCompanyId = useScopedCompanyId();

  const create = useCreateDriver();
  const [failure, setFailure] = useState(null);

  if (isPlatformAdmin && !scopedCompanyId) {
    return <SuperAdminWriteNotice title="Add Driver" resource="Drivers" />;
  }

  /**
   * One call: the server creates the driver and, when sign-in details were
   * given, its account in the same transaction, so a refused email or mobile
   * saves nothing and the form can simply be corrected and resubmitted.
   */
  const submit = async (values, licenceDocument) => {
    setFailure(null);
    const login = toDriverLogin(values);

    let driver;
    try {
      driver = await create.mutateAsync({
        ...toDriverPayload(values),
        ...(login ? { login } : {}),
      });
    } catch (error) {
      setFailure(error);
      return;
    }

    /*
     * Last, and deliberately not fatal: the driver is already saved by this
     * point. A failed upload reports itself; the licence can be attached again
     * from the driver's edit screen.
     */
    if (licenceDocument) {
      const upload = await driversApi.uploadLicence(driver.id, licenceDocument);
      if (!upload.ok) {
        setFailure(
          new ApiError(
            `${values.full_name.trim()} was saved, but the licence document was not: ${upload.reason}`,
            0,
          ),
        );
        return;
      }
    }

    router.back();
  };

  return (
    <Screen>
      <ScreenHeader
        title="Add Driver"
        subtitle="Enter details to add a new driver"
        back
      />
      <DriverForm
        mode="create"
        submitting={create.isPending}
        error={failure}
        onSubmit={submit}
      />
    </Screen>
  );
}
