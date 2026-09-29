import React, { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  PillTabs,
  Screen,
  ScreenHeader,
  SkeletonList,
  StatusBadge,
} from '@/components/ui';
import { useRegistrationRequests } from '@/hooks/accounts';
import { ApprovalSheet } from '@/features/accounts/ApprovalSheet';
import {
  applicantMobile,
  applicantName,
  companyCity,
  companyName,
} from '@/features/accounts/registration';
import { useTrips } from '@/hooks/trips';
import { registrationStatusMeta, statusMeta, TRIP_BUCKETS } from '@/constants/status';
import { usePermissions } from '@/store/auth';
import { formatDate, formatTime, fromNow } from '@/utils/format';
import { useTheme } from '@/theme';
/**
 * Approvals are where company onboarding happens: registering with a company
 * name the system has not seen creates that company, so approving a request is
 * how a new company joins the platform (SRS §2.3).
 */
export default function NotificationsScreen() {
  const t = useTheme();
  const { canReviewRegistrations, canManageOrganizations } = usePermissions();
  const [tab, setTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const requests = useRegistrationRequests();
  const trips = useTrips();
  const [review, setReview] = useState(null);
  const pending = useMemo(
    () => (requests.data?.items ?? []).filter((r) => r.status === 'pending'),
    [requests.data],
  );
  const upcoming = useMemo(
    () =>
      (trips.data?.items ?? [])
        .filter((trip) => TRIP_BUCKETS.upcoming.includes(trip.status))
        .slice(0, 10),
    [trips.data],
  );
  const tabs = [
    {
      key: 'all',
      label: 'All',
      count: pending.length + upcoming.length,
    },
    {
      key: 'accounts',
      label: 'Accounts',
      count: pending.length,
    },
    {
      key: 'trips',
      label: 'Trips',
      count: upcoming.length,
    },
  ];
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([requests.refetch(), trips.refetch()]);
    setRefreshing(false);
  };
  const showAccounts = tab === 'all' || tab === 'accounts';
  const showTrips = tab === 'all' || tab === 'trips';
  const isEmpty =
    (!showAccounts || (!pending.length && !requests.error)) &&
    (!showTrips || !upcoming.length);
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader
        title="Notifications"
        subtitle={canManageOrganizations ? 'Platform-wide' : undefined}
        back
      />

      <PillTabs items={tabs} value={tab} onChange={setTab} />

      {requests.isLoading || trips.isLoading ? <SkeletonList count={3} /> : null}

      {showAccounts && requests.error ? (
        <ErrorState error={requests.error} onRetry={requests.refetch} />
      ) : null}

      {!canReviewRegistrations && showAccounts ? (
        <Notice icon="lock-closed-outline" tone="warning">
          Only an administrator can review account requests.
        </Notice>
      ) : null}

      {showAccounts && pending.length ? (
        <View
          style={{
            gap: t.spacing.md,
          }}
        >
          <AppText variant="heading">Account Approvals</AppText>
          {canManageOrganizations ? (
            <Notice icon="business-outline">
              Approving a request for a company that does not exist yet also creates that
              company.
            </Notice>
          ) : null}

          {pending.map((request) => (
            <Card key={request.id}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: t.spacing.md,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: t.status.successBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color={t.status.successFg}
                  />
                </View>
                <View
                  style={{
                    flex: 1,
                    gap: 4,
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
                    >
                      {applicantName(request)}
                    </AppText>
                    <AppText variant="micro" tone="faint">
                      {fromNow(request.created_at)}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="muted">
                    Company: {companyName(request)}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    Mobile: {applicantMobile(request)}
                    {companyCity(request) ? `  ·  ${companyCity(request)}` : ''}
                  </AppText>
                  <StatusBadge
                    meta={statusMeta(registrationStatusMeta, request.status)}
                    style={{
                      marginTop: 4,
                    }}
                  />
                </View>
              </View>

              {canReviewRegistrations ? (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: t.spacing.sm,
                    marginTop: t.spacing.md,
                  }}
                >
                  <Button
                    label="Reject"
                    variant="danger"
                    size="sm"
                    style={{
                      flex: 1,
                    }}
                    onPress={() => setReview({ request, action: 'reject' })}
                  />
                  <Button
                    label="Approve"
                    variant="success"
                    size="sm"
                    style={{
                      flex: 1,
                    }}
                    onPress={() => setReview({ request, action: 'approve' })}
                  />
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}

      {showTrips && upcoming.length ? (
        <View
          style={{
            gap: t.spacing.md,
          }}
        >
          <AppText variant="heading">Upcoming Trips</AppText>
          {upcoming.map((trip) => (
            <Card key={trip.id}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: t.spacing.md,
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: t.accent.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="bus-outline" size={20} color={t.accent.primary} />
                </View>
                <View
                  style={{
                    flex: 1,
                    gap: 2,
                  }}
                >
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {trip.origin ?? 'Origin'} → {trip.destination ?? 'Destination'}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {formatDate(trip.started_at ?? trip.created_at)},{' '}
                    {formatTime(trip.started_at ?? trip.created_at)}
                  </AppText>
                </View>
                <Button
                  label="View"
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  onPress={() => router.push(`/admin/trip/${trip.id}`)}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {!requests.isLoading && !trips.isLoading && isEmpty ? (
        <EmptyState
          icon="notifications-outline"
          title="You're all caught up"
          message="New account requests and upcoming trips will show up here."
        />
      ) : null}

      <ApprovalSheet
        request={review?.request ?? null}
        action={review?.action ?? 'approve'}
        onClose={() => setReview(null)}
      />
    </Screen>
  );
}
