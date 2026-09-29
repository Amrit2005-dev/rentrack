import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import {
  useExitCompanyScope,
  useScopedCompanyId,
  useScopedCompanyName,
} from '@/store/companyScope';
import { useTheme } from '@/theme';

/**
 * Sits above the admin shell whenever a super admin is managing one company,
 * so it is never ambiguous whose data is on screen. Renders nothing when the
 * platform-wide view is active.
 */
export function CompanyScopeBar() {
  const t = useTheme();
  const companyId = useScopedCompanyId();
  const companyName = useScopedCompanyName();
  const exit = useExitCompanyScope();

  if (!companyId) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.sm,
        backgroundColor: t.accent.primary,
      }}
    >
      <Ionicons name="business" size={16} color={t.accent.onPrimary} />
      <AppText
        variant="caption"
        numberOfLines={1}
        style={{ flex: 1, color: t.accent.onPrimary }}
      >
        Managing {companyName ?? 'one company'}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Exit company view"
        hitSlop={8}
        onPress={exit}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <AppText variant="micro" style={{ color: t.accent.onPrimary }}>
          EXIT
        </AppText>
        <Ionicons name="close" size={14} color={t.accent.onPrimary} />
      </Pressable>
    </View>
  );
}
