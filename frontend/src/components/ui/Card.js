import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
export function Card({ children, style, padded = true, tone = 'surface' }) {
  const t = useTheme();
  const backgroundColor =
    tone === 'accentSoft'
      ? t.accent.primaryFaint
      : tone === 'canvas'
        ? t.color.canvas
        : t.color.surface;
  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: tone === 'accentSoft' ? t.accent.primarySoft : t.color.line,
          padding: padded ? t.spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * The admin mockups group every form and detail block under a tinted icon +
 * accent-coloured heading. This is that block.
 */
export function SectionCard({ title, icon, action, children, style }) {
  const t = useTheme();
  return (
    <Card style={style}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          marginBottom: t.spacing.md,
        }}
      >
        {icon ? <Ionicons name={icon} size={17} color={t.accent.primary} /> : null}
        <AppText
          variant="subheading"
          tone="accent"
          style={{
            flex: 1,
          }}
        >
          {title}
        </AppText>
        {action}
      </View>
      {children}
    </Card>
  );
}

/** Label on the left, value on the right — the detail-screen workhorse. */
export function InfoRow({ label, value, icon, last = false }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        paddingVertical: t.spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.color.lineSoft,
      }}
    >
      {icon ? <Ionicons name={icon} size={16} color={t.accent.primary} /> : null}
      <AppText
        variant="body"
        tone="muted"
        style={{
          flex: 1,
        }}
      >
        {label}
      </AppText>
      {typeof value === 'string' || typeof value === 'number' ? (
        <AppText
          variant="bodyStrong"
          align="right"
          style={{
            flexShrink: 1,
          }}
        >
          {value === '' ? '—' : value}
        </AppText>
      ) : (
        (value ?? <AppText variant="bodyStrong">—</AppText>)
      )}
    </View>
  );
}

/** Two values side by side, as used across the trip and vehicle detail cards. */
export function SplitStat({ items }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.spacing.md,
      }}
    >
      {items.map((item) => (
        <Card
          key={item.label}
          style={{
            flex: 1,
          }}
          tone="canvas"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.sm,
            }}
          >
            {item.icon ? (
              <Ionicons name={item.icon} size={16} color={t.accent.primary} />
            ) : null}
            <AppText variant="caption" tone="muted">
              {item.label}
            </AppText>
          </View>
          <AppText
            variant="bodyStrong"
            style={{
              marginTop: 4,
            }}
          >
            {item.value}
          </AppText>
        </Card>
      ))}
    </View>
  );
}
