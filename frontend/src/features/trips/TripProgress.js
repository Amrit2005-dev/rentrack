import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';
import { formatDateTime } from '@/utils/format';
/**
 * The SRS tracker, now backed by real columns: the API stamps started_at,
 * reached_at and completed_at as the trip moves, so each stage shows when it
 * actually happened rather than being inferred.
 */
const ORDER = ['upcoming', 'in_progress', 'driver_reached', 'completed'];
export function TripProgress({ trip }) {
  const t = useTheme();
  const stages = [
    {
      key: 'in_progress',
      label: 'Driver Started',
      hint: 'Vehicle has left the origin',
      at: trip.started_at,
    },
    {
      key: 'driver_reached',
      label: 'Driver Reached',
      hint: 'Arrived at the destination',
      at: trip.reached_at,
    },
    {
      key: 'completed',
      label: 'Receiver Received',
      hint: 'Delivery confirmed and closed',
      at: trip.completed_at,
    },
  ];
  const currentIndex = ORDER.indexOf(trip.status);
  return (
    <View>
      {stages.map((stage, index) => {
        const stageIndex = ORDER.indexOf(stage.key);
        const done = !!stage.at || (currentIndex >= stageIndex && currentIndex !== -1);
        const active = !done && currentIndex === stageIndex - 1;
        const color = done
          ? t.status.successFg
          : active
            ? t.accent.primary
            : t.color.faint;
        return (
          <View
            key={stage.key}
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                width: 26,
              }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: done ? t.status.successFg : t.color.surface,
                  borderWidth: done ? 0 : 2,
                  borderColor: color,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? (
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                ) : (
                  <AppText
                    variant="micro"
                    style={{
                      color,
                    }}
                  >
                    {index + 1}
                  </AppText>
                )}
              </View>
              {index < stages.length - 1 ? (
                <View
                  style={{
                    flex: 1,
                    width: 2,
                    minHeight: 26,
                    backgroundColor: done ? t.status.successFg : t.color.line,
                  }}
                />
              ) : null}
            </View>

            <View
              style={{
                flex: 1,
                paddingBottom: index < stages.length - 1 ? t.spacing.lg : 0,
              }}
            >
              <AppText variant="bodyStrong" tone={done || active ? 'ink' : 'faint'}>
                {stage.label}
              </AppText>
              <AppText variant="caption" tone="muted">
                {stage.at ? formatDateTime(stage.at) : stage.hint}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
