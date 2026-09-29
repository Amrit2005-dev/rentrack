import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
export function Badge({ label, tone = 'neutral', style }) {
  const t = useTheme();
  const tones = {
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
    accent: {
      bg: t.accent.primarySoft,
      fg: t.accent.primaryDark,
    },
  };
  const { bg, fg } = tones[tone];
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: t.radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 4,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <AppText
        variant="micro"
        style={{
          color: fg,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}
export const StatusBadge = ({ meta, style }) =>
  meta ? <Badge label={meta.label} tone={meta.tone} style={style} /> : null;
