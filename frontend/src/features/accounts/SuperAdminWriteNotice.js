import React from 'react';
import { Notice, Screen, ScreenHeader } from '@/components/ui';

/**
 * Shown to a platform admin who has not entered a company.
 *
 * A super admin belongs to no organisation, so a create route has nothing to
 * stamp the new row with. The API's answer is `org_id`: the create endpoints
 * accept it from a super admin to name the target organisation, which is
 * exactly what entering a company from the Companies tab supplies. So this is
 * no longer a dead end — it is a prompt to pick a company first.
 */
export function SuperAdminWriteNotice({ title, resource }) {
  return (
    <Screen>
      <ScreenHeader title={title} subtitle="Choose a company first" back />
      <Notice icon="business-outline">
        {resource} belong to a company, and a platform administrator sits above every one
        of them. Open the Companies tab, pick the company you are adding to and choose
        &ldquo;Manage&rdquo; — the record is then created inside that company.
      </Notice>
    </Screen>
  );
}
