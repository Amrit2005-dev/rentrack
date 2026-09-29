import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useAuthStore, useCurrentUser } from '@/store/auth';
import { useScopedCompanyName } from '@/store/companyScope';
import { displayName, roleLabel } from '@/utils/permissions';
import { initials } from '@/utils/format';
import { useTheme } from '@/theme';
import { useShellNavigation } from './navigation';
import { RAIL_EXPANDED_WIDTH, RAIL_WIDTH } from './useShellLayout';

const ANIMATION_MS = 180;

/**
 * The always-visible navigation rail, for viewports with room for one.
 *
 * Collapsed it is a column of icons; pointed at, it widens over the content to
 * show what each one is. The content behind it is inset by RAIL_WIDTH only, so
 * expanding costs no reflow — the wider panel floats above rather than pushing
 * the page sideways, which is what makes the hover feel free.
 *
 * Hover is the desktop affordance and does not exist on touch, so the rail is
 * only rendered above WIDE_SHELL_BREAKPOINT; narrower viewports keep the
 * hamburger and AppDrawer's overlay. A touch user on a wide screen is not
 * stranded either — every icon is a real target whether or not it has widened.
 */
export function AppRail({ shell = 'admin' }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const user = useCurrentUser();
  const scopedCompanyName = useScopedCompanyName();
  const { sidebarGroups: groups, quickActions } = useShellNavigation(shell);
  const signOut = useAuthStore((s) => s.signOut);

  const [expanded, setExpanded] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: ANIMATION_MS,
      easing: Easing.out(Easing.quad),
      // Width cannot be driven natively; this is a layout animation.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [RAIL_WIDTH, RAIL_EXPANDED_WIDTH],
  });
  /* Labels fade in over the back half of the widen, so they never appear
     before there is room for them. */
  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });

  const go = (href) => {
    setExpanded(false);
    router.push(href);
  };

  const confirmSignOut = () => {
    setExpanded(false);
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Log out of MoveXpress?')) void signOut();
      return;
    }
    Alert.alert('Log out', 'You will be logged out from the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const isCurrent = (href) => {
    if (!href || !pathname) return false;
    if (href === '/admin' || href === '/driver') return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const rows = [
    ...groups.map((node) => ({
      key: node.key,
      icon: node.icon,
      label: node.label,
      badge: node.badge,
      href: node.href ?? node.children?.[0]?.href,
      tone: null,
    })),
    ...quickActions.map((action) => ({
      key: action.key,
      icon: action.icon,
      label: action.label,
      href: action.href,
      tone: action.tone,
    })),
  ];

  return (
    <Animated.View
      // Floats over the content so widening reflows nothing behind it.
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width,
        zIndex: 20,
        backgroundColor: t.color.canvas,
        borderRightWidth: 1,
        borderRightColor: t.color.line,
        paddingTop: insets.top + t.spacing.md,
        paddingBottom: insets.bottom + t.spacing.md,
        overflow: 'hidden',
        ...(expanded ? t.shadow.raised : null),
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Brand. Doubles as the way a touch user on a wide screen widens the
          rail, since they have no pointer to hover with. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse menu' : 'Expand menu'}
        onPress={() => setExpanded((prev) => !prev)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.md,
          paddingHorizontal: 14,
          paddingBottom: t.spacing.lg,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: t.accent.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="cube" size={20} color={t.accent.onPrimary} />
        </View>
        <Animated.View style={{ flex: 1, opacity: labelOpacity }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            MoveXpress
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {scopedCompanyName ?? roleLabel(user?.role)}
          </AppText>
        </Animated.View>
      </Pressable>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, gap: 4 }}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row) => (
          <RailRow
            key={row.key}
            t={t}
            row={row}
            active={isCurrent(row.href)}
            labelOpacity={labelOpacity}
            onPress={() => go(row.href)}
          />
        ))}
      </ScrollView>

      <View
        style={{
          marginTop: t.spacing.md,
          paddingTop: t.spacing.md,
          paddingHorizontal: 14,
          borderTopWidth: 1,
          borderTopColor: t.color.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.md,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: t.accent.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="micro" style={{ color: t.accent.primaryDark }}>
            {initials(displayName(user))}
          </AppText>
        </View>
        <Animated.View
          style={{ flex: 1, opacity: labelOpacity, flexDirection: 'row' }}
          pointerEvents={expanded ? 'auto' : 'none'}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="caption" numberOfLines={1}>
              {displayName(user)}
            </AppText>
            <AppText variant="micro" tone="muted" numberOfLines={1}>
              {roleLabel(user?.role)}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            hitSlop={10}
            onPress={confirmSignOut}
          >
            <Ionicons name="log-out-outline" size={19} color={t.status.dangerFg} />
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/**
 * One rail row: the icon holds its place whatever the width, and the label
 * slides out beside it. Keeping the icon at a fixed 40px means nothing shifts
 * horizontally as the rail grows — only the label appears.
 */
function RailRow({ t, row, active, labelOpacity, onPress }) {
  const palette = {
    accent: { bg: t.accent.primarySoft, fg: t.accent.primaryDark },
    success: { bg: t.status.successBg, fg: t.status.successFg },
    warning: { bg: t.status.warningBg, fg: t.status.warningFg },
    danger: { bg: t.status.dangerBg, fg: t.status.dangerFg },
    info: { bg: t.status.infoBg, fg: t.status.infoFg },
    neutral: { bg: t.status.neutralBg, fg: t.status.neutralFg },
  };
  const chip = row.tone ? palette[row.tone] : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        height: 44,
        borderRadius: 12,
        backgroundColor: active
          ? t.accent.primarySoft
          : pressed
            ? t.color.lineSoft
            : 'transparent',
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: chip ? 12 : 20,
          backgroundColor: chip ? chip.bg : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={row.icon}
          size={20}
          color={chip ? chip.fg : active ? t.accent.primaryDark : t.color.muted}
        />
        {/* Collapsed, a count has nowhere to sit but on the icon itself. */}
        {row.badge ? (
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: t.status.dangerFg,
            }}
          />
        ) : null}
      </View>

      <Animated.View style={{ flex: 1, opacity: labelOpacity, flexDirection: 'row' }}>
        <AppText
          variant="body"
          numberOfLines={1}
          style={{
            flex: 1,
            color: active ? t.color.ink : t.color.body,
            fontWeight: active ? '600' : '400',
          }}
        >
          {row.label}
        </AppText>
        {row.badge ? (
          <AppText variant="caption" style={{ color: t.status.dangerFg }}>
            {row.badge > 99 ? '99+' : row.badge}
          </AppText>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
