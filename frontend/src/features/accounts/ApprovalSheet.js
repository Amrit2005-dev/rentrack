import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  InlineError,
  SelectField,
  Sheet,
  TextField,
} from '@/components/ui';
import { useApproveRegistration, useRejectRegistration } from '@/hooks/accounts';
import { applicantMobile, applicantName, companyName } from './registration';
import { useTheme } from '@/theme';

/*
 * The API's own spellings, in the API's own case.
 *
 * This list used to send 'admin' and 'user' while the Add Company screen
 * sent 'ORG_ADMIN' and 'DRIVER' — both accepted, because the enum carries
 * the lowercase pair as legacy aliases, so the same intent produced two
 * different stored values depending on which screen the account came
 * through. That is what forces every role comparison to case-fold.
 *
 * MANAGER and OPERATOR are on the list because the app already understands
 * them — they reach the console read-only — but nothing could assign them.
 */
const ROLE_OPTIONS = [
  {
    value: 'ORG_ADMIN',
    label: 'Admin',
    hint: 'Runs the company — fleet, crew, trips and billing',
  },
  {
    value: 'MANAGER',
    label: 'Manager',
    hint: 'Back office — can read everything, change nothing',
  },
  {
    value: 'OPERATOR',
    label: 'Operator',
    hint: 'Back office — same read-only access as a manager',
  },
  {
    value: 'DRIVER',
    label: 'Driver',
    hint: 'Runs assigned trips in the driver app',
  },
];

const API_ROLE_BY_OPTION = {
  ORG_ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  DRIVER: 'user',
};

/**
 * The approve / reject sheet, shared by Notifications and the Super Admin
 * company drill-down so both routes behave identically — same validation, same
 * payloads, same copy.
 *
 * Approving is also how a company joins the platform: the company row is
 * created by the registration itself, so the first approval is what turns it
 * from a pending application into an active organisation.
 */
export function ApprovalSheet({ request, action, onClose }) {
  const t = useTheme();
  const [role, setRole] = useState('user');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(undefined);

  const approve = useApproveRegistration();
  const reject = useRejectRegistration();

  // Reset whenever a different request or action opens the sheet.
  useEffect(() => {
    if (!request) return;
    setRole('user');
    setReason('');
    setReasonError(undefined);
    approve.reset();
    reject.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, action]);

  const rejecting = action === 'reject';

  const submit = () => {
    if (!request) return;

    if (rejecting) {
      if (!reason.trim()) {
        setReasonError('A reason is required to reject a request');
        return;
      }
      reject.mutate({ id: request.id, reason: reason.trim() }, { onSuccess: onClose });
      return;
    }

    approve.mutate(
      { id: request.id, body: { role: API_ROLE_BY_OPTION[role] ?? 'user' } },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet
      visible={!!request}
      title={rejecting ? 'Reject request' : 'Approve request'}
      onClose={onClose}
    >
      <View
        style={{
          paddingHorizontal: t.spacing.xl,
          gap: t.spacing.lg,
        }}
      >
        {request ? (
          <Card tone="canvas">
            <AppText variant="bodyStrong">{applicantName(request)}</AppText>
            <AppText variant="caption" tone="muted">
              {companyName(request)} · {applicantMobile(request)}
            </AppText>
          </Card>
        ) : null}

        <InlineError error={approve.error ?? reject.error} />

        {rejecting ? (
          <TextField
            label="Reason"
            required
            value={reason}
            onChangeText={(next) => {
              setReason(next);
              if (reasonError) setReasonError(undefined);
            }}
            placeholder="Tell them why this was rejected"
            multiline
            error={reasonError}
          />
        ) : (
          <SelectField
            label="Assign Role"
            required
            placeholder="Choose a role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(next) => setRole(next ?? 'user')}
            hint="Drivers get the trip app; admins get the management app."
          />
        )}

        <Button
          label={rejecting ? 'Reject Request' : 'Approve Request'}
          variant={rejecting ? 'danger' : 'success'}
          loading={approve.isPending || reject.isPending}
          onPress={submit}
        />
      </View>
    </Sheet>
  );
}
