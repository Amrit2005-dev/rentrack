import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  InfoRow,
  InlineError,
  Screen,
  ScreenHeader,
  SectionCard,
  Sheet,
  SkeletonList,
  SplitStat,
  StatusBadge,
  TextField,
} from '@/components/ui';
import { TripProgress } from '@/features/trips/TripProgress';
import { TripRoute } from '@/features/trips/TripRoute';
import {
  useAcceptTrip,
  useCreateReceipt,
  useRejectTrip,
  useSetTripStatus,
  useTrip,
} from '@/hooks/trips';
import { statusMeta, tripStatusMeta } from '@/constants/status';
import { currency, distance, tons } from '@/utils/format';
import { useTheme } from '@/theme';

/**
 * Unlike the previous backend, PUT /trips/{id}/status carries no role guard, so
 * the driver genuinely owns the lifecycle here: start, mark reached, then close
 * with a receipt — SRS §3.2 as originally written.
 */
export default function DriverTripDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams();
  const trip = useTrip(id);
  const setStatus = useSetTripStatus(id);
  const createReceipt = useCreateReceipt(id);
  const accept = useAcceptTrip(id);
  const reject = useRejectTrip(id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [receiverOtp, setReceiverOtp] = useState('');
  const [receiptError, setReceiptError] = useState();
  if (trip.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Trip Details" back />
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (trip.error || !trip.data) {
    return (
      <Screen>
        <ScreenHeader title="Trip Details" back />
        <ErrorState error={trip.error} onRetry={trip.refetch} />
      </Screen>
    );
  }
  const data = trip.data;
  // ASSIGNED means the office has given this trip to the driver but they have
  // not answered yet; the API only accepts accept/reject in that state, and
  // only lets the trip start once it has been accepted.
  const awaitingDecision = data.api_status === 'ASSIGNED';
  const canStart = data.status === 'upcoming' && !awaitingDecision;
  const canReach = data.status === 'in_progress';
  const canComplete = data.status === 'driver_reached';
  const submitReceipt = () => {
    if (!receiverName.trim()) {
      setReceiptError("Enter the receiver's name");
      return;
    }
    setReceiptError(undefined);
    createReceipt.mutate(
      {
        receiver_name: receiverName.trim(),
        receiver_otp: receiverOtp.trim() || null,
      },
      {
        onSuccess: () => {
          setReceiptOpen(false);
          // Delivery confirmed — close the trip out.
          setStatus.mutate('completed');
        },
      },
    );
  };
  return (
    <Screen>
      <ScreenHeader
        title="Trip Details"
        back
        right={<StatusBadge meta={statusMeta(tripStatusMeta, data.status)} />}
      />

      <SectionCard title="Route Details" icon="location-outline">
        <TripRoute
          origin={data.origin}
          destination={data.destination}
          startedAt={data.started_at}
          reachedAt={data.reached_at}
        />
      </SectionCard>

      <SplitStat
        items={[
          {
            label: 'Distance',
            icon: 'speedometer-outline',
            value: distance(data.distance_km),
          },
          {
            label: 'Weight',
            icon: 'cube-outline',
            value: tons(data.weight_tons),
          },
        ]}
      />

      {data.load_details ? (
        <SectionCard title="Load Details" icon="cube-outline">
          {Object.entries(data.load_details).map(([key, value], index, all) => (
            <InfoRow
              key={key}
              label={key.replace(/_/g, ' ')}
              value={String(value)}
              last={index === all.length - 1}
            />
          ))}
        </SectionCard>
      ) : null}

      <SectionCard title="Trip Progress" icon="git-commit-outline">
        <TripProgress trip={data} />
      </SectionCard>

      {data.notes ? (
        <SectionCard title="Additional Notes" icon="document-text-outline">
          <AppText variant="body" tone="body">
            {data.notes}
          </AppText>
        </SectionCard>
      ) : null}

      {data.status === 'completed' && (data.final_amount ?? 0) > 0 ? (
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
                Trip Earnings
              </AppText>
              <AppText variant="display" tone="accent">
                {currency(data.final_amount)}
              </AppText>
            </View>
            <Ionicons name="cash-outline" size={26} color={t.accent.primary} />
          </View>
        </Card>
      ) : null}

      <InlineError
        error={setStatus.error ?? createReceipt.error ?? accept.error ?? reject.error}
      />

      <View
        style={{
          gap: t.spacing.sm,
        }}
      >
        {awaitingDecision ? (
          <>
            <Button
              label="Accept Trip"
              icon="checkmark-circle-outline"
              loading={accept.isPending}
              onPress={() => accept.mutate()}
            />
            <Button
              label="Reject Trip"
              icon="close-circle-outline"
              variant="outline"
              onPress={() => setRejectOpen(true)}
            />
          </>
        ) : null}

        {canStart ? (
          <Button
            label="Start Trip"
            icon="play"
            loading={setStatus.isPending}
            onPress={() => setStatus.mutate('in_progress')}
          />
        ) : null}

        {canReach ? (
          <Button
            label="Mark Reached"
            icon="flag"
            loading={setStatus.isPending}
            onPress={() => setStatus.mutate('driver_reached')}
          />
        ) : null}

        {canComplete ? (
          <Button
            label="Receive & Close Trip"
            icon="checkmark-done"
            variant="success"
            onPress={() => setReceiptOpen(true)}
          />
        ) : null}
      </View>

      <Sheet
        visible={receiptOpen}
        title="Confirm delivery"
        onClose={() => setReceiptOpen(false)}
      >
        <View
          style={{
            paddingHorizontal: t.spacing.xl,
            gap: t.spacing.lg,
          }}
        >
          <TextField
            label="Receiver Name"
            required
            value={receiverName}
            onChangeText={(next) => {
              setReceiverName(next);
              if (receiptError) setReceiptError(undefined);
            }}
            placeholder="Who took delivery?"
            error={receiptError}
          />
          <TextField
            label="Receiver OTP"
            value={receiverOtp}
            onChangeText={(next) => setReceiverOtp(next.replace(/\D/g, '').slice(0, 6))}
            placeholder="Optional confirmation code"
            keyboardType="number-pad"
            hint="The code the receiver was sent, if you collected one."
          />
          <Button
            label="Confirm & Close Trip"
            variant="success"
            loading={createReceipt.isPending || setStatus.isPending}
            onPress={submitReceipt}
          />
        </View>
      </Sheet>

      {/* POST /trips/{id}/reject requires a reason, so it is collected rather
          than sent blank. */}
      <Sheet
        visible={rejectOpen}
        title="Reject this trip"
        onClose={() => setRejectOpen(false)}
      >
        <View
          style={{
            paddingHorizontal: t.spacing.xl,
            paddingBottom: t.spacing.xl,
            gap: t.spacing.lg,
          }}
        >
          <TextField
            label="Reason"
            required
            value={rejectReason}
            onChangeText={(next) => {
              setRejectReason(next);
              if (rejectError) setRejectError(undefined);
            }}
            placeholder="Why can you not take this trip?"
            multiline
            error={rejectError}
          />
          <Button
            label="Confirm Rejection"
            variant="outline"
            loading={reject.isPending}
            onPress={() => {
              if (!rejectReason.trim()) {
                setRejectError('Enter a reason');
                return;
              }
              reject.mutate(rejectReason.trim(), {
                onSuccess: () => {
                  setRejectOpen(false);
                  setRejectReason('');
                },
              });
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
