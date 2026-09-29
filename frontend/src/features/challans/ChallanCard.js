import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card, StatusBadge } from '@/components/ui';
import { clientLabel } from '@/features/billing/ClientField';
import { challanStatusMeta, statusMeta } from '@/constants/status';
import { currency, formatDate } from '@/utils/format';
import { useTheme } from '@/theme';
/** One row in the challan history and in the calendar's day list. */
export function ChallanCard({ challan, onPress }) {
  const t = useTheme();
  const hours = Number(challan.total_hours ?? 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Challan for ${formatDate(challan.challan_date)}`}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Card
        padded={false}
        style={{
          padding: t.spacing.lg,
          gap: t.spacing.md,
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
              width: 44,
              height: 44,
              borderRadius: t.radius.md,
              backgroundColor: t.accent.primaryFaint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="receipt-outline" size={20} color={t.accent.primary} />
          </View>

          <View
            style={{
              flex: 1,
              gap: 2,
            }}
          >
            <AppText variant="bodyStrong" numberOfLines={1}>
              {formatDate(challan.challan_date)}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {challan.client_id ? clientLabel(challan.client_id) : 'No client'}
              {' · '}
              {challan.items.length} {challan.items.length === 1 ? 'vehicle' : 'vehicles'}
            </AppText>
          </View>

          <StatusBadge meta={statusMeta(challanStatusMeta, challan.status)} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.lg,
            paddingTop: t.spacing.md,
            borderTopWidth: 1,
            borderTopColor: t.color.lineSoft,
          }}
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <AppText variant="micro" tone="faint">
              RUNNING HOURS
            </AppText>
            <AppText variant="bodyStrong">{hours ? `${hours} h` : '—'}</AppText>
          </View>
          <View
            style={{
              flex: 1,
            }}
          >
            <AppText variant="micro" tone="faint">
              AMOUNT
            </AppText>
            <AppText variant="bodyStrong" tone="accent">
              {currency(challan.total_amount)}
            </AppText>
          </View>
          {challan.sms_sent_at ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={14}
                color={t.status.successFg}
              />
              <AppText variant="caption" tone="success">
                SMS sent
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
