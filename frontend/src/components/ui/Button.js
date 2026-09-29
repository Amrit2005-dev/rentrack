import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}) {
  const t = useTheme();
  const isDisabled = disabled || loading;
  const surface = {
    primary: {
      bg: t.accent.primary,
      border: t.accent.primary,
      fg: t.accent.onPrimary,
    },
    outline: {
      bg: t.color.surface,
      border: t.accent.primary,
      fg: t.accent.primary,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      fg: t.color.body,
    },
    danger: {
      bg: t.status.dangerBg,
      border: t.status.dangerBg,
      fg: t.status.dangerFg,
    },
    success: {
      bg: t.status.successFg,
      border: t.status.successFg,
      fg: '#FFFFFF',
    },
  };
  const { bg, border, fg } = surface[variant];
  const height = size === 'sm' ? t.sizing.controlCompact : t.sizing.control;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      accessibilityLabel={label}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderRadius: t.radius.md,
          backgroundColor: bg,
          borderColor: border,
          opacity: isDisabled ? 0.5 : pressed ? 0.86 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? t.spacing.lg : t.spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <AppText
            variant={size === 'sm' ? 'bodyStrong' : 'bodyStrong'}
            style={{
              color: fg,
            }}
          >
            {label}
          </AppText>
          {iconRight ? <Ionicons name={iconRight} size={18} color={fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
