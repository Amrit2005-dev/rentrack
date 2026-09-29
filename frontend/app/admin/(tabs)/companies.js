import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  PillTabs,
  Screen,
  ScreenHeader,
  SearchBar,
  SkeletonList,
  StatRow,
  StatTile,
} from '@/components/ui';
import {
  useApproveCompany,
  companyBadge,
  useCompanyDirectory,
} from '@/features/accounts/useCompanyDirectory';
import { usePermissions } from '@/store/auth';
import { formatDate } from '@/utils/format';
import { useTheme } from '@/theme';
import { MenuButton } from '@/features/shell/MenuButton';
/**
 * The Super Admin sixth tab. Company oversight is read-through: this API has no
 * /companies endpoint, so the directory is assembled from the platform-wide
 * users list and the pending registration queue (see useCompanyDirectory).
 *
 * Every other role has this tab removed from the bar by `href: null` in the
 * tabs layout, so the screen only ever renders for a super admin.
 */
export default function CompaniesScreen() {
  const t = useTheme();
  const { canManageOrganizations } = usePermissions();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const directory = useCompanyDirectory();
  const approve = useApproveCompany();
  const [approvingId, setApprovingId] = useState(null);

  /** Bring a pending company onto the platform (PENDING → ACTIVE). */
  const onApprove = async (id) => {
    setApprovingId(id);
    try {
      await approve.mutateAsync(id);
    } finally {
      setApprovingId(null);
    }
  };
  const counts = useMemo(
    () => ({
      all: directory.rows.length,
      onboarding: directory.rows.filter((row) => row.onboarding).length,
      active: directory.rows.filter((row) => row.active).length,
      members: directory.rows.reduce((sum, row) => sum + row.members, 0),
      pending: directory.rows.reduce((sum, row) => sum + row.pending, 0),
    }),
    [directory.rows],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return directory.rows.filter((row) => {
      if (filter === 'onboarding' && !row.onboarding) return false;
      if (filter === 'active' && !row.active) return false;
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        (row.city ?? '').toLowerCase().includes(needle)
      );
    });
  }, [directory.rows, filter, query]);
  const tabs = [
    {
      key: 'all',
      label: 'All',
      count: counts.all,
    },
    {
      key: 'onboarding',
      label: 'Onboarding',
      count: counts.onboarding,
    },
    {
      key: 'active',
      label: 'Active',
      count: counts.active,
    },
  ];
  const onRefresh = async () => {
    setRefreshing(true);
    await directory.refetch();
    setRefreshing(false);
  };
  if (!canManageOrganizations) {
    return (
      <Screen>
        <ScreenHeader title="Companies" large left={<MenuButton />} />
        <Notice icon="lock-closed-outline">
          Company oversight is limited to platform administrators.
        </Notice>
      </Screen>
    );
  }
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader
        title="Companies"
        subtitle="Every organisation on the platform"
        large
        left={<MenuButton />}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add company"
              hitSlop={10}
              onPress={() => router.push('/admin/company/new')}
              style={{ paddingTop: 6 }}
            >
              <Ionicons name="add-circle" size={24} color={t.accent.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Account requests"
              hitSlop={10}
              onPress={() => router.push('/admin/notifications')}
              style={{
                paddingTop: 6,
              }}
            >
              <Ionicons name="person-add-outline" size={22} color={t.color.ink} />
              {counts.pending > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: -2,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    borderRadius: 8,
                    backgroundColor: t.status.dangerFg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText
                    variant="micro"
                    style={{
                      color: '#FFFFFF',
                      fontSize: 10,
                    }}
                  >
                    {counts.pending > 9 ? '9+' : counts.pending}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          </View>
        }
      />

      {directory.isLoading ? <SkeletonList count={4} /> : null}
      {directory.error ? (
        <ErrorState error={directory.error} onRetry={directory.refetch} />
      ) : null}

      {!directory.isLoading && !directory.error ? (
        <>
          <StatRow>
            <StatTile
              label="Companies"
              value={counts.all}
              icon="business-outline"
              tone="accent"
            />
            <StatTile
              label="Members"
              value={counts.members}
              icon="people-outline"
              tone="info"
            />
            <StatTile
              label="Pending"
              value={counts.pending}
              icon="hourglass-outline"
              tone="warning"
              onPress={() => router.push('/admin/notifications')}
            />
          </StatRow>

          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search company or city"
          />
          <PillTabs items={tabs} value={filter} onChange={setFilter} />

          {counts.onboarding > 0 && filter !== 'active' ? (
            <Notice icon="business-outline">
              A company is created by its first registration. Approving that request is
              what brings the company onto the platform.
            </Notice>
          ) : null}

          {visible.length ? (
            <View
              style={{
                gap: t.spacing.md,
              }}
            >
              {visible.map((row) => (
                <CompanyCard
                  key={row.id}
                  row={row}
                  onPress={() => router.push(`/admin/company/${row.id}`)}
                  onApprove={canManageOrganizations ? onApprove : undefined}
                  approving={approvingId === row.id}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="business-outline"
              title={directory.rows.length ? 'No companies match' : 'No companies yet'}
              message={
                directory.rows.length
                  ? 'Clear the search or switch the filter.'
                  : 'Companies appear here as soon as someone registers with one.'
              }
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}
function CompanyCard({ row, onPress, onApprove, approving }) {
  const t = useTheme();
  /*
   * The card body is the pressable target, not the whole card: on web a
   * Pressable renders a <button>, and the Approve action is itself a button —
   * nesting them is invalid HTML and React refuses to render it. Keeping the
   * action as a sibling of the pressable body also stops a tap on Approve from
   * navigating into the company.
   */
  return (
    <Card
      padded={false}
      style={{
        padding: t.spacing.lg,
        gap: t.spacing.md,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={row.name}
        onPress={onPress}
        style={({ pressed }) => ({
          gap: t.spacing.md,
          opacity: pressed ? 0.85 : 1,
        })}
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
              width: 44,
              height: 44,
              borderRadius: t.radius.md,
              backgroundColor: t.accent.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="business" size={20} color={t.accent.primary} />
          </View>
          <View
            style={{
              flex: 1,
              gap: 2,
            }}
          >
            <AppText variant="bodyStrong" numberOfLines={1}>
              {row.name}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {row.city ?? 'City not recorded'}
              {row.created_at ? ` · Since ${formatDate(row.created_at)}` : ''}
            </AppText>
          </View>
          <Badge {...companyBadge(row.status)} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: t.spacing.lg,
            paddingTop: t.spacing.md,
            borderTopWidth: 1,
            borderTopColor: t.color.lineSoft,
          }}
        >
          <Stat label="MEMBERS" value={row.members} />
          <Stat label="ADMINS" value={row.admins} />
          <Stat label="DRIVERS" value={row.drivers} />
          <Stat
            label="PENDING"
            value={row.pending}
            tone={row.pending ? 'warning' : undefined}
          />
        </View>
      </Pressable>

      {/* Only a company still onboarding can be approved. */}
      {row.onboarding && onApprove ? (
        <Button
          label={approving ? 'Approving…' : 'Approve Company'}
          icon="checkmark-circle-outline"
          disabled={approving}
          onPress={() => onApprove(row.id)}
        />
      ) : null}
    </Card>
  );
}
function Stat({ label, value, tone }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <AppText variant="micro" tone="faint">
        {label}
      </AppText>
      <AppText
        variant="bodyStrong"
        style={
          tone === 'warning'
            ? {
                color: t.status.warningFg,
              }
            : undefined
        }
      >
        {value}
      </AppText>
    </View>
  );
}
