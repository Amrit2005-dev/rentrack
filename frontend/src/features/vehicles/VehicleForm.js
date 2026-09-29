import React, { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  DateField,
  InlineError,
  SectionCard,
  SelectField,
  TextField,
} from '@/components/ui';
import { DocumentField } from '@/features/documents/DocumentField';
import { useTheme } from '@/theme';

/**
 * The API models vehicle type as free text, so the picker offers the common
 * ones while still allowing anything the operator types.
 */
const TYPE_OPTIONS = [
  'Truck',
  'Tipper',
  'Trailer',
  'Container Truck',
  'Pickup',
  'Crane',
  'JCB',
  'Bulldozer',
  'Excavator',
  'Loader',
  'Tractor',
  'Other',
].map((value) => ({
  value,
  label: value,
}));
/**
 * MachineStatus, minus ON_TRIP: that one is set by the trip lifecycle, and
 * offering it here would let the fleet screen contradict the trip screen.
 *
 * These are the server's own values. "idle" and "inactive" belonged to neither
 * the API's vocabulary nor the UI's, and the control was discarded in transit
 * anyway, so nothing it offered was ever stored.
 */
const STATUS_OPTIONS = [
  {
    value: 'AVAILABLE',
    label: 'Available',
    hint: 'In service, free to assign',
  },
  {
    value: 'MAINTENANCE',
    label: 'Maintenance',
    hint: 'Off the road',
  },
  {
    value: 'RETIRED',
    label: 'Retired',
    hint: 'Out of the fleet',
  },
];
const schema = z.object({
  registration_no: z.string().trim().min(1, 'Registration number is required'),
  type: z.string().trim().min(1, 'Vehicle type is required'),
  capacity_tons: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Enter a number'),
  model_name: z.string().trim().optional().or(z.literal('')),
  manufacturer: z.string().trim().optional().or(z.literal('')),
  year_of_manufacture: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^[0-9]{4}$/.test(v), 'Enter a four-digit year')
    .refine(
      (v) => !v || (Number(v) >= 1950 && Number(v) <= new Date().getFullYear() + 1),
      'Enter a year between 1950 and next year',
    ),
  rc_number: z.string().trim().optional().or(z.literal('')),
  insurance_number: z.string().trim().optional().or(z.literal('')),
  insurance_expiry: z.string().optional().or(z.literal('')),
  fitness_expiry: z.string().optional().or(z.literal('')),
  pollution_expiry: z.string().optional().or(z.literal('')),
  api_status: z.string().optional(),
});
const orNull = (v) => (v && v.trim() ? v.trim() : null);
export function toVehicleCreatePayload(values) {
  return {
    registration_no: values.registration_no.trim().toUpperCase(),
    type: values.type.trim(),
    capacity_tons: values.capacity_tons ? Number(values.capacity_tons) : null,
    model_name: orNull(values.model_name),
    manufacturer: orNull(values.manufacturer),
    year_of_manufacture: orNull(values.year_of_manufacture),
    rc_number: orNull(values.rc_number),
    insurance_number: orNull(values.insurance_number),
    insurance_expiry: orNull(values.insurance_expiry),
    fitness_expiry: orNull(values.fitness_expiry),
    pollution_expiry: orNull(values.pollution_expiry),
  };
}

/** Registration number is immutable once set — the API's update body omits it. */
export function toVehicleUpdatePayload(values) {
  const { registration_no, ...rest } = toVehicleCreatePayload(values);
  return {
    ...rest,
    ...(values.api_status
      ? {
          api_status: values.api_status,
        }
      : {}),
  };
}
export function VehicleForm({ mode, initial, submitting, error, onSubmit }) {
  const t = useTheme();
  /*
   * Picked scans, keyed rc | insurance | fitness | puc. Files are not form
   * values, so they sit outside the Zod contract and are uploaded by the screen
   * once the vehicle is saved.
   */
  const [documents, setDocuments] = useState({});
  const documentField = (kind, label, urlKey) => (
    <DocumentField
      label={`Attach ${label}`}
      hint={`A photo or PDF of the ${label}, up to 8 MB.`}
      value={documents[kind] ?? null}
      onChange={(file) => setDocuments((current) => ({ ...current, [kind]: file }))}
      existingUrl={initial?.[urlKey] ?? null}
    />
  );
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      registration_no: initial?.registration_no ?? '',
      type: initial?.type ?? 'Truck',
      capacity_tons: initial?.capacity_tons != null ? String(initial.capacity_tons) : '',
      model_name: initial?.model_name ?? '',
      manufacturer: initial?.manufacturer ?? '',
      year_of_manufacture:
        initial?.year_of_manufacture != null ? String(initial.year_of_manufacture) : '',
      rc_number: initial?.rc_number ?? '',
      insurance_number: initial?.insurance_number ?? '',
      insurance_expiry: initial?.insurance_expiry ?? '',
      fitness_expiry: initial?.fitness_expiry ?? '',
      pollution_expiry: initial?.pollution_expiry ?? '',
      ...(mode === 'edit'
        ? {
            // The server's own value, not the collapsed display one that
            // adaptVehicle derives for badges.
            api_status: initial?.api_status ?? 'AVAILABLE',
          }
        : {}),
    },
  });
  return (
    <>
      <InlineError error={error} />

      <SectionCard title="Basic Information" icon="information-circle-outline">
        <View
          style={{
            gap: t.spacing.lg,
          }}
        >
          <Controller
            control={control}
            name="registration_no"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Vehicle Number"
                required
                value={value}
                onChangeText={(next) => onChange(next.toUpperCase())}
                onBlur={onBlur}
                placeholder="MH 12 AB 1234"
                autoCapitalize="characters"
                editable={mode === 'create'}
                error={errors.registration_no?.message}
                hint={mode === 'edit' ? 'Registration cannot be changed' : undefined}
              />
            )}
          />

          <Controller
            control={control}
            name="type"
            render={({ field: { value, onChange } }) => (
              <SelectField
                label="Vehicle Type"
                required
                placeholder="Select vehicle type"
                options={TYPE_OPTIONS}
                value={value}
                onChange={(next) => onChange(next ?? 'Other')}
                searchable
                error={errors.type?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="capacity_tons"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Capacity"
                value={value ?? ''}
                onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
                onBlur={onBlur}
                placeholder="25"
                suffix="Ton"
                keyboardType="decimal-pad"
                error={errors.capacity_tons?.message}
              />
            )}
          />

          {/* Real columns on the machine model that the form never offered. */}
          {[
            ['manufacturer', 'Manufacturer', 'Tata Motors'],
            ['model_name', 'Model', 'LPT 3118'],
          ].map(([name, label, placeholder]) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField
                  label={label}
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={placeholder}
                  error={errors[name]?.message}
                />
              )}
            />
          ))}

          <Controller
            control={control}
            name="year_of_manufacture"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Year of Manufacture"
                value={value ?? ''}
                onChangeText={(next) => onChange(next.replace(/[^0-9]/g, '').slice(0, 4))}
                onBlur={onBlur}
                placeholder="2021"
                keyboardType="number-pad"
                error={errors.year_of_manufacture?.message}
              />
            )}
          />
        </View>
      </SectionCard>

      <SectionCard title="Documents & Compliance" icon="document-text-outline">
        <View
          style={{
            gap: t.spacing.lg,
          }}
        >
          {/* Each document's details sit with the upload for its scan. The RC
              has a number column but no expiry column, so no date for it. */}
          <Controller
            control={control}
            name="rc_number"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="RC Number"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="MH1220240012345"
                autoCapitalize="characters"
                error={errors.rc_number?.message}
              />
            )}
          />
          {documentField('rc', 'RC', 'rc_document_url')}

          <Controller
            control={control}
            name="insurance_number"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Insurance Policy Number"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="POL/2024/00123"
                autoCapitalize="characters"
                error={errors.insurance_number?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="insurance_expiry"
            render={({ field: { value, onChange } }) => (
              <DateField label="Insurance Valid Till" value={value || null} onChange={onChange} />
            )}
          />
          {documentField('insurance', 'Insurance', 'insurance_document_url')}

          <Controller
            control={control}
            name="fitness_expiry"
            render={({ field: { value, onChange } }) => (
              <DateField label="Fitness Valid Till" value={value || null} onChange={onChange} />
            )}
          />
          {documentField('fitness', 'Fitness Certificate', 'fitness_document_url')}

          <Controller
            control={control}
            name="pollution_expiry"
            render={({ field: { value, onChange } }) => (
              <DateField label="PUC Valid Till" value={value || null} onChange={onChange} />
            )}
          />
          {documentField('puc', 'PUC Certificate', 'puc_document_url')}
        </View>
      </SectionCard>

      {mode === 'edit' ? (
        <SectionCard title="Operational Status" icon="pulse-outline">
          <Controller
            control={control}
            name="api_status"
            render={({ field: { value, onChange } }) => (
              <SelectField
                label="Status"
                placeholder="Select status"
                options={STATUS_OPTIONS}
                value={value}
                onChange={(next) => onChange(next ?? 'AVAILABLE')}
              />
            )}
          />
        </SectionCard>
      ) : null}

      <Button
        label={mode === 'create' ? 'Save Vehicle' : 'Update Vehicle'}
        icon="save-outline"
        loading={submitting}
        onPress={handleSubmit((values) => onSubmit(values, documents))}
      />
    </>
  );
}
