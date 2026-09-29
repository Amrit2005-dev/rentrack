import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

/**
 * Placeholder block with a gentle pulse. Used instead of a spinner on list and
 * detail screens so the layout does not jump once data lands.
 */
export function Skeleton({ width = '100%', height = 14, radius, style }) {
  const t = useTheme();
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 850,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [pulse]);
  const animated = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? t.radius.sm,
          backgroundColor: t.color.lineSoft,
        },
        animated,
        style,
      ]}
    />
  );
}

/** Card-shaped placeholder matching the density of a list row. */
export function SkeletonCard() {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.color.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.color.line,
        padding: t.spacing.md,
        flexDirection: 'row',
        gap: t.spacing.md,
        alignItems: 'center',
      }}
    >
      <Skeleton width={46} height={46} radius={23} />
      <View
        style={{
          flex: 1,
          gap: 8,
        }}
      >
        <Skeleton width="55%" height={15} />
        <Skeleton width="80%" height={12} />
        <Skeleton width="35%" height={12} />
      </View>
    </View>
  );
}
export function SkeletonList({ count = 4 }) {
  const t = useTheme();
  return (
    <View
      style={{
        gap: t.spacing.md,
      }}
    >
      {Array.from(
        {
          length: count,
        },
        (_, i) => (
          <SkeletonCard key={i} />
        ),
      )}
    </View>
  );
}
