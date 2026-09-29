import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
  AppText,
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorState,
  InlineError,
  Notice,
  Screen,
  ScreenHeader,
  SelectField,
  Sheet,
  SkeletonList,
  StatRow,
  StatTile,
  TextField,
} from '@/components/ui';
import { MenuButton } from '@/features/shell/MenuButton';
import { PAYMENT_MODES, needsReference, paymentModeLabel } from '@/api/collections';
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useUpdateCollection,
} from '@/hooks/money';
import { useDrivers } from '@/hooks/fleet';
import { usePermissions, useCurrentUser } from '@/store/auth';
import { currency, formatDate } from '@/utils/format';
import { confirmDestructive } from '@/utils/confirm';
import { displayName } from '@/utils/permissions';
import { useTheme } from '@/theme';

/**
 * SRS Module B7 — Driver Daily Collection.
 *
 * What a driver took in on the road: cash at delivery, a UPI transfer, a
 * cheque. `POST /driver-collections/` sits behind require_user rather than
 * require_operator, which makes this the one money screen a driver can write
 * to — every other one is admin-only.
 *
 * `driver_id` is required on the create body and the session carries a user id,
 * not a driver id, so the driver picks themselves from the crew list. That
 * match is by name, which is the only link this API version exposes between
 * the two records.
 */
/**
 * @param {object} props
 * @param {'driver'|'admin'} [props.shell] Which shell is rendering this.
 *   The driver reaches it from a panel row, so its header opens that panel;
 *   in the console it is a pushed screen, so the header goes back.
 */
export function CollectionsView({ shell = 'driver' }) {
  const t = useTheme();
  const user = useCurrentUser();
  const collections = useCollections();
  const drivers = useDrivers({ page_size: 200 });
  const create = useCreateCollection();
  const update = useUpdateCollection();
  const remove = useDeleteCollection();

  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState(null);

  const [collectionDate, setCollectionDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [driverId, setDriverId] = useState(null);

  const { canViewResources } = usePermissions();
  const crew = drivers.data?.items ?? [];
  /*
   * Recording needs a driver_id, and the only way to obtain one is GET
   * /drivers/ — which is require_operator. A driver therefore cannot name
   * themselves on their own collection, so for them this screen reads rather
   * than writes, and says why instead of offering a picker with nothing in it.
   */
  const canRecord = canViewResources;

  /* The driver record that matches the signed-in user, so the form opens on
     the right person instead of asking them who they are. */
  const ownDriverId = useMemo(() => {
    const mine = displayName(user).trim().toLowerCase();
    return crew.find((d) => d.full_name?.trim().toLowerCase() === mine)?.id ?? null;
  }, [crew, user]);

  const rows = useMemo(
    () =>
      [...(collections.data?.items ?? [])].sort(
        (a, b) => new Date(b.collection_date ?? 0) - new Date(a.collection_date ?? 0),
      ),
    [collections.data],
  );

  const today = dayjs().format('YYYY-MM-DD');
  const totals = useMemo(() => {
    const sum = (list) => list.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
    return {
      today: sum(rows.filter((r) => String(r.collection_date).slice(0, 10) === today)),
      month: sum(rows.filter((r) => dayjs(r.collection_date).isSame(dayjs(), 'month'))),
      count: rows.length,
    };
  }, [rows, today]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([collections.refetch(), drivers.refetch()]);
    setRefreshing(false);
  };

  const openSheet = () => {
    setFormError(null);
    setEditing(null);
    setCollectionDate(today);
    setAmount('');
    setMode('CASH');
    setReference('');
    setNotes('');
    setDriverId(ownDriverId);
    setSheetOpen(true);
  };

  /** The same sheet, loaded with a row that already exists. */
  const openEdit = (row) => {
    setFormError(null);
    setEditing(row);
    setCollectionDate(String(row.collection_date ?? today).slice(0, 10));
    setAmount(row.amount != null ? String(row.amount) : '');
    setMode(row.payment_mode ?? 'CASH');
    setReference(row.reference_no ?? '');
    setNotes(row.notes ?? '');
    setDriverId(row.driver_id ?? null);
    setSheetOpen(true);
  };

  const confirmDelete = (row) =>
    confirmDestructive({
      title: 'Delete collection',
      message: `${currency(row.amount)} recorded on ${formatDate(
        row.collection_date,
      )} will be removed. This cannot be undone.`,
      onConfirm: () =>
        remove.mutate(row.id, {
          onSuccess: () => setSheetOpen(false),
          onError: (error) => setFormError(error),
        }),
    });

  const submit = () => {
    const value = Number(amount);
    if (!driverId) {
      setFormError(new Error('Choose which driver collected this.'));
      return;
    }
    if (!collectionDate) {
      setFormError(new Error('Pick the date it was collected on.'));
      return;
    }
    if (dayjs(collectionDate).isAfter(dayjs(), 'day')) {
      setFormError(new Error('A collection cannot be dated in the future.'));
      return;
    }
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setFormError(new Error('Enter an amount greater than zero.'));
      return;
    }
    if (needsReference(mode) && !reference.trim()) {
      setFormError(
        new Error(`Enter the ${paymentModeLabel(mode)} reference so it can be traced.`),
      );
      return;
    }
    setFormError(null);
    const payload = {
      driver_id: driverId,
      collection_date: collectionDate,
      amount: value,
      payment_mode: mode,
      // Sent as null rather than omitted: clearing a reference has to reach the
      // column, and the service only skips keys that are absent entirely.
      reference_no: reference.trim() || null,
      notes: notes.trim() || null,
    };
    const handlers = {
      onSuccess: () => setSheetOpen(false),
      onError: (error) => setFormError(error),
    };
    if (editing) {
      update.mutate({ id: editing.id, ...payload }, handlers);
      return;
    }
    create.mutate(payload, handlers);
  };

  const driverOptions = crew.map((d) => ({
    value: d.id,
    label: d.full_name,
    hint: d.mobile,
  }));
  const nameFor = (id) => crew.find((d) => d.id === id)?.full_name ?? 'Driver';

  return (
    <>
      <Screen
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenHeader
          title="Collections"
          subtitle={
            canRecord
              ? 'Cash and transfers taken on the road'
              : 'What you took in on the road'
          }
          large
          left={shell === 'driver' ? <MenuButton /> : undefined}
          back={shell !== 'driver'}
        />

        <StatRow>
          <StatTile label="Today" value={currency(totals.today)} tone="accent" />
          <StatTile label="This month" value={currency(totals.month)} tone="success" />
          <StatTile label="Entries" value={totals.count} tone="info" />
        </StatRow>

        {canRecord ? (
          <Button
            label="Record Collection"
            icon="add-circle-outline"
            onPress={openSheet}
          />
        ) : (
          <Notice icon="information-circle-outline">
            Recording a collection needs the crew list, which only the office can read on
            this API version. Ask an admin to enter it, or read today&apos;s entries
            below.
          </Notice>
        )}

        {collections.isLoading ? <SkeletonList count={4} /> : null}
        {collections.error ? (
          <ErrorState error={collections.error} onRetry={collections.refetch} />
        ) : null}

        {!collections.isLoading && !collections.error ? (
          rows.length ? (
            <View style={{ gap: t.spacing.md }}>
              {rows.map((row) => (
                <Pressable
                  key={row.id}
                  accessibilityRole={canRecord ? 'button' : 'text'}
                  accessibilityLabel={
                    canRecord
                      ? `Edit ${currency(row.amount)} on ${formatDate(row.collection_date)}`
                      : undefined
                  }
                  disabled={!canRecord}
                  onPress={() => openEdit(row)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Card>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: t.spacing.md,
                      }}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: t.accent.primarySoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons
                          name={
                            PAYMENT_MODES.find((m) => m.value === row.payment_mode)
                              ?.icon ?? 'cash-outline'
                          }
                          size={18}
                          color={t.accent.primaryDark}
                        />
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="bodyStrong">{currency(row.amount)}</AppText>
                        <AppText variant="caption" tone="muted">
                          {paymentModeLabel(row.payment_mode)} ·{' '}
                          {formatDate(row.collection_date)}
                        </AppText>
                        {row.reference_no ? (
                          <AppText variant="caption" tone="muted" numberOfLines={1}>
                            Ref {row.reference_no}
                          </AppText>
                        ) : null}
                        {row.notes ? (
                          <AppText variant="caption" tone="muted" numberOfLines={2}>
                            {row.notes}
                          </AppText>
                        ) : null}
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <AppText variant="caption" tone="muted" numberOfLines={1}>
                          {nameFor(row.driver_id)}
                        </AppText>
                        {canRecord ? (
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={t.color.faint}
                          />
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="cash-outline"
              title="Nothing collected yet"
              message="Record what you take in and it will show up here for the office."
            />
          )
        ) : null}
      </Screen>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Collection' : 'Record Collection'}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ gap: t.spacing.lg }}>
            <InlineError error={formError} />

            <SelectField
              label="Collected by"
              required
              placeholder={drivers.isLoading ? 'Loading crew…' : 'Choose a driver'}
              options={driverOptions}
              value={driverId}
              onChange={setDriverId}
              searchable
              leadingIcon="person-outline"
            />

            <DateField
              label="Collected on"
              value={collectionDate || null}
              onChange={setCollectionDate}
            />

            <TextField
              label="Amount"
              required
              value={amount}
              onChangeText={(next) => setAmount(next.replace(/[^0-9.]/g, ''))}
              placeholder="4500"
              keyboardType="decimal-pad"
            />

            <SelectField
              label="Payment mode"
              required
              options={PAYMENT_MODES.map(({ value, label }) => ({ value, label }))}
              value={mode}
              onChange={(next) => setMode(next ?? 'CASH')}
            />

            {/* Cash has nothing to reference; everything else does. */}
            {needsReference(mode) ? (
              <TextField
                label={`${paymentModeLabel(mode)} reference`}
                required
                value={reference}
                onChangeText={setReference}
                placeholder="UTR / cheque number"
                autoCapitalize="characters"
              />
            ) : null}

            <TextField
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything the office should know"
              multiline
            />

            <Button
              label={editing ? 'Save Changes' : 'Save Collection'}
              icon="checkmark-circle-outline"
              loading={create.isPending || update.isPending}
              onPress={submit}
            />

            {editing ? (
              <Button
                label="Delete Collection"
                icon="trash-outline"
                variant="danger"
                loading={remove.isPending}
                onPress={() => confirmDelete(editing)}
              />
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Sheet>
    </>
  );
}
