import React, { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  Screen,
  ScreenHeader,
  SearchBar,
  SkeletonList,
  StatRow,
  StatTile,
} from '@/components/ui';
import { useUsers } from '@/hooks/accounts';
import { useCurrentUser, usePermissions } from '@/store/auth';
import { displayName, roleLabel } from '@/utils/permissions';
import { statusMeta, registrationStatusMeta } from '@/constants/status';
import { useTheme } from '@/theme';
import { isAdminRole, isDriverRole } from '@/utils/permissions';

/**
 * Read-only. The API exposes GET /users/me and GET /users only — there is no
 * create, update or deactivate route — so accounts are added by approving a
 * registration request, not from here.
 */
export default function UsersScreen() {
  const t = useTheme();
  const me = useCurrentUser();
  const { canManageUsers } = usePermissions();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const users = useUsers();
  const rows = users.data?.items ?? [];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (user) =>
        displayName(user).toLowerCase().includes(needle) ||
        user.mobile_number.includes(needle),
    );
  }, [rows, query]);
  const counts = useMemo(
    () => ({
      total: users.data?.total ?? rows.length,
      admins: rows.filter((u) => isAdminRole(u.role)).length,
      drivers: rows.filter((u) => isDriverRole(u.role)).length,
    }),
    [rows, users.data],
  );
  const onRefresh = async () => {
    setRefreshing(true);
    await users.refetch();
    setRefreshing(false);
  };
  if (!canManageUsers) {
    return (
      <Screen>
        <ScreenHeader title="Users" back />
        <Notice icon="lock-closed-outline" tone="warning">
          Only an administrator can view user accounts.
        </Notice>
      </Screen>
    );
  }
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Users" subtitle="Who can sign in" back />

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or mobile number"
      />

      <StatRow>
        <StatTile label="Total" value={counts.total} tone="accent" />
        <StatTile label="Admins" value={counts.admins} tone="info" />
        <StatTile label="Drivers" value={counts.drivers} tone="success" />
      </StatRow>

      <Notice icon="information-circle-outline">
        Accounts arrive here by approving a registration request. A driver's login also
        has to be linked to their driver record before the driver app will show them any
        trips.
      </Notice>

      {users.isLoading ? <SkeletonList count={4} /> : null}
      {users.error ? <ErrorState error={users.error} onRetry={users.refetch} /> : null}

      {!users.isLoading && !users.error ? (
        visible.length ? (
          <View
            style={{
              gap: t.spacing.md,
            }}
          >
            {visible.map((user) => (
              <Card
                key={user.id}
                padded={false}
                style={{
                  padding: t.spacing.md,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing.md,
                  }}
                >
                  <Avatar name={displayName(user)} size={46} />
                  <View
                    style={{
                      flex: 1,
                      gap: 3,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: t.spacing.sm,
                      }}
                    >
                      <AppText
                        variant="bodyStrong"
                        style={{
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {displayName(user)}
                        {user.id === me?.id ? ' (you)' : ''}
                      </AppText>
                      <Badge
                        label={statusMeta(registrationStatusMeta, user.status).label}
                        tone={statusMeta(registrationStatusMeta, user.status).tone}
                      />
                    </View>
                    <AppText variant="caption" tone="muted">
                      {user.mobile_number}
                    </AppText>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Ionicons name="ribbon-outline" size={13} color={t.color.faint} />
                      <AppText variant="caption" tone="muted">
                        {roleLabel(user.role)}
                      </AppText>
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="people-outline"
            title={query ? 'No matching users' : 'No users yet'}
            message={
              query
                ? 'Try a different search.'
                : 'Approved registration requests appear here as accounts.'
            }
          />
        )
      ) : null}
    </Screen>
  );
}
