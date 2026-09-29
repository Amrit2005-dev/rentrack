import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorState,
  InlineError,
  Notice,
  PillTabs,
  Screen,
  ScreenHeader,
  SearchBar,
  SectionCard,
  SelectField,
  SkeletonList,
  TextField,
} from '@/components/ui';
import { ClientField } from '@/features/billing/ClientField';
import { useCreateChallan } from '@/hooks/billing';
import { useDrivers, useVehicles } from '@/hooks/fleet';
import { useRateLookup } from '@/hooks/rateCards';
import { chargeForHours } from '@/api/rateCards';
import { currency, humanise } from '@/utils/format';
import { useTheme } from '@/theme';
import { SuperAdminWriteNotice } from '@/features/accounts/SuperAdminWriteNotice';
import { usePermissions } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';
/** Hours are stored as NUMERIC(8,2); half-hour steps match how sites report. */
const STEP = 0.5;
const MAX_HOURS = 24;
const round = (value) => Math.round(value * 100) / 100;
/**
 * SRS Module 4 — "Add Running Hours". One row per vehicle, quick ± steppers,
 * and a single Generate Challan that compiles the day into POST /challans.
 *
 * Pricing comes from the rate cards: ChallanCreateRequest requires `amount`,
 * and every item requires its own `amount` alongside `running_hours`. The
 * screen used to send hours by themselves, which the API rejected outright, so
 * the rate card is not a nicety here — it is what makes the request valid.
 *
 * A row's charge is the machine type's hourly rate times its hours, recomputed
 * as either changes, and the challan total is their sum.
 */
export default function AddRunningHoursScreen() {
  const { canManageOrganizations: isPlatformAdmin } = usePermissions();
  // Managing a company supplies the org_id the create route needs.
  const scopedCompanyId = useScopedCompanyId();
  if (isPlatformAdmin && !scopedCompanyId) {
    return <SuperAdminWriteNotice title="Add Running Hours" resource="Challans" />;
  }

  const t = useTheme();
  const create = useCreateChallan();
  const [challanDate, setChallanDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [clientId, setClientId] = useState(null);
  const [hours, setHours] = useState({});
  const [drafts, setDrafts] = useState({});
  const [drivers, setDrivers] = useState({});
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [formError, setFormError] = useState();
  const vehiclesQuery = useVehicles({
    page_size: 200,
  });
  const driversQuery = useDrivers({
    page_size: 200,
  });
  const vehicles = vehiclesQuery.data?.items ?? [];
  const crew = driversQuery.data?.items ?? [];
  // Keyed on the client so a card written for them beats the company default.
  const { cardFor, hasRateCards, isLoading: ratesLoading } = useRateLookup(clientId);
  const vehicleById = useMemo(() => {
    const map = new Map();
    for (const vehicle of vehicles) map.set(vehicle.id, vehicle);
    return map;
  }, [vehicles]);

  /** What one row is worth: the machine type's hourly rate times its hours. */
  const chargeFor = (vehicleId, worked) =>
    chargeForHours(cardFor(vehicleById.get(vehicleId)), worked);

  /** A vehicle's default operator is whoever it is assigned to. */
  const assignedDriver = (vehicleId) =>
    crew.find((driver) => driver.assigned_vehicle_id === vehicleId)?.id ?? null;
  const driverOptions = useMemo(
    () =>
      crew.map((driver) => ({
        value: driver.id,
        label: driver.full_name,
        hint: driver.mobile,
      })),
    [crew],
  );
  const entered = useMemo(
    () => Object.entries(hours).filter(([, value]) => value > 0),
    [hours],
  );
  const totalHours = round(entered.reduce((sum, [, value]) => sum + value, 0));
  const totalAmount = round(
    entered.reduce((sum, [vehicleId, value]) => sum + chargeFor(vehicleId, value), 0),
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (scope === 'working' && vehicle.status !== 'in_trip') return false;
      if (scope === 'entered' && !(hours[vehicle.id] > 0)) return false;
      if (!needle) return true;
      return (
        vehicle.registration_no.toLowerCase().includes(needle) ||
        vehicle.type?.toLowerCase().includes(needle)
      );
    });
  }, [vehicles, query, scope, hours]);
  const tabs = [
    {
      key: 'all',
      label: 'All Vehicles',
      count: vehicles.length,
    },
    {
      key: 'working',
      label: 'On Site',
      count: vehicles.filter((vehicle) => vehicle.status === 'in_trip').length,
    },
    {
      key: 'entered',
      label: 'Entered',
      count: entered.length,
    },
  ];
  const clamp = (value) => round(Math.min(MAX_HOURS, Math.max(0, value)));

  /** Whoever the vehicle is assigned to, unless the row already picked someone. */
  const claimDriver = (vehicle) =>
    setDrivers((prev) =>
      prev[vehicle.id] !== undefined
        ? prev
        : {
            ...prev,
            [vehicle.id]: assignedDriver(vehicle.id),
          },
    );

  /**
   * Relative step, for the +/− buttons. The new value is computed from the
   * previous state rather than from the rendered one: two quick taps land in
   * the same render, and reading the closure would make the second overwrite
   * the first instead of adding to it.
   */
  const stepHoursFor = (vehicle, delta) => {
    setFormError(undefined);
    setHours((prev) => ({
      ...prev,
      [vehicle.id]: clamp((prev[vehicle.id] ?? 0) + delta),
    }));
    // Drop any half-typed draft so the box falls back to showing the total.
    setDrafts((prev) => {
      if (prev[vehicle.id] === undefined) return prev;
      const next = { ...prev };
      delete next[vehicle.id];
      return next;
    });
    claimDriver(vehicle);
  };
  const generate = () => {
    if (!challanDate) {
      setFormError('Pick the date this work was done on');
      return;
    }
    if (dayjs(challanDate).isAfter(dayjs(), 'day')) {
      setFormError('A challan cannot be dated in the future');
      return;
    }
    if (!clientId) {
      setFormError('Choose the client this work was done for');
      return;
    }
    if (!entered.length) {
      setFormError('Enter running hours for at least one vehicle');
      return;
    }
    /*
     * Every priced row needs a rate card for its machine type. Sending zero
     * would be accepted by the API and produce a challan worth nothing, which
     * is worse than refusing: the operator would not find out until the invoice.
     */
    const unpriced = entered
      .filter(([vehicleId]) => !cardFor(vehicleById.get(vehicleId)))
      .map(([vehicleId]) => vehicleById.get(vehicleId)?.registration_no)
      .filter(Boolean);
    if (unpriced.length) {
      setFormError(
        `No rate card for ${unpriced.join(', ')}. Add one for that vehicle type before generating this challan.`,
      );
      return;
    }
    const items = entered.map(([vehicleId, running_hours]) => ({
      // The API's column is machine_id; vehicle_id was ignored as an unknown
      // field, so the line never linked back to the machine.
      machine_id: vehicleId,
      driver_id: drivers[vehicleId] ?? assignedDriver(vehicleId),
      running_hours,
      amount: chargeFor(vehicleId, running_hours),
    }));
    create.mutate(
      {
        client_id: clientId,
        challan_date: challanDate,
        // Required on ChallanCreateRequest, and the sum of what the rows charge.
        amount: round(items.reduce((sum, item) => sum + item.amount, 0)),
        hours_worked: totalHours,
        items,
      },
      {
        onSuccess: (challan) => router.replace(`/admin/challans/${challan.id}?created=1`),
      },
    );
  };
  const loading = vehiclesQuery.isLoading || driversQuery.isLoading;
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <ScreenHeader
          title="Add Running Hours"
          subtitle="Capture today's work, then generate the challan"
          back
        />

        <SectionCard title="Challan Details" icon="document-text-outline">
          <DateField
            label="Challan Date"
            required
            value={challanDate}
            onChange={setChallanDate}
            hint="Defaults to today. Back-date it if you are catching up."
          />
          <ClientField value={clientId} onChange={setClientId} />
        </SectionCard>

        {loading ? <SkeletonList count={4} /> : null}
        {vehiclesQuery.error ? (
          <ErrorState error={vehiclesQuery.error} onRetry={vehiclesQuery.refetch} />
        ) : null}

        {!loading && !vehiclesQuery.error ? (
          <>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search by number or machine type"
            />
            <PillTabs items={tabs} value={scope} onChange={setScope} />

            {visible.length ? (
              <View
                style={{
                  gap: t.spacing.md,
                }}
              >
                {visible.map((vehicle) => {
                  const value = hours[vehicle.id] ?? 0;
                  const draft = drafts[vehicle.id] ?? (value ? String(value) : '');
                  const driverId = drivers[vehicle.id] ?? assignedDriver(vehicle.id);
                  const active = value > 0;
                  return (
                    <Card
                      key={vehicle.id}
                      padded={false}
                      style={{
                        padding: t.spacing.lg,
                        gap: t.spacing.md,
                        borderColor: active ? t.accent.primary : t.color.line,
                        backgroundColor: active ? t.accent.primaryFaint : t.color.surface,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: t.spacing.md,
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: t.radius.md,
                            backgroundColor: active
                              ? t.accent.primarySoft
                              : t.color.canvas,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons
                            name="bus-outline"
                            size={18}
                            color={active ? t.accent.primary : t.color.muted}
                          />
                        </View>
                        <View
                          style={{
                            flex: 1,
                            gap: 2,
                          }}
                        >
                          <AppText variant="bodyStrong" numberOfLines={1}>
                            {vehicle.registration_no}
                          </AppText>
                          <AppText variant="caption" tone="muted" numberOfLines={1}>
                            {humanise(vehicle.type)}
                            {vehicle.status === 'in_trip' ? ' · On site' : ''}
                          </AppText>
                        </View>
                        {/* The rate that prices this row, and what the hours
                            entered so far come to under it. Recomputes as the
                            machine's hours or the chosen client change. */}
                        {(() => {
                          const card = cardFor(vehicle);
                          if (!card) {
                            return value > 0 ? (
                              <AppText variant="caption" tone="danger" numberOfLines={1}>
                                No rate card
                              </AppText>
                            ) : null;
                          }
                          return (
                            <View
                              style={{
                                alignItems: 'flex-end',
                              }}
                            >
                              <AppText variant="caption" tone="muted" numberOfLines={1}>
                                {currency(card.per_hour_rate)}/h
                              </AppText>
                              {value > 0 ? (
                                <AppText variant="bodyStrong" numberOfLines={1}>
                                  {currency(chargeFor(vehicle.id, value))}
                                </AppText>
                              ) : null}
                            </View>
                          );
                        })()}
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: t.spacing.md,
                          paddingTop: t.spacing.md,
                          borderTopWidth: 1,
                          borderTopColor: active
                            ? t.accent.primarySoft
                            : t.color.lineSoft,
                        }}
                      >
                        <AppText
                          variant="label"
                          tone="muted"
                          style={{
                            flex: 1,
                          }}
                        >
                          Running hours
                        </AppText>
                        <Stepper
                          value={value}
                          draft={draft}
                          onDraft={(text) => {
                            setFormError(undefined);
                            setDrafts((prev) => ({
                              ...prev,
                              [vehicle.id]: text,
                            }));
                            const parsed = Number(text);
                            if (text === '') {
                              setHours((prev) => ({
                                ...prev,
                                [vehicle.id]: 0,
                              }));
                            } else if (!Number.isNaN(parsed)) {
                              setHours((prev) => ({
                                ...prev,
                                [vehicle.id]: clamp(parsed),
                              }));
                              claimDriver(vehicle);
                            }
                          }}
                          onStep={(delta) => stepHoursFor(vehicle, delta)}
                        />
                      </View>

                      {/* The operator only matters once there are hours to attribute. */}
                      {active ? (
                        <SelectField
                          label="Operator"
                          placeholder="Select driver"
                          leadingIcon="person-outline"
                          searchable={driverOptions.length > 6}
                          allowClear
                          value={driverId}
                          onChange={(next) =>
                            setDrivers((prev) => ({
                              ...prev,
                              [vehicle.id]: next,
                            }))
                          }
                          options={driverOptions}
                        />
                      ) : null}
                    </Card>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                icon="bus-outline"
                title={vehicles.length ? 'No vehicles match' : 'No vehicles yet'}
                message={
                  vehicles.length
                    ? 'Clear the search or switch the filter.'
                    : 'Add a vehicle to your fleet before raising a challan.'
                }
                actionLabel={vehicles.length ? undefined : 'Add Vehicle'}
                onAction={
                  vehicles.length ? undefined : () => router.push('/admin/vehicle/new')
                }
              />
            )}

            <Card tone="accentSoft">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <AppText variant="caption" tone="muted">
                    Total running hours and charge
                  </AppText>
                  <AppText variant="display" tone="accent">
                    {totalHours} h · {currency(totalAmount)}
                  </AppText>
                  <AppText variant="caption" tone="faint">
                    {entered.length} {entered.length === 1 ? 'vehicle' : 'vehicles'} on{' '}
                    {dayjs(challanDate).format('DD MMM YYYY')}
                  </AppText>
                </View>
                <Ionicons name="time-outline" size={28} color={t.accent.primary} />
              </View>
            </Card>

            {!ratesLoading && !hasRateCards ? (
              <Notice icon="alert-circle-outline" tone="warning">
                No rate cards are configured, so there is nothing to price this work
                against. Add a card for each vehicle type before generating a challan —
                the API requires an amount on every line.
              </Notice>
            ) : (
              <Notice icon="calculator-outline">
                Charges come from the rate card for each vehicle&apos;s type, and a card
                written for the selected client is used ahead of the company-wide one.
                Every amount above recalculates as the hours or the client change.
              </Notice>
            )}

            {formError ? (
              <AppText variant="caption" tone="danger">
                {formError}
              </AppText>
            ) : null}
            {create.error ? <InlineError error={create.error} /> : null}

            <Button
              label="Generate Challan"
              icon="receipt-outline"
              loading={create.isPending}
              onPress={generate}
            />
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** ± half-hour buttons around a direct-entry box, so 7.5 h is one tap or one type. */
function Stepper({ value, draft, onDraft, onStep }) {
  const t = useTheme();
  const button = (icon, delta, disabled) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? 'Add half an hour' : 'Remove half an hour'}
      disabled={disabled}
      onPress={() => onStep(delta)}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? t.color.canvas : t.accent.primarySoft,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={18}
        color={disabled ? t.color.faint : t.accent.primaryDark}
      />
    </Pressable>
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
      }}
    >
      {button('remove', -STEP, value <= 0)}
      <TextField
        containerStyle={{
          width: 86,
        }}
        value={draft}
        onChangeText={onDraft}
        placeholder="0"
        keyboardType="decimal-pad"
        textAlign="center"
        accessibilityLabel="Running hours"
        suffix="h"
      />
      {button('add', STEP, value >= MAX_HOURS)}
    </View>
  );
}
