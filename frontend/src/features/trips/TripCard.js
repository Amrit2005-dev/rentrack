import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, StatusBadge } from '@/components/ui';
import { statusMeta, tripStatusMeta } from '@/constants/status';
import { currency, formatDayMonth, formatMonthShort, formatTime } from '@/utils/format';
import { useTheme } from '@/theme';
/**
 * One row in every trip list: date block, route, then vehicle and amount.
 *
 * The list route (TripListResponse) carries names rather than ids and has no
 * pickup/destination — only `title` and `site_location`. The detail route has
 * the full route. Both are handled here so a list row is not left reading
 * "Origin not set / Unassigned" for a trip that is fully assigned.
 */
export function TripCard({
  trip,
  onPress,
  showAmount = false,
  vehicleLabel,
  driverLabel,
}) {
  const t = useTheme();
  // started_at is the real departure; created_at is the fallback for a new trip.
  const when = trip.started_at ?? trip.created_at;
  const body = (
    <Card
      padded={false}
      style={{
        padding: t.spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          gap: t.spacing.md,
        }}
      >
        <View
          style={{
            width: 54,
            paddingVertical: t.spacing.sm,
            borderRadius: t.radius.md,
            backgroundColor: t.accent.primaryFaint,
            alignItems: 'center',
          }}
        >
          <AppText variant="title" tone="accent">
            {formatDayMonth(when)}
          </AppText>
          <AppText variant="micro" tone="muted">
            {formatMonthShort(when)}
          </AppText>
          <AppText
            variant="micro"
            tone="faint"
            style={{
              marginTop: 2,
            }}
          >
            {formatTime(when)}
          </AppText>
        </View>

        <View
          style={{
            flex: 1,
            gap: 6,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: t.spacing.sm,
            }}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <AppText variant="bodyStrong" numberOfLines={1}>
                {trip.origin ?? trip.title ?? 'Origin not set'}
              </AppText>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Ionicons name="arrow-forward" size={13} color={t.accent.primary} />
                <AppText
                  variant="body"
                  tone="muted"
                  numberOfLines={1}
                  style={{
                    flex: 1,
                  }}
                >
                  {trip.destination ?? trip.site_location ?? 'Destination not set'}
                </AppText>
              </View>
            </View>
            <StatusBadge meta={statusMeta(tripStatusMeta, trip.status)} />
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: t.spacing.md,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Ionicons name="bus-outline" size={13} color={t.color.faint} />
              <AppText variant="caption" tone="muted">
                {vehicleLabel ??
                  trip.vehicle_registration ??
                  (trip.vehicle_id ? 'Assigned' : 'Unassigned')}
              </AppText>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Ionicons name="person-outline" size={13} color={t.color.faint} />
              <AppText variant="caption" tone="muted">
                {driverLabel ??
                  trip.driver_name ??
                  (trip.driver_id ? 'Assigned' : 'Unassigned')}
              </AppText>
            </View>
            {showAmount && (trip.final_amount ?? 0) > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Ionicons name="cash-outline" size={13} color={t.color.faint} />
                <AppText variant="caption" tone="muted">
                  {currency(trip.final_amount)}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        {onPress ? (
          <View
            style={{
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-forward" size={18} color={t.color.faint} />
          </View>
        ) : null}
      </View>
    </Card>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Trip to ${trip.destination ?? trip.site_location ?? trip.title ?? 'destination'}, ${statusMeta(tripStatusMeta, trip.status).label}`}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {body}
    </Pressable>
  );
}
