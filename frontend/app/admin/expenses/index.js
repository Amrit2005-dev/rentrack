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
  PillTabs,
  Screen,
  ScreenHeader,
  SearchBar,
  SelectField,
  Sheet,
  SkeletonList,
  StatRow,
  StatTile,
  TextField,
} from '@/components/ui';
import { SuperAdminWriteNotice } from '@/features/accounts/SuperAdminWriteNotice';
import { EXPENSE_CATEGORIES, categoryMeta, expensesApi } from '@/api/expenses';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
} from '@/hooks/money';
import { useDrivers, useVehicles } from '@/hooks/fleet';
import { usePermissions } from '@/store/auth';
import { useScopedCompanyId } from '@/store/companyScope';
import { currency, formatDate } from '@/utils/format';
import { confirmDestructive } from '@/utils/confirm';
import { useTheme } from '@/theme';

/**
 * Company expenses — fuel, maintenance, salaries, rent.
 *
 * Lives in the console rather than the driver shell because `GET /expenses/`
 * is guarded by require_operator: a driver asking for it gets a 403.
 *
 * The route takes no query parameters at all — it returns the caller's whole
 * organisation — so the category tabs and the search box both narrow the
 * loaded list rather than asking the server for less.
 */
export default function ExpensesScreen() {
  const { canManageOrganizations: isPlatformAdmin, canManageBilling } = usePermissions();
  const scopedCompanyId = useScopedCompanyId();
  if (isPlatformAdmin && !scopedCompanyId) {
    return <SuperAdminWriteNotice title="Expenses" resource="Expenses" />;
  }

  const t = useTheme();
  const expenses = useExpenses();
  const vehicles = useVehicles({ page_size: 200 });
  const drivers = useDrivers({ page_size: 200 });
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const remove = useDeleteExpense();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [formError, setFormError] = useState(null);

  const [title, setTitle] = useState('');
  const [newCategory, setNewCategory] = useState('FUEL');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [machineId, setMachineId] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [notes, setNotes] = useState('');

  const rows = expenses.data?.items ?? [];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => (category === 'all' ? true : row.category === category))
      .filter((row) => (needle ? (row.title ?? '').toLowerCase().includes(needle) : true))
      .sort((a, b) => new Date(b.expense_date ?? 0) - new Date(a.expense_date ?? 0));
  }, [rows, query, category]);

  const totals = useMemo(() => {
    const sum = (list) => list.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
    return {
      all: sum(rows),
      month: sum(rows.filter((r) => dayjs(r.expense_date).isSame(dayjs(), 'month'))),
      shown: sum(visible),
    };
  }, [rows, visible]);

  const tabs = [
    { key: 'all', label: 'All', count: rows.length },
    ...EXPENSE_CATEGORIES.map((c) => ({
      key: c.value,
      label: c.label,
      count: rows.filter((r) => r.category === c.value).length,
    })),
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await expenses.refetch();
    setRefreshing(false);
  };

  const openSheet = () => {
    setFormError(null);
    setEditing(null);
    setTitle('');
    setNewCategory('FUEL');
    setAmount('');
    setExpenseDate(dayjs().format('YYYY-MM-DD'));
    setMachineId(null);
    setDriverId(null);
    setNotes('');
    setSheetOpen(true);
  };

  /**
   * The same sheet, loaded with an expense that already exists.
   *
   * The row from the list is not enough to edit from: ExpenseListResponse is
   * five fields, with no machine_id, driver_id or notes. Prefilling from it
   * would show those as empty and then save them as null — quietly unlinking
   * the vehicle and losing the note. The full row comes from GET /expenses/{id}.
   */
  const openEdit = async (row) => {
    setFormError(null);
    setLoadingEdit(true);
    setSheetOpen(true);
    setEditing(row);
    // What the list does know, shown at once so the sheet is never blank.
    setTitle(row.title ?? '');
    setNewCategory(row.category ?? 'OTHER');
    setAmount(row.amount != null ? String(row.amount) : '');
    setExpenseDate(String(row.expense_date ?? '').slice(0, 10));
    setMachineId(null);
    setDriverId(null);
    setNotes('');
    try {
      const full = await expensesApi.get(row.id);
      setEditing(full);
      setNewCategory(full.category ?? 'OTHER');
      setAmount(full.amount != null ? String(full.amount) : '');
      setExpenseDate(String(full.expense_date ?? '').slice(0, 10));
      setMachineId(full.machine_id ?? null);
      setDriverId(full.driver_id ?? null);
      setNotes(full.notes ?? '');
    } catch (error) {
      // Saving now would write nulls over fields we failed to read.
      setFormError(error);
      setEditing(null);
    } finally {
      setLoadingEdit(false);
    }
  };

  const confirmDelete = (row) =>
    confirmDestructive({
      title: 'Delete expense',
      message: `"${row.title}" — ${currency(row.amount)} on ${formatDate(
        row.expense_date,
      )} will be removed. This cannot be undone.`,
      onConfirm: () =>
        remove.mutate(row.id, {
          onSuccess: () => setSheetOpen(false),
          onError: (error) => setFormError(error),
        }),
    });

  const submit = () => {
    const value = Number(amount);
    if (!title.trim()) {
      setFormError(new Error('Give the expense a title.'));
      return;
    }
    if (!expenseDate) {
      setFormError(new Error('Pick the date it was incurred on.'));
      return;
    }
    if (dayjs(expenseDate).isAfter(dayjs(), 'day')) {
      setFormError(new Error('An expense cannot be dated in the future.'));
      return;
    }
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setFormError(new Error('Enter an amount greater than zero.'));
      return;
    }
    setFormError(null);
    const payload = {
      title: title.trim(),
      category: newCategory,
      amount: value,
      expense_date: expenseDate,
      // Both links are optional, and both are sent as null rather than omitted
      // so unlinking a vehicle on an edit actually reaches the column.
      machine_id: machineId ?? null,
      driver_id: driverId ?? null,
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

  const vehicleOptions = (vehicles.data?.items ?? []).map((v) => ({
    value: v.id,
    label: v.registration_no,
    hint: v.type,
  }));
  const driverOptions = (drivers.data?.items ?? []).map((d) => ({
    value: d.id,
    label: d.full_name,
    hint: d.mobile,
  }));

  return (
    <>
      <Screen
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenHeader
          title="Expenses"
          subtitle="What the fleet costs to run"
          large
          back
        />

        <StatRow>
          <StatTile label="This month" value={currency(totals.month)} tone="warning" />
          <StatTile label="All time" value={currency(totals.all)} tone="accent" />
          <StatTile label="Entries" value={rows.length} tone="info" />
        </StatRow>

        {canManageBilling ? (
          <Button label="Record Expense" icon="add-circle-outline" onPress={openSheet} />
        ) : null}

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title"
          onFilterPress={category !== 'all' ? () => setCategory('all') : undefined}
          filterActive={category !== 'all'}
        />

        <PillTabs items={tabs} value={category} onChange={setCategory} />

        {expenses.isLoading ? <SkeletonList count={4} /> : null}
        {expenses.error ? (
          <ErrorState error={expenses.error} onRetry={expenses.refetch} />
        ) : null}

        {!expenses.isLoading && !expenses.error ? (
          visible.length ? (
            <View style={{ gap: t.spacing.md }}>
              {category !== 'all' || query ? (
                <AppText variant="caption" tone="muted">
                  {visible.length} shown · {currency(totals.shown)}
                </AppText>
              ) : null}

              {visible.map((row) => {
                const meta = categoryMeta(row.category);
                return (
                  <Pressable
                    key={row.id}
                    accessibilityRole={canManageBilling ? 'button' : 'text'}
                    accessibilityLabel={
                      canManageBilling ? `Edit ${row.title}` : undefined
                    }
                    disabled={!canManageBilling}
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
                            name={meta.icon}
                            size={18}
                            color={t.accent.primaryDark}
                          />
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="bodyStrong" numberOfLines={1}>
                            {row.title}
                          </AppText>
                          <AppText variant="caption" tone="muted">
                            {meta.label} · {formatDate(row.expense_date)}
                          </AppText>
                          {/* The list route sends no machine or driver — see
                              openEdit. Both load when the row is opened. */}
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <AppText variant="bodyStrong">{currency(row.amount)}</AppText>
                          {canManageBilling ? (
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
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="wallet-outline"
              title={
                query || category !== 'all' ? 'No matching expenses' : 'No expenses yet'
              }
              message={
                query || category !== 'all'
                  ? 'Try a different search or clear the filter.'
                  : 'Record fuel, maintenance and running costs to see them here.'
              }
            />
          )
        ) : null}
      </Screen>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Expense' : 'Record Expense'}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ gap: t.spacing.lg }}>
            <InlineError error={formError} />

            <TextField
              label="Title"
              required
              value={title}
              onChangeText={setTitle}
              placeholder="Diesel — MH12 AB 1234"
            />

            <SelectField
              label="Category"
              required
              options={EXPENSE_CATEGORIES.map(({ value, label }) => ({ value, label }))}
              value={newCategory}
              onChange={(next) => setNewCategory(next ?? 'OTHER')}
            />

            <TextField
              label="Amount"
              required
              value={amount}
              onChangeText={(next) => setAmount(next.replace(/[^0-9.]/g, ''))}
              placeholder="6200"
              keyboardType="decimal-pad"
            />

            <DateField
              label="Incurred on"
              value={expenseDate || null}
              onChange={setExpenseDate}
            />

            <SelectField
              label="Vehicle"
              placeholder="Not tied to a vehicle"
              options={vehicleOptions}
              value={machineId}
              onChange={setMachineId}
              searchable
              allowClear
              leadingIcon="bus-outline"
            />

            <SelectField
              label="Driver"
              placeholder="Not tied to a driver"
              options={driverOptions}
              value={driverId}
              onChange={setDriverId}
              searchable
              allowClear
              leadingIcon="person-outline"
            />

            <TextField
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Bill number, vendor, anything worth keeping"
              multiline
            />

            <Button
              label={editing ? 'Save Changes' : 'Save Expense'}
              icon="checkmark-circle-outline"
              loading={create.isPending || update.isPending || loadingEdit}
              disabled={loadingEdit}
              onPress={submit}
            />

            {editing ? (
              <Button
                label="Delete Expense"
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
