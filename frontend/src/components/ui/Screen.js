import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

/** Page chrome: safe-area padding, canvas colour, optional scrolling. */
export function Screen({
  children,
  scroll = true,
  padded = true,
  tone = 'canvas',
  contentStyle,
  refreshControl,
  edges = 'top',
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const backgroundColor = tone === 'surface' ? t.color.surface : t.color.canvas;
  const inner = [
    {
      paddingTop: edges === 'top' ? insets.top : 0,
      paddingHorizontal: padded ? t.spacing.xl : 0,
      paddingBottom: t.spacing.xxxl,
      gap: t.spacing.lg,
    },
    contentStyle,
  ];
  if (!scroll) {
    return (
      <View
        style={[
          {
            flex: 1,
            backgroundColor,
          },
          inner,
        ]}
      >
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor,
      }}
      contentContainerStyle={inner}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}
/**
 * `left` replaces the back arrow rather than joining it — a screen reached from
 * a tab opens the drawer from that slot, a screen pushed onto the stack goes
 * back from it, and two controls there read as a bug.
 */
export function ScreenHeader({
  title,
  subtitle,
  back = false,
  left,
  right,
  large = false,
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: large ? 'flex-start' : 'center',
        gap: t.spacing.md,
      }}
    >
      {left ?? null}
      {!left && back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={{
            paddingVertical: 4,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={t.color.ink} />
        </Pressable>
      ) : null}

      <View
        style={{
          flex: 1,
        }}
      >
        <AppText variant={large ? 'display' : 'heading'}>{title}</AppText>
        {subtitle ? (
          <AppText
            variant="caption"
            tone="muted"
            style={{
              marginTop: 2,
            }}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right}
    </View>
  );
}

/** Sticky action bar pinned above the tab bar / home indicator. */
export function StickyFooter({ children }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: t.color.line,
        backgroundColor: t.color.surface,
        paddingHorizontal: t.spacing.xl,
        paddingTop: t.spacing.md,
        paddingBottom: Math.max(insets.bottom, t.spacing.md),
        gap: t.spacing.sm,
      }}
    >
      {children}
    </View>
  );
}
