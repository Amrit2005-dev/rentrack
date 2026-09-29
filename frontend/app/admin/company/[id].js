import React, { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  ErrorState,
  InfoRow,
  Notice,
  Screen,
  ScreenHeader,
  SectionCard,
  SkeletonList,
  StatRow,
  StatTile,
  StatusBadge,
} from '@/components/ui';
import { ApprovalSheet } from '@/features/accounts/ApprovalSheet';
import {
  useEnterCompanyScope,
  useExitCompanyScope,
  useScopedCompanyId,
} from '@/store/companyScope';
import { applicantName } from '@/features/accounts/registration';
import { companyBadge, useCompanyDirectory } from '@/features/accounts/useCompanyDirectory';
import { useRegistrationRequests, useUsers } from '@/hooks/accounts';
import { useDrivers, useVehicles } from '@/hooks/fleet';
import { useTrips } from '@/hooks/trips';
import { registrationStatusMeta, statusMeta } from '@/constants/status';
import { usePermissions } from '@/store/auth';
import { formatDate, fromNow, humanise } from '@/utils/format';
import { displayName, roleLabel } from '@/utils/permissions';
import { useTheme } from '@/theme';
import { isAdminRole } from '@/utils/permissions';
/**
 * Super Admin drill-down into one company. Every list this reads is unscoped
 * server-side for a super admin, so the company's fleet, crew and trips are
 * filtered here by company_id rather than by a query parameter the API does
 * not offer.
 */
export default function CompanyDetailScreen() {
  const t = useTheme();
  const params = useLocalSearchParams();
  const id = params.id;
  const { canManageOrganizations } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);
  const [review, setReview] = useState(null);
  const enterScope = useEnterCompanyScope();
  const exitScope = useExitCompanyScope();
  const scopedCompanyId = useScopedCompanyId();
  const directory = useCompanyDirectory();
  const users = useUsers({
    page_size: 200,
  });
  const requests = useRegistrationRequests({
    page_size: 200,
  });
  const vehicles = useVehicles({
    page_size: 200,
  });
  const drivers = useDrivers({
    page_size: 200,
  });
  const trips = useTrips({
    page_size: 200,
  });
  const company = directory.rows.find((row) => row.id === id) ?? null;
  const members = useMemo(
    () => (users.data?.items ?? []).filter((user) => user.company_id === id),
    [users.data, id],
  );
  const pending = useMemo(
    () => (requests.data?.items ?? []).filter((request) => request.company_id === id),
    [requests.data, id],
  );
  const fleet = useMemo(
    () => (vehicles.data?.items ?? []).filter((vehicle) => vehicle.company_id === id),
    [vehicles.data, id],
  );
  const crew = useMemo(
    () => (drivers.data?.items ?? []).filter((driver) => driver.company_id === id),
    [drivers.data, id],
  );
  const runs = useMemo(
    () => (trips.data?.items ?? []).filter((trip) => trip.company_id === id),
    [trips.data, id],
  );
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      directory.refetch(),
      vehicles.refetch(),
      drivers.refetch(),
      trips.refetch(),
    ]);
    setRefreshing(false);
  };
  const loading = directory.isLoading || users.isLoading;
  if (!canManageOrganizations) {
    return (
      <Screen>
        <ScreenHeader title="Company" back />
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
        title={company?.name ?? 'Company'}
        subtitle={company?.city ?? undefined}
        back
        right={
          company ? (
            <Badge {...companyBadge(company.status)} />
          ) : undefined
        }
      />

      {loading ? <SkeletonList count={3} /> : null}
      {directory.error ? (
        <ErrorState error={directory.error} onRetry={directory.refetch} />
      ) : null}

      {!loading && !directory.error && !company ? (
        <Notice icon="alert-circle-outline">
          No company with this id. It may have been removed, or the link that brought you
          here was built before the company existed.
        </Notice>
      ) : null}

      {company ? (
        <>
          <StatRow>
            <StatTile
              label="Members"
              value={company.members}
              icon="people-outline"
              tone="accent"
            />
            <StatTile
              label="Vehicles"
              value={fleet.length}
              icon="bus-outline"
              tone="info"
            />
            <StatTile
              label="Trips"
              value={runs.length}
              icon="map-outline"
              tone="success"
            />
          </StatRow>

          <SectionCard title="Company Information" icon="business-outline">
            <InfoRow label="Name" value={company.name} icon="pricetag-outline" />
            <InfoRow label="City" value={company.city ?? '—'} icon="location-outline" />
            <InfoRow
              label="Registered"
              value={company.created_at ? formatDate(company.created_at) : '—'}
              icon="calendar-outline"
            />
            <InfoRow
              label="Admins"
              value={String(company.admins)}
              icon="shield-outline"
            />
            <InfoRow
              label="Drivers"
              value={String(company.drivers)}
              icon="car-outline"
              last
            />
          </SectionCard>

          {pending.length ? (
            <SectionCard title="Waiting for Approval" icon="hourglass-outline">
              {pending.map((request, index) => (
                <View
                  key={request.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing.md,
                    paddingVertical: t.spacing.md,
                    borderBottomWidth: index === pending.length - 1 ? 0 : 1,
                    borderBottomColor: t.color.lineSoft,
                  }}
                >
                  <Avatar name={applicantName(request)} size={38} />
                  <View
                    style={{
                      flex: 1,
                      gap: 2,
                    }}
                  >
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {applicantName(request)}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      Applied {fromNow(request.created_at)}
                    </AppText>
                  </View>
                  <StatusBadge
                    meta={statusMeta(registrationStatusMeta, request.status)}
                  />
                </View>
              ))}

              {/*
                Approving here is what onboards the company — the row exists
                from the registration, but nobody can sign in until a request
                is approved.
              */}
              {pending.map((request) => (
                <View
                  key={`actions-${request.id}`}
                  style={{
                    flexDirection: 'row',
                    gap: t.spacing.sm,
                    marginTop: t.spacing.md,
                  }}
                >
                  <Button
                    label={`Reject ${applicantName(request)}`}
                    variant="danger"
                    size="sm"
                    style={{ flex: 1 }}
                    onPress={() =>
                      setReview({
                        request,
                        action: 'reject',
                      })
                    }
                  />
                  <Button
                    label={`Approve ${applicantName(request)}`}
                    variant="success"
                    size="sm"
                    style={{ flex: 1 }}
                    onPress={() =>
                      setReview({
                        request,
                        action: 'approve',
                      })
                    }
                  />
                </View>
              ))}
            </SectionCard>
          ) : null}

          <SectionCard title={`Members (${members.length})`} icon="people-outline">
            {members.length ? (
              members.map((member, index) => (
                <View
                  key={member.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing.md,
                    paddingVertical: t.spacing.md,
                    borderBottomWidth: index === members.length - 1 ? 0 : 1,
                    borderBottomColor: t.color.lineSoft,
                  }}
                >
                  <Avatar name={displayName(member)} size={38} />
                  <View
                    style={{
                      flex: 1,
                      gap: 2,
                    }}
                  >
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {displayName(member)}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {member.mobile_number} · {humanise(member.status)}
                    </AppText>
                  </View>
                  <Badge
                    label={roleLabel(member.role)}
                    tone={isAdminRole(member.role) ? 'accent' : 'neutral'}
                  />
                </View>
              ))
            ) : (
              <AppText
                variant="body"
                tone="muted"
                style={{
                  paddingVertical: t.spacing.md,
                }}
              >
                Nobody has been approved into this company yet.
              </AppText>
            )}
          </SectionCard>

          <SectionCard title={`Fleet (${fleet.length})`} icon="bus-outline">
            {fleet.length ? (
              fleet.slice(0, 8).map((vehicle, index) => (
                <View
                  key={vehicle.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing.md,
                    paddingVertical: t.spacing.md,
                    borderBottomWidth: index === Math.min(fleet.length, 8) - 1 ? 0 : 1,
                    borderBottomColor: t.color.lineSoft,
                  }}
                >
                  <Ionicons name="bus-outline" size={18} color={t.color.muted} />
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <AppText variant="bodyStrong">{vehicle.registration_no}</AppText>
                    <AppText variant="caption" tone="muted">
                      {humanise(vehicle.type)}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="muted">
                    {humanise(vehicle.status)}
                  </AppText>
                </View>
              ))
            ) : (
              <AppText
                variant="body"
                tone="muted"
                style={{
                  paddingVertical: t.spacing.md,
                }}
              >
                No vehicles registered to this company.
              </AppText>
            )}
            {fleet.length > 8 ? (
              <AppText
                variant="caption"
                tone="faint"
                style={{
                  paddingTop: t.spacing.sm,
                }}
              >
                Showing 8 of {fleet.length}.
              </AppText>
            ) : null}
          </SectionCard>

          <SectionCard title={`Drivers (${crew.length})`} icon="person-outline">
            {crew.length ? (
              crew.slice(0, 8).map((driver, index) => (
                <View
                  key={driver.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing.md,
                    paddingVertical: t.spacing.md,
                    borderBottomWidth: index === Math.min(crew.length, 8) - 1 ? 0 : 1,
                    borderBottomColor: t.color.lineSoft,
                  }}
                >
                  <Avatar name={driver.full_name} size={34} />
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <AppText variant="bodyStrong">{driver.full_name}</AppText>
                    <AppText variant="caption" tone="muted">
                      {driver.mobile}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="muted">
                    {humanise(driver.availability)}
                  </AppText>
                </View>
              ))
            ) : (
              <AppText
                variant="body"
                tone="muted"
                style={{
                  paddingVertical: t.spacing.md,
                }}
              >
                No drivers registered to this company.
              </AppText>
            )}
            {crew.length > 8 ? (
              <AppText
                variant="caption"
                tone="faint"
                style={{
                  paddingTop: t.spacing.sm,
                }}
              >
                Showing 8 of {crew.length}.
              </AppText>
            ) : null}
          </SectionCard>

          {/*
            Scoping filters every list in the admin shell down to this company.
            Reads only — creates take their company from the signed-in account,
            which a platform admin does not have.
          */}
          {scopedCompanyId === company.id ? (
            <Button
              label="Exit Company View"
              icon="close-circle-outline"
              variant="outline"
              onPress={exitScope}
            />
          ) : company.active ? (
            <Button
              label={`Manage ${company.name}`}
              icon="log-in-outline"
              onPress={() => {
                enterScope(company.id, company.name);
                router.push('/admin');
              }}
            />
          ) : (
            // Nothing to manage until the company is live.
            <Notice icon="time-outline">
              {company.onboarding
                ? 'Approve this company from the Companies tab to start managing it.'
                : `This company is ${companyBadge(company.status).label.toLowerCase()}.`}
            </Notice>
          )}

          <Notice icon="information-circle-outline">
            Company records are read-only here. They are created by registration and this
            API version exposes no endpoint to edit or remove one.
          </Notice>
          <ApprovalSheet
            request={review?.request ?? null}
            action={review?.action ?? 'approve'}
            onClose={() => setReview(null)}
          />
        </>
      ) : null}
    </Screen>
  );
}
