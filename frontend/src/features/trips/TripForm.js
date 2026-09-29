import React from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import {
  AppText,
  Button,
  DateField,
  InlineError,
  Notice,
  SectionCard,
  SelectField,
  TextField,
  TimeField,
} from '@/components/ui';
import { ClientField } from '@/features/billing/ClientField';
import { useDrivers, useVehicles } from '@/hooks/fleet';
import { currency, humanise } from '@/utils/format';
import { useRateLookup } from '@/hooks/rateCards';
import { useTheme } from '@/theme';
const numeric = (label) =>
  z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      `Enter a valid ${label}`,
    );
/** "2026-08-31" + "09:30" -> a Date the API accepts as start_at/end_at. */
const combine = (date, time) => new Date(`${date}T${(time || '00:00').slice(0, 5)}:00`);
/** The reverse, for editing an existing trip. */
const splitDate = (iso) => (iso ? dayjs(iso).format('YYYY-MM-DD') : null);
const splitTime = (iso) => (iso ? dayjs(iso).format('HH:mm') : null);

const schema = z
  .object({
    origin: z.string().trim().min(1, 'Origin is required'),
    destination: z.string().trim().min(1, 'Destination is required'),
    // The API schedules on start_at/end_at. Without them a trip is treated as
    // open-ended and the availability check reports every future trip for the
    // same vehicle as a clash ("Vehicle is already scheduled during this time").
    start_date: z.string().min(1, 'Pick the start date'),
    start_time: z.string().min(1, 'Pick the start time'),
    end_date: z.string().min(1, 'Pick the end date'),
    end_time: z.string().min(1, 'Pick the end time'),
    vehicle_id: z.string().nullable().optional(),
    driver_id: z.string().nullable().optional(),
    client_id: z.string().trim().optional().or(z.literal('')),
    material: z.string().trim().optional().or(z.literal('')),
    distance_km: numeric('distance'),
    weight_tons: numeric('weight'),
    base_fare: numeric('fare'),
    // The API has carried these since the first version; the form never sent
    // them, so revenue was only ever base_fare — distance and weight priced at
    // zero however far the trip went.
    rate_per_km: numeric('rate'),
    rate_per_ton: numeric('rate'),
    waiting_hours: numeric('hours'),
    waiting_charge_per_hour: numeric('rate'),
    toll_charge: numeric('amount'),
    extra_charge: numeric('amount'),
    gst_rate: numeric('rate'),
    notes: z.string().trim().optional().or(z.literal('')),
  })
  .refine(
    (v) =>
      !v.start_date ||
      !v.end_date ||
      combine(v.end_date, v.end_time) > combine(v.start_date, v.start_time),
    { message: 'The trip must end after it starts', path: ['end_date'] },
  );
const num = (v) => (v && v.trim() ? Number(v) : null);
const orNull = (v) => (v && v.trim() ? v.trim() : null);
/**
 * The form to the POST /trips body (TripCreate). The trip table has columns
 * for the route, schedule start, fare and charges; what it has no column for
 * (material, planned end, the per-km/ton and waiting rates) travels in
 * `load_details` rather than being dropped.
 */
export function toTripPayload(values) {
  const details = Object.fromEntries(
    Object.entries({
      material: orNull(values.material),
      end_at: combine(values.end_date, values.end_time).toISOString(),
      rate_per_km: num(values.rate_per_km),
      rate_per_ton: num(values.rate_per_ton),
      waiting_hours: num(values.waiting_hours),
      waiting_charge_per_hour: num(values.waiting_charge_per_hour),
    }).filter(([, value]) => value != null),
  );
  return {
    origin: values.origin.trim(),
    destination: values.destination.trim(),
    scheduled_at: combine(values.start_date, values.start_time).toISOString(),
    vehicle_id: values.vehicle_id ?? null,
    driver_id: values.driver_id ?? null,
    client_id: orNull(values.client_id),
    load_details: details,
    distance_km: num(values.distance_km) ?? 0,
    weight_tons: num(values.weight_tons) ?? 0,
    base_fare: num(values.base_fare) ?? 0,
    toll_charge: num(values.toll_charge) ?? 0,
    extra_charge: num(values.extra_charge) ?? 0,
    gst_rate: num(values.gst_rate) ?? 18,
    notes: orNull(values.notes),
  };
}
/** Why a driver can't be put on a new trip, or null if they can. */
function driverBlocker(driver) {
  const reasons = [];
  const status = driver.status ?? 'pending';
  if (status !== 'approved') reasons.push(status === 'pending' ? 'Pending approval' : humanise(status));
  if (driver.availability !== 'available') reasons.push(humanise(driver.availability ?? 'unavailable'));
  return reasons.length ? reasons.join(' · ') : null;
}

/** Why a vehicle can't be put on a new trip, or null if it can. */
function vehicleBlocker(vehicle) {
  if (vehicle.status === 'active') return null;
  return vehicle.status === 'in_trip' ? 'On a trip' : humanise(vehicle.status ?? 'inactive');
}

export function TripForm({ mode, initial, submitting, error, onSubmit }) {
  const t = useTheme();
  const vehicles = useVehicles();
  const drivers = useDrivers();
  /*
   * A new trip only accepts an active vehicle and an approved, available
   * driver (anything else is refused with a 400). Everyone is still listed so
   * the picker never looks empty for no reason: the rest are disabled, with
   * the reason as their hint. Editing leaves all of them selectable.
   */
  const vehicleOptions = (vehicles.data?.items ?? []).map((v) => {
    const why = mode === 'create' ? vehicleBlocker(v) : null;
    return {
      value: v.id,
      label: v.registration_no,
      hint: why ? `${v.type ?? 'Vehicle'} · ${why}` : v.type,
      disabled: !!why,
    };
  });
  const driverOptions = (drivers.data?.items ?? []).map((d) => {
    const why = mode === 'create' ? driverBlocker(d) : null;
    return {
      value: d.id,
      label: d.full_name,
      hint: why ? `${d.mobile ?? ''} · ${why}` : d.mobile,
      disabled: !!why,
    };
  });
  const pickableVehicles = vehicleOptions.filter((o) => !o.disabled).length;
  const pickableDrivers = driverOptions.filter((o) => !o.disabled).length;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      origin: initial?.origin ?? '',
      destination: initial?.destination ?? '',
      start_date: splitDate(initial?.start_at) ?? dayjs().format('YYYY-MM-DD'),
      start_time: splitTime(initial?.start_at) ?? '09:00',
      end_date: splitDate(initial?.end_at) ?? dayjs().format('YYYY-MM-DD'),
      end_time: splitTime(initial?.end_at) ?? '17:00',
      vehicle_id: initial?.vehicle_id ?? null,
      driver_id: initial?.driver_id ?? null,
      client_id: initial?.client_id ?? '',
      material: initial?.load_details?.material ?? '',
      distance_km: initial?.distance_km != null ? String(initial.distance_km) : '',
      weight_tons: initial?.weight_tons != null ? String(initial.weight_tons) : '',
      base_fare: initial?.base_fare != null ? String(initial.base_fare) : '',
      rate_per_km: initial?.rate_per_km != null ? String(initial.rate_per_km) : '',
      rate_per_ton: initial?.rate_per_ton != null ? String(initial.rate_per_ton) : '',
      waiting_hours: initial?.waiting_hours != null ? String(initial.waiting_hours) : '',
      waiting_charge_per_hour:
        initial?.waiting_charge_per_hour != null
          ? String(initial.waiting_charge_per_hour)
          : '',
      toll_charge: initial?.toll_charge != null ? String(initial.toll_charge) : '',
      extra_charge: initial?.extra_charge != null ? String(initial.extra_charge) : '',
      gst_rate: initial?.gst_rate != null ? String(initial.gst_rate) : '18',
      notes: initial?.notes ?? '',
    },
  });

  /*
   * Charges come from the rate card for the selected machine's type, narrowed
   * to the client when they have their own card. Selecting a machine fills the
   * four rate fields and they stay editable — a one-off job that is not on the
   * charge sheet is a real thing, and overwriting a figure the operator typed
   * would be worse than not filling it at all.
   *
   * Only an actual change of machine or client refills them, which is what the
   * ref tracks: re-running on every render would undo every edit as it is made.
   */
  const selectedVehicleId = watch('vehicle_id');
  const selectedClientId = watch('client_id');
  const { cardFor, hasRateCards } = useRateLookup(selectedClientId || null);
  const appliedFor = useRef(null);
  const selectedVehicle = (vehicles.data?.items ?? []).find(
    (v) => v.id === selectedVehicleId,
  );
  const rateCard = selectedVehicle ? cardFor(selectedVehicle) : null;

  useEffect(() => {
    const key = `${selectedVehicleId ?? ''}:${selectedClientId ?? ''}`;
    if (appliedFor.current === key) return;
    appliedFor.current = key;
    if (!rateCard) return;
    setValue('base_fare', String(rateCard.base_fare ?? 0), { shouldDirty: true });
    setValue('rate_per_km', String(rateCard.per_km_rate ?? 0), { shouldDirty: true });
    setValue('rate_per_ton', String(rateCard.per_ton_rate ?? 0), { shouldDirty: true });
    setValue('waiting_charge_per_hour', String(rateCard.waiting_rate ?? 0), {
      shouldDirty: true,
    });
  }, [rateCard, selectedVehicleId, selectedClientId, setValue]);

  // Indicative only — the API computes the authoritative charges on settle.
  const money = watch([
    'base_fare',
    'toll_charge',
    'extra_charge',
    'gst_rate',
    'rate_per_km',
    'distance_km',
    'rate_per_ton',
    'weight_tons',
    'waiting_charge_per_hour',
    'waiting_hours',
  ]);
  const lineFor = (rate, quantity) => (num(rate) ?? 0) * (num(quantity) ?? 0);
  const subtotal =
    (num(money[0]) ?? 0) +
    (num(money[1]) ?? 0) +
    (num(money[2]) ?? 0) +
    lineFor(money[4], money[5]) +
    lineFor(money[6], money[7]) +
    lineFor(money[8], money[9]);
  const gst = (subtotal * (num(money[3]) ?? 0)) / 100;
  return (
    <>
      <InlineError error={error} />

      <SectionCard title="Route Details" icon="location-outline">
        <View
          style={{
            gap: t.spacing.lg,
          }}
        >
          <Controller
            control={control}
            name="origin"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="From"
                required
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter starting location"
                icon="navigate-outline"
                error={errors.origin?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="destination"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="To"
                required
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter destination"
                icon="flag-outline"
                error={errors.destination?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="material"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Load Details"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Sand, cement bags, metal rods"
                icon="cube-outline"
              />
            )}
          />
        </View>
      </SectionCard>

      <SectionCard title="Schedule" icon="calendar-outline">
        <View
          style={{
            gap: t.spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
            <Controller
              control={control}
              name="start_date"
              render={({ field: { value, onChange } }) => (
                <DateField
                  label="Start Date"
                  required
                  containerStyle={{ flex: 1 }}
                  value={value || null}
                  onChange={onChange}
                  error={errors.start_date?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="start_time"
              render={({ field: { value, onChange } }) => (
                <TimeField
                  label="Start Time"
                  required
                  containerStyle={{ flex: 1 }}
                  value={value || null}
                  onChange={onChange}
                  error={errors.start_time?.message}
                />
              )}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
            <Controller
              control={control}
              name="end_date"
              render={({ field: { value, onChange } }) => (
                <DateField
                  label="End Date"
                  required
                  containerStyle={{ flex: 1 }}
                  value={value || null}
                  onChange={onChange}
                  minDate={watch('start_date') || undefined}
                  error={errors.end_date?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="end_time"
              render={({ field: { value, onChange } }) => (
                <TimeField
                  label="End Time"
                  required
                  containerStyle={{ flex: 1 }}
                  value={value || null}
                  onChange={onChange}
                  error={errors.end_time?.message}
                />
              )}
            />
          </View>
          <Notice icon="information-circle-outline">
            The vehicle and driver are checked against this window — a trip that overlaps
            an existing one for either is rejected.
          </Notice>
        </View>
      </SectionCard>

      <SectionCard title="Vehicle & Driver" icon="people-outline">
        <View
          style={{
            gap: t.spacing.lg,
          }}
        >
          <Controller
            control={control}
            name="vehicle_id"
            render={({ field: { value, onChange } }) => (
              <SelectField
                label="Vehicle"
                placeholder={
                  vehicles.isLoading
                    ? 'Loading vehicles…'
                    : pickableVehicles
                      ? 'Choose a vehicle'
                      : 'No active vehicles — see the list for why'
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
            name="driver_id"
            render={({ field: { value, onChange } }) => (
              <SelectField
                label="Driver"
                placeholder={
                  drivers.isLoading
                    ? 'Loading drivers…'
                    : pickableDrivers
                      ? 'Choose a driver'
                      : 'No driver can take a trip — see the list for why'
                }
                options={driverOptions}
                value={value ?? null}
                onChange={onChange}
                searchable
                allowClear
                leadingIcon="person-outline"
              />
            )}
          />
          {/* A real picker now that GET /clients exists — this used to be a
              free-text box asking the user to paste a UUID. */}
          <Controller
            control={control}
            name="client_id"
            render={({ field: { value, onChange } }) => (
              <ClientField
                value={value || null}
                onChange={(next) => onChange(next ?? '')}
                hint="Optional — leave blank to book the trip against the company only."
              />
            )}
          />
        </View>
      </SectionCard>

      <SectionCard title="Charges" icon="cash-outline">
        <View
          style={{
            gap: t.spacing.lg,
          }}
        >
          {/* Says where the numbers below came from, so an operator who edits
              one knows they are overriding the charge sheet rather than filling
              in a blank. */}
          {rateCard ? (
            <Notice icon="pricetags-outline">
              Rates filled from the {humanise(selectedVehicle?.type)} rate card
              {selectedClientId ? ' for this client' : ''}. Edit any of them to charge
              this trip differently.
            </Notice>
          ) : selectedVehicleId && hasRateCards ? (
            <Notice icon="alert-circle-outline" tone="warning">
              No rate card covers {humanise(selectedVehicle?.type)}, so the rates below
              start empty and have to be entered by hand.
            </Notice>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            <Controller
              control={control}
              name="distance_km"
              render={({ field: { value, onChange } }) => (
                <TextField
                  containerStyle={{
                    flex: 1,
                  }}
                  label="Distance"
                  value={value ?? ''}
                  onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
                  placeholder="148"
                  suffix="km"
                  keyboardType="decimal-pad"
                />
              )}
            />
            <Controller
              control={control}
              name="weight_tons"
              render={({ field: { value, onChange } }) => (
                <TextField
                  containerStyle={{
                    flex: 1,
                  }}
                  label="Weight"
                  value={value ?? ''}
                  onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
                  placeholder="18.5"
                  suffix="ton"
                  keyboardType="decimal-pad"
                />
              )}
            />
          </View>

          {/* The per-unit rates the distance and weight above are charged at.
              The API multiplies them out on settle; leaving them at zero is
              what made a 300km trip bill the same as a 3km one. */}
          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            {[
              ['rate_per_km', 'Rate per km (Rs)', '32'],
              ['rate_per_ton', 'Rate per ton (Rs)', '850'],
            ].map(([name, label, placeholder]) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field: { value, onChange } }) => (
                  <TextField
                    containerStyle={{
                      flex: 1,
                    }}
                    label={label}
                    value={value ?? ''}
                    onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
                    placeholder={placeholder}
                    keyboardType="decimal-pad"
                    error={errors[name]?.message}
                  />
                )}
              />
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            {[
              ['waiting_hours', 'Waiting hours', '2', 'h'],
              ['waiting_charge_per_hour', 'Waiting rate (Rs)', '250', undefined],
            ].map(([name, label, placeholder, suffix]) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field: { value, onChange } }) => (
                  <TextField
                    containerStyle={{
                      flex: 1,
                    }}
                    label={label}
                    value={value ?? ''}
                    onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
                    placeholder={placeholder}
                    suffix={suffix}
                    keyboardType="decimal-pad"
                    error={errors[name]?.message}
                  />
                )}
              />
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            <Controller
              control={control}
              name="base_fare"
              render={({ field: { value, onChange } }) => (
                <TextField
                  containerStyle={{
                    flex: 1,
                  }}
                  label="Base Fare"
                  value={value ?? ''}
                  onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
                  placeholder="8000"
                  keyboardType="decimal-pad"
                />
              )}
            />
            <Controller
              control={control}
              name="gst_rate"
              render={({ field: { value, onChange } }) => (
                <TextField
                  containerStyle={{
                    flex: 1,
                  }}
                  label="GST Rate"
                  value={value ?? ''}
                  onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
                  placeholder="18"
                  suffix="%"
                  keyboardType="decimal-pad"
                />
              )}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            <Controller
              control={control}
              name="toll_charge"
              render={({ field: { value, onChange } }) => (
                <TextField
                  containerStyle={{
                    flex: 1,
                  }}
                  label="Toll Charges"
                  value={value ?? ''}
                  onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
                  placeholder="600"
                  keyboardType="decimal-pad"
                />
              )}
            />
            <Controller
              control={control}
              name="extra_charge"
              render={({ field: { value, onChange } }) => (
                <TextField
                  containerStyle={{
                    flex: 1,
                  }}
                  label="Other Charges"
                  value={value ?? ''}
                  onChangeText={(next) => onChange(next.replace(/[^0-9.]/g, ''))}
                  placeholder="300"
                  keyboardType="decimal-pad"
                />
              )}
            />
          </View>

          <View
            style={{
              backgroundColor: t.accent.primaryFaint,
              borderRadius: t.radius.md,
              padding: t.spacing.md,
              gap: 6,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
              }}
            >
              <AppText
                variant="caption"
                tone="muted"
                style={{
                  flex: 1,
                }}
              >
                Charges entered
              </AppText>
              <AppText variant="caption">{currency(subtotal)}</AppText>
            </View>
            <View
              style={{
                flexDirection: 'row',
              }}
            >
              <AppText
                variant="bodyStrong"
                style={{
                  flex: 1,
                }}
              >
                With GST
              </AppText>
              <AppText variant="bodyStrong" tone="accent">
                {currency(subtotal + gst)}
              </AppText>
            </View>
            <AppText variant="micro" tone="faint">
              Indicative — the final amount is calculated when the trip is settled.
            </AppText>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Additional Information" icon="document-text-outline">
        <Controller
          control={control}
          name="notes"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="Notes"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Handle with care. Ensure timely delivery."
              multiline
            />
          )}
        />
      </SectionCard>

      <Button
        label={mode === 'create' ? 'Create Trip' : 'Update Trip'}
        icon={mode === 'create' ? 'add-circle-outline' : 'save-outline'}
        loading={submitting}
        onPress={handleSubmit(onSubmit)}
      />
    </>
  );
}
