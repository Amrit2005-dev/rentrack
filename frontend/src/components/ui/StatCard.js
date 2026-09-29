import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
/** The tinted count tiles across the dashboard and every management list. */
export function StatTile({ label, value, icon, tone = 'neutral', onPress, flex = 1 }) {
  const t = useTheme();
  const palette = {
    accent: {
      bg: t.accent.primarySoft,
      fg: t.accent.primaryDark,
    },
    success: {
      bg: t.status.successBg,
      fg: t.status.successFg,
    },
    warning: {
      bg: t.status.warningBg,
      fg: t.status.warningFg,
    },
    danger: {
      bg: t.status.dangerBg,
      fg: t.status.dangerFg,
    },
    info: {
      bg: t.status.infoBg,
      fg: t.status.infoFg,
    },
    neutral: {
      bg: t.status.neutralBg,
      fg: t.status.neutralFg,
    },
  };
  const { bg, fg } = palette[tone];
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      {...(onPress
        ? {
            onPress,
            accessibilityRole: 'button',
            accessibilityLabel: `${label}: ${value}`,
          }
        : {})}
      style={{
        flex,
        backgroundColor: bg,
        borderRadius: t.radius.md,
        padding: t.spacing.md,
        gap: 6,
        minHeight: 84,
        justifyContent: 'center',
      }}
    >
      {/* Two lines: four tiles across a 375pt screen cannot hold "In Progress". */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 4,
        }}
      >
        <AppText
          variant="caption"
          style={{
            color: fg,
            flex: 1,
          }}
          numberOfLines={2}
        >
          {label}
        </AppText>
        {icon ? (
          <Ionicons
            name={icon}
            size={16}
            color={fg}
            style={{
              marginTop: 1,
            }}
          />
        ) : null}
      </View>
      <AppText
        variant="title"
        style={{
          color: fg,
        }}
      >
        {value}
      </AppText>
    </Wrapper>
  );
}
export function StatRow({ children }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.spacing.sm,
      }}
    >
      {children}
    </View>
  );
}

/** Dashboard "quick action" square. */
export function QuickAction({ label, icon, tone = 'accent', onPress }) {
  const t = useTheme();
  const palette = {
    accent: {
      bg: t.accent.primarySoft,
      fg: t.accent.primaryDark,
    },
    success: {
      bg: t.status.successBg,
      fg: t.status.successFg,
    },
    warning: {
      bg: t.status.warningBg,
      fg: t.status.warningFg,
    },
    danger: {
      bg: t.status.dangerBg,
      fg: t.status.dangerFg,
    },
    info: {
      bg: t.status.infoBg,
      fg: t.status.infoFg,
    },
    neutral: {
      bg: t.status.neutralBg,
      fg: t.status.neutralFg,
    },
  };
  const { bg, fg } = palette[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: 8,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.md,
        backgroundColor: bg,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={fg} />
      <AppText
        variant="micro"
        align="center"
        style={{
          color: fg,
        }}
        numberOfLines={2}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
