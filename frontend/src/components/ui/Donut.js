import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
/**
 * Fleet and Driver overview charts. Drawn with stroke-dasharray on concentric
 * circles rather than paths — fewer moving parts, and it degrades to a clean
 * ring when every slice is zero.
 */
export function Donut({ slices, total, caption = 'Total', size = 132, thickness = 18 }) {
  const t = useTheme();
  const sum = slices.reduce((acc, slice) => acc + Math.max(0, slice.value), 0);
  const displayTotal = total ?? sum;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = useMemo(() => {
    if (sum <= 0) return [];
    let offset = 0;
    return slices
      .filter((slice) => slice.value > 0)
      .map((slice) => {
        const fraction = slice.value / sum;
        const length = fraction * circumference;
        const segment = {
          key: slice.label,
          color: slice.color,
          dash: `${length} ${circumference - length}`,
          offset: -offset,
        };
        offset += length;
        return segment;
      });
  }, [slices, sum, circumference]);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.xl,
      }}
    >
      <View
        style={{
          width: size,
          height: size,
        }}
      >
        <Svg width={size} height={size}>
          {/* Rotate so the first slice starts at 12 o'clock. Written as an SVG
              transform string: the rotation/origin props make react-native-svg
              emit a `transform-origin` DOM attribute that React rejects on web. */}
          <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={t.color.lineSoft}
              strokeWidth={thickness}
              fill="none"
            />
            {segments.map((segment) => (
              <Circle
                key={segment.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={segment.dash}
                strokeDashoffset={segment.offset}
                strokeLinecap="butt"
                fill="none"
              />
            ))}
          </G>
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="title">{displayTotal}</AppText>
          <AppText variant="caption" tone="muted">
            {caption}
          </AppText>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          gap: t.spacing.sm,
        }}
      >
        {slices.map((slice) => (
          <View
            key={slice.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.sm,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: slice.color,
              }}
            />
            <AppText
              variant="body"
              tone="body"
              style={{
                flex: 1,
              }}
              numberOfLines={1}
            >
              {slice.label}
            </AppText>
            <AppText variant="bodyStrong">{slice.value}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
