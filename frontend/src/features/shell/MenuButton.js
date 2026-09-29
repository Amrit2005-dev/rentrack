import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOpenDrawer } from '@/store/drawer';
import { useHasSideNav } from './navigation';
import { useIsWideShell } from './useShellLayout';
import { useTheme } from '@/theme';

/**
 * Opens the admin navigation drawer.
 *
 * Belongs on the top-level tab screens only — a detail screen already carries a
 * back arrow in that slot, and two competing left-hand controls read as a bug.
 */
export function MenuButton({ label = 'Open menu' }) {
  const t = useTheme();
  const openDrawer = useOpenDrawer();
  const isWide = useIsWideShell();
  const hasSideNav = useHasSideNav();

  // The rail is already on screen at this width — a second way to open the
  // same panel would just be clutter.
  if (isWide) return null;
  // Nothing to open.
  if (!hasSideNav) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      onPress={openDrawer}
      style={({ pressed }) => ({
        paddingVertical: 4,
        paddingRight: 2,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name="menu" size={24} color={t.color.ink} />
    </Pressable>
  );
}
