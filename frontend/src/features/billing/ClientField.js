import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { AppText, Notice, SelectField } from '@/components/ui';
import { useClients } from '@/hooks/clients';

/**
 * Client picker and label, backed by GET /clients.
 *
 * This component used to fall back to the client ids carried on trips and
 * challans, because no endpoint returned a client name. /clients now exists
 * (full CRUD), so the directory is real and every screen shows company names
 * instead of "Client 8E0D94D8".
 *
 * `clientLabel` stays a plain function so the screens calling it inline did
 * not have to change. It reads a module-level cache that useClientDirectory
 * keeps in sync; until that resolves it falls back to the id, which is what
 * every screen showed before.
 */

/** id → company name, primed by useClientDirectory. */
const NAMES = new Map();

const idLabel = (id) => `Client ${String(id).slice(0, 8).toUpperCase()}`;

export const clientLabel = (id) => {
  if (!id) return '—';
  return NAMES.get(id) ?? idLabel(id);
};

/**
 * Loads the directory and primes the label cache. Mounted once in the admin
 * layout so every admin screen can call clientLabel() synchronously.
 */
export function useClientDirectory() {
  const query = useClients();
  const items = query.data?.items;
  useEffect(() => {
    for (const client of items ?? []) {
      const name = client.company_name ?? client.name;
      if (client.id && name) NAMES.set(client.id, name);
    }
  }, [items]);
  return query;
}

/** The directory as picker options, sorted by name. */
export function useClientOptions() {
  const { data } = useClientDirectory();
  return useMemo(
    () =>
      (data?.items ?? [])
        .map((client) => ({
          value: client.id,
          label: client.company_name ?? client.name ?? idLabel(client.id),
          hint: client.contact_person ?? client.phone ?? client.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [data],
  );
}

export function ClientField({
  value,
  onChange,
  label = 'Client',
  hint = 'Optional — leave blank to raise the challan against the company only.',
}) {
  const options = useClientOptions();
  if (!options.length) {
    return (
      <View
        style={{
          gap: 8,
        }}
      >
        <AppText variant="label" tone="muted">
          {label}
        </AppText>
        <Notice icon="information-circle-outline">
          No clients have been added yet. Add one from the Clients screen and it will be
          selectable here.
        </Notice>
      </View>
    );
  }
  return (
    <SelectField
      label={label}
      hint={hint}
      placeholder="Select client"
      leadingIcon="business-outline"
      searchable={options.length > 6}
      allowClear
      value={value ?? null}
      onChange={onChange}
      options={options}
    />
  );
}
