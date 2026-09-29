import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useAuthStore, useCurrentUser } from '@/store/auth';
import { useCloseDrawer, useDrawerOpen } from '@/store/drawer';
import { useScopedCompanyName } from '@/store/companyScope';
import { displayName, roleLabel } from '@/utils/permissions';
import { initials } from '@/utils/format';
import { useTheme } from '@/theme';
import { useShellNavigation } from './navigation';

const PANEL_MAX_WIDTH = 296;
const ANIMATION_MS = 220;

/**
 * The admin shell's navigation sidebar.
 *
 * Overlays the whole shell — tab bar included — so it has to be mounted by
 * app/admin/_layout.js as a sibling of the Stack rather than by any screen.
 *
 * Structure follows the reference design: a brand mark, then a single column
 * where a heading either goes somewhere or opens to reveal its pages. Open
 * branches drop a hairline rail down the left of their children so the indent
 * reads as containment rather than as loose spacing, and the current page sits
 * on a raised card the way the reference marks its active row.
 *
 * Rows come from useAdminNavigation(), the same source the dashboard's Quick
 * Access block uses, so the two can never offer different routes.
 */
export function AppDrawer({ shell = 'admin' }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const open = useDrawerOpen();
  const closeDrawer = useCloseDrawer();
  const pathname = usePathname();
  const user = useCurrentUser();
  const scopedCompanyName = useScopedCompanyName();
  const { sidebarGroups: groups, quickActions } = useShellNavigation(shell);
  const signOut = useAuthStore((s) => s.signOut);

  const panelWidth = Math.min(PANEL_MAX_WIDTH, Math.round(width * 0.84));
  const progress = useRef(new Animated.Value(0)).current;
  // Kept mounted through the closing animation, then unmounted so the overlay
  // never sits on top of the shell swallowing touches.
  const [mounted, setMounted] = useState(open);

  /**
   * Which branch holds the current page. Seeded into the open set so the page
   * you are on is never hidden inside a collapsed heading; after that the
   * reader decides what stays open.
   */
  const branchForPath = useMemo(() => {
    const match = groups.find((node) =>
      node.children?.some((child) => pathname?.startsWith(child.href)),
    );
    return match?.key ?? null;
  }, [groups, pathname]);

  const [expanded, setExpanded] = useState(() =>
    branchForPath ? { [branchForPath]: true } : {},
  );

  useEffect(() => {
    if (!branchForPath) return;
    setExpanded((prev) =>
      prev[branchForPath] ? prev : { ...prev, [branchForPath]: true },
    );
  }, [branchForPath]);

  useEffect(() => {
    if (open) setMounted(true);
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
    return () => animation.stop();
  }, [open, progress]);

  /* Android's back gesture should dismiss the panel before it pops the screen
     underneath it. */
  useEffect(() => {
    if (!open || Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDrawer();
      return true;
    });
    return () => subscription.remove();
  }, [open, closeDrawer]);

  /* Any navigation closes it — including a back gesture or a deep link that
     did not come from a row in here. */
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  if (!mounted) return null;

  const go = (href) => {
    closeDrawer();
    router.push(href);
  };

  /* Same confirmation the Account screen uses — web has no Alert. */
  const confirmSignOut = () => {
    closeDrawer();
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Log out of MoveXpress?')) void signOut();
      return;
    }
    Alert.alert('Log out', 'You will be logged out from the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  /* Exact match for the dashboard, prefix for the rest — otherwise /admin
     lights up on every route beneath it. */
  const isCurrent = (href) => {
    if (!href || !pathname) return false;
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <View
      style={{ ...StyleSheet.absoluteFillObject, flexDirection: 'row' }}
      pointerEvents="box-none"
    >
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: '#141519',
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.42] }),
        }}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={closeDrawer}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <Animated.View
        style={{
          width: panelWidth,
          height: '100%',
          backgroundColor: t.color.canvas,
          borderRightWidth: 1,
          borderRightColor: t.color.line,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-panelWidth, 0],
              }),
            },
          ],
        }}
      >
        {/* Brand mark, as in the reference. What sits under it is the company
            being managed, because that is what this sidebar is scoped to. */}
        <View
          style={{
            paddingTop: insets.top + t.spacing.lg,
            paddingHorizontal: t.spacing.lg,
            paddingBottom: t.spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.md,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: t.accent.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="cube" size={18} color={t.accent.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              MoveXpress
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {scopedCompanyName ?? roleLabel(user?.role)}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            hitSlop={12}
            onPress={closeDrawer}
          >
            <Ionicons name="close" size={20} color={t.color.muted} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: t.spacing.md,
            paddingBottom: insets.bottom + t.spacing.xxl,
            gap: 2,
          }}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((node) => {
            const isBranch = !!node.children?.length;
            const isOpen = !!expanded[node.key];
            const active = !isBranch && isCurrent(node.href);
            const holdsActive =
              isBranch && node.children.some((child) => isCurrent(child.href));

            return (
              <View key={node.key}>
                <SidebarRow
                  t={t}
                  icon={node.icon}
                  label={node.label}
                  badge={node.badge}
                  active={active}
                  emphasised={holdsActive}
                  chevron={isBranch ? (isOpen ? 'chevron-up' : 'chevron-down') : null}
                  onPress={() =>
                    isBranch
                      ? setExpanded((prev) => ({ ...prev, [node.key]: !prev[node.key] }))
                      : go(node.href)
                  }
                />

                {isBranch && isOpen ? (
                  <View
                    style={{
                      marginLeft: 26,
                      paddingLeft: 14,
                      borderLeftWidth: 1,
                      borderLeftColor: t.color.line,
                      gap: 2,
                      marginVertical: 2,
                    }}
                  >
                    {node.children.map((child) => (
                      <SidebarRow
                        key={child.key}
                        t={t}
                        label={child.label}
                        badge={child.badge}
                        active={isCurrent(child.href)}
                        compact
                        onPress={() => go(child.href)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}

          {quickActions.length ? (
            <View style={{ marginTop: t.spacing.lg, gap: 2 }}>
              <AppText
                variant="micro"
                tone="muted"
                style={{ paddingHorizontal: t.spacing.md, marginBottom: 6 }}
              >
                CREATE
              </AppText>
              {quickActions.map((action) => (
                <SidebarRow
                  key={action.key}
                  t={t}
                  icon={action.icon}
                  label={action.label}
                  tone={action.tone}
                  onPress={() => go(action.href)}
                />
              ))}
            </View>
          ) : null}

          <View
            style={{
              marginTop: t.spacing.lg,
              paddingTop: t.spacing.md,
              borderTopWidth: 1,
              borderTopColor: t.color.line,
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.md,
              paddingHorizontal: t.spacing.md,
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: t.accent.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText variant="micro" style={{ color: t.accent.primaryDark }}>
                {initials(displayName(user))}
              </AppText>
            </View>
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
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="log-out-outline" size={19} color={t.status.dangerFg} />
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/**
 * One row of the sidebar.
 *
 * `active` raises it onto a card — the reference marks the current page that
 * way rather than with a coloured bar. `emphasised` is the softer state a
 * collapsed heading takes when the page you are on lives inside it.
 */
/**
 * The tinted chip a create action wears, matching the dashboard's Quick Action
 * tiles so the same shortcut reads the same in both places. Navigation rows
 * pass no tone and keep a plain icon — colouring those too would make every
 * row shout and leave nothing to distinguish an action from a destination.
 */
function toneChip(t, tone) {
  const palette = {
    accent: { bg: t.accent.primarySoft, fg: t.accent.primaryDark },
    success: { bg: t.status.successBg, fg: t.status.successFg },
    warning: { bg: t.status.warningBg, fg: t.status.warningFg },
    danger: { bg: t.status.dangerBg, fg: t.status.dangerFg },
    info: { bg: t.status.infoBg, fg: t.status.infoFg },
    neutral: { bg: t.status.neutralBg, fg: t.status.neutralFg },
  };
  return palette[tone] ?? null;
}

function SidebarRow({
  t,
  icon,
  label,
  badge,
  active,
  emphasised,
  chevron,
  compact,
  tone,
  onPress,
}) {
  const chip = toneChip(t, tone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        minHeight: compact ? 36 : 40,
        paddingHorizontal: t.spacing.md,
        borderRadius: 9,
        backgroundColor: active
          ? t.color.surface
          : pressed
            ? t.color.lineSoft
            : 'transparent',
        borderWidth: active ? 1 : 0,
        borderColor: t.color.line,
      })}
    >
      {icon && chip ? (
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            backgroundColor: chip.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={15} color={chip.fg} />
        </View>
      ) : icon ? (
        <Ionicons
          name={icon}
          size={17}
          color={active || emphasised ? t.color.ink : t.color.muted}
        />
      ) : null}

      <AppText
        variant={compact ? 'caption' : 'body'}
        numberOfLines={1}
        style={{
          flex: 1,
          color: active ? t.color.ink : emphasised || chip ? t.color.body : t.color.muted,
          fontWeight: active ? '600' : '400',
        }}
      >
        {label}
      </AppText>

      {badge ? (
        <View
          style={{
            minWidth: 20,
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 9,
            backgroundColor: t.status.warningBg,
            alignItems: 'center',
          }}
        >
          <AppText variant="micro" style={{ color: t.status.warningFg }}>
            {badge > 99 ? '99+' : badge}
          </AppText>
        </View>
      ) : null}

      {chevron ? <Ionicons name={chevron} size={15} color={t.color.faint} /> : null}
    </Pressable>
  );
}
