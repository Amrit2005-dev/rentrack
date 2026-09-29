import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/theme';
export function AppText({ variant = 'body', tone = 'ink', align, style, ...rest }) {
  const t = useTheme();
  const color =
    tone === 'accent'
      ? t.accent.primary
      : tone === 'inverse'
        ? '#FFFFFF'
        : tone === 'danger'
          ? t.status.dangerFg
          : tone === 'success'
            ? t.status.successFg
            : t.color[tone];
  return (
    <Text
      {...rest}
      style={[
        t.type[variant],
        {
          color,
          textAlign: align,
        },
        style,
      ]}
    />
  );
}
