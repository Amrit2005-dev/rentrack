import React, { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  DateField,
  InlineError,
  Notice,
  SectionCard,
  SelectField,
  TextField,
} from '@/components/ui';
import { useVehicles } from '@/hooks/fleet';
import { LicenceDocumentField } from './LicenceDocumentField';
import { useTheme } from '@/theme';
/**
 * DriverAvailability has exactly three states (AVAILABLE, ON_TRIP,
 * UNAVAILABLE). "On Leave" and "Unavailable" were offered as separate choices
 * and neither existed on the API — picking either sent a value the server does
 * not know, and the field was dropped in transit regardless.
 *
 * ON_TRIP stays on the list because a driver can already be mid-trip when the
 * form opens and the value has to survive a save, but it is the trip lifecycle
 * that sets it.
 */
const AVAILABILITY_OPTIONS = [
  {
    value: 'available',
    label: 'Available',
    hint: 'Can be assigned',
  },
  {
    value: 'on_trip',
    label: 'On Trip',
    hint: 'Currently deployed — set by the trip, not here',
  },
  {
    value: 'off_duty',
    label: 'Unavailable',
    hint: 'Off duty, not to be assigned',
  },
];

/** Only an approved driver can be put on a trip. */
const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved', hint: 'Can be assigned to trips' },
  { value: 'pending', label: 'Pending', hint: 'Waiting for approval' },
  { value: 'rejected', label: 'Rejected', hint: 'Not allowed to drive' },
  { value: 'inactive', label: 'Inactive', hint: 'No longer with the company' },
];

/** Ten digits. No prefix rule — see the note in app/(auth)/login.js. */
const mobileRule = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Enter a 10-digit mobile number');
const schema = z
  .object({
    full_name: z.string().trim().min(1, 'Full name is required'),
    mobile: mobileRule,
    license_number: z.string().trim().min(1, 'Licence number is required'),
    license_expiry: z.string().optional().or(z.literal('')),
    address: z.string().trim().optional().or(z.literal('')),
    assigned_vehicle_id: z.string().nullable().optional(),
    availability: z.string().optional(),
    status: z.string().optional(),
    // Optional: a driver can exist as a record only. Filling these in also
    // creates the account they sign in to the driver app with.
    login_email: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
        'Enter a valid email address',
      ),
    login_password: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || v.length >= 8, 'Use at least 8 characters'),
  })
  .refine((v) => !v.login_password || !!v.login_email, {
    message: 'An email is needed to go with the password',
    path: ['login_email'],
  })
  .refine((v) => !v.login_email || !!v.login_password, {
    message: 'A password is needed to create the login',
    path: ['login_password'],
  });
const orNull = (v) => (v && v.trim() ? v.trim() : null);
const strip = (phone) =>
  (phone ?? '')
    .replace(/^\+?91/, '')
    .replace(/\D/g, '')
    .slice(-10);
/**
 * The sign-in details, or null when none were entered. They are deliberately
 * not part of toDriverPayload: POST /drivers/ creates the driver record, and
 * the account is a separate POST /auth/users carrying `driver_id`.
 */
export function toDriverLogin(values) {
  const email = values.login_email?.trim();
  if (!email || !values.login_password) return null;
  return { email, password: values.login_password };
}

export function toDriverPayload(values) {
  return {
    full_name: values.full_name.trim(),
    mobile: values.mobile.trim(),
    license_number: values.license_number.trim().toUpperCase(),
    license_expiry: orNull(values.license_expiry),
    address: orNull(values.address),
    assigned_vehicle_id: values.assigned_vehicle_id ?? null,
    availability: values.availability || 'available',
    ...(values.status ? { status: values.status } : {}),
  };
}
export function DriverForm({ mode, initial, submitting, error, onSubmit }) {
  const t = useTheme();
  /*
   * The attachment is held outside react-hook-form: it is a file handle rather
   * than a form value, it is not part of the Zod contract, and it is uploaded
   * by a second call after the driver exists — POST /drivers/ has no field for
   * it, and a new driver has no id to attach it to until it returns.
   */
  const [licenceDocument, setLicenceDocument] = useState(null);
  const vehicles = useVehicles();
  const vehicleOptions = (vehicles.data?.items ?? []).map((v) => ({
    value: v.id,
    label: v.registration_no,
    hint: `${v.type}${v.capacity_tons != null ? ` · ${v.capacity_tons} Ton` : ''}`,
  }));
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initial?.full_name ?? '',
      mobile: strip(initial?.mobile),
      license_number: initial?.license_number ?? '',
      license_expiry: initial?.license_expiry ?? '',
      assigned_vehicle_id: initial?.assigned_vehicle_id ?? null,
      availability: initial?.availability ?? 'available',
      ...(mode === 'edit' ? { status: initial?.status ?? 'approved' } : {}),
      address: initial?.address ?? '',
      login_email: '',
      login_password: '',
    },
  });
  return (
    <>
      <InlineError error={error} />

      <SectionCard title="Personal Information" icon="person-outline">
        <View
          style={{
            gap: t.spacing.lg,
          }}
        >
          <Controller
            control={control}
            name="full_name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Full Name"
                required
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter full name"
                error={errors.full_name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="mobile"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Mobile Number"
                required
                value={value}
                onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, 10))}
                onBlur={onBlur}
                placeholder="98765 43210"
                keyboardType="number-pad"
                icon="call-outline"
                error={errors.mobile?.message}
              />
            )}
          />
        </View>
      </SectionCard>

      <SectionCard title="License Information" icon="card-outline">
        <View
          style={{
            gap: t.spacing.lg,
          }}
        >
          <Controller
            control={control}
            name="license_number"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="License Number"
                required
                value={value}
                onChangeText={(next) => onChange(next.toUpperCase())}
                onBlur={onBlur}
                placeholder="MH12 2018 0001234"
                autoCapitalize="characters"
                error={errors.license_number?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="license_expiry"
            render={({ field: { value, onChange } }) => (
              <DateField label="Valid Up To" value={value || null} onChange={onChange} />
            )}
          />

          <LicenceDocumentField
            value={licenceDocument}
            onChange={setLicenceDocument}
            existingUrl={initial?.license_document_url ?? null}
          />
        </View>
      </SectionCard>

      <SectionCard title="Assignment" icon="bus-outline">
        <View
          style={{
            gap: t.spacing.lg,
          }}
        >
          <Controller
            control={control}
            name="assigned_vehicle_id"
            render={({ field: { value, onChange } }) => (
              <SelectField
                label="Assigned Vehicle"
                placeholder={
                  vehicles.isLoading ? 'Loading vehicles…' : 'Choose a vehicle'
                }
                options={vehicleOptions}
                value={value ?? null}
                onChange={onChange}
                searchable
                allowClear
                leadingIcon="bus-outline"
              />
            )}
          />
          <Controller
            control={control}
            name="availability"
            render={({ field: { value, onChange } }) => (
              <SelectField
                label="Availability"
                placeholder="Select availability"
                options={AVAILABILITY_OPTIONS}
                value={value}
                onChange={(next) => onChange(next ?? 'available')}
              />
            )}
          />
          {mode === 'edit' ? (
            <Controller
              control={control}
              name="status"
              render={({ field: { value, onChange } }) => (
                <SelectField
                  label="Approval Status"
                  placeholder="Select status"
                  options={STATUS_OPTIONS}
                  value={value}
                  onChange={(next) => onChange(next ?? 'approved')}
                />
              )}
            />
          ) : null}
        </View>
      </SectionCard>

      {/*
        The emergency-contact pair that used to sit here had no column on the
        driver model and no field on DriverCreateRequest, so everything typed
        into it was dropped in transit. `address` is the column that does exist
        and was never offered.
      */}
      <SectionCard title="Address" icon="home-outline">
        <Controller
          control={control}
          name="address"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="Address"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="House, street, area, city"
              multiline
              error={errors.address?.message}
            />
          )}
        />
      </SectionCard>

      {mode === 'create' ? (
        <SectionCard title="Driver App Sign-in" icon="key-outline">
          <View
            style={{
              gap: t.spacing.lg,
            }}
          >
            <Notice icon="information-circle-outline">
              Optional. Fill these in to create the account this driver signs in to the
              app with — it is linked to this driver record, so they see only their own
              trips. Leave blank to add the driver as a record only.
            </Notice>
            <Controller
              control={control}
              name="login_email"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField
                  label="Email Address"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="driver@company.com"
                  icon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.login_email?.message}
                  hint="Their login id — must be unique across the platform."
                />
              )}
            />
            <Controller
              control={control}
              name="login_password"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField
                  label="Password"
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="At least 8 characters"
                  icon="lock-closed-outline"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.login_password?.message}
                />
              )}
            />
          </View>
        </SectionCard>
      ) : null}

      <Button
        label={mode === 'create' ? 'Save Driver' : 'Update Driver'}
        icon="save-outline"
        loading={submitting}
        onPress={handleSubmit((values) => onSubmit(values, licenceDocument))}
      />
    </>
  );
}
