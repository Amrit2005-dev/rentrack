import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';
import { formatDate, formatTime } from '@/utils/format';
import { hasPlace, openMap, placeUrl, routeUrl } from '@/utils/maps';

/**
 * Origin → destination with the connecting rail, and a link that opens the
 * route on a map.
 *
 * The map is a link rather than an embedded view because the API has no
 * coordinates to plot — see utils/maps.js. Each stop is also tappable on its
 * own, which is what a driver wants when they only need the next one.
 */
export function TripRoute({ origin, destination, startedAt, reachedAt }) {
  const t = useTheme();
  const [mapError, setMapError] = useState(false);
  const canRoute = hasPlace(origin) || hasPlace(destination);

  const open = async (url) => {
    const opened = await openMap(url);
    setMapError(!opened);
  };

  const stops = [
    {
      key: 'start',
      color: t.status.successFg,
      label: 'Origin',
      place: origin,
      at: startedAt,
    },
    {
      key: 'end',
      color: t.status.dangerFg,
      label: 'Destination',
      place: destination,
      at: reachedAt,
    },
  ];
  return (
    <View>
      {stops.map((stop, index) => (
        <View
          key={stop.key}
          style={{
            flexDirection: 'row',
            gap: t.spacing.md,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              width: 14,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: 3,
                borderColor: stop.color,
                backgroundColor: t.color.surface,
                marginTop: 5,
              }}
            />
            {index === 0 ? (
              <View
                style={{
                  flex: 1,
                  width: 2,
                  backgroundColor: t.color.line,
                }}
              />
            ) : null}
          </View>

          <View
            style={{
              flex: 1,
              paddingBottom: index === 0 ? t.spacing.lg : 0,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <AppText variant="caption" tone="muted">
                  {stop.label}
                </AppText>
                {hasPlace(stop.place) ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${stop.place} on a map`}
                    onPress={() => open(placeUrl(stop.place))}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <AppText
                      variant="bodyStrong"
                      style={{
                        flexShrink: 1,
                      }}
                    >
                      {stop.place}
                    </AppText>
                    <Ionicons name="location-outline" size={14} color={t.color.faint} />
                  </Pressable>
                ) : (
                  <AppText variant="bodyStrong" tone="muted">
                    Not specified
                  </AppText>
                )}
              </View>
              {stop.at ? (
                <View
                  style={{
                    alignItems: 'flex-end',
                  }}
                >
                  <AppText variant="caption" tone="muted">
                    {formatDate(stop.at)}
                  </AppText>
                  <AppText variant="caption" tone="body">
                    {formatTime(stop.at)}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ))}

      {canRoute ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="View the route on a map"
          onPress={() => open(routeUrl(origin, destination))}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.spacing.sm,
            minHeight: t.sizing.tapTarget,
            marginTop: t.spacing.lg,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.color.line,
            backgroundColor: pressed ? t.color.lineSoft : t.color.surface,
          })}
        >
          <Ionicons name="map-outline" size={18} color={t.accent.primaryDark} />
          <AppText
            variant="bodyStrong"
            style={{
              color: t.accent.primaryDark,
            }}
          >
            View route on map
          </AppText>
        </Pressable>
      ) : null}

      {mapError ? (
        <AppText
          variant="caption"
          tone="danger"
          style={{
            marginTop: t.spacing.sm,
            textAlign: 'center',
          }}
        >
          Could not open a map on this device.
        </AppText>
      ) : null}
    </View>
  );
}
