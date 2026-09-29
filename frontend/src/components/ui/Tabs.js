import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
/** Underlined tabs — the driver Trips screen and the admin trip detail use these. */
export function UnderlineTabs({ items, value, onChange }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: t.color.line,
      }}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{
              selected: active,
            }}
            onPress={() => onChange(item.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: t.spacing.md,
              borderBottomWidth: 2,
              borderBottomColor: active ? t.accent.primary : 'transparent',
            }}
          >
            <AppText
              variant={active ? 'bodyStrong' : 'body'}
              tone={active ? 'accent' : 'muted'}
            >
              {item.label}
              {item.count != null ? ` (${item.count})` : ''}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pill filter row — the notifications screen (All / Important / Trips / …). */
export function PillTabs({ items, value, onChange }) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: t.spacing.sm,
        paddingRight: t.spacing.xl,
      }}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{
              selected: active,
            }}
            onPress={() => onChange(item.key)}
            style={{
              paddingHorizontal: t.spacing.lg,
              height: 38,
              justifyContent: 'center',
              borderRadius: t.radius.pill,
              borderWidth: 1,
              borderColor: active ? t.accent.primary : t.color.line,
              backgroundColor: active ? t.accent.primary : t.color.surface,
            }}
          >
            <AppText
              variant="label"
              style={{
                color: active ? t.accent.onPrimary : t.color.body,
              }}
            >
              {item.label}
              {item.count != null ? ` (${item.count})` : ''}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
