import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { initials } from '@/utils/format';
import { AppText } from './AppText';

/**
 * The mockups show photographs, but the API stores no avatar URL for users or
 * drivers — initials on a tinted disc is the honest stand-in.
 */
export function Avatar({ name, size = 44, tone = 'accent' }) {
  const t = useTheme();
  const bg = tone === 'accent' ? t.accent.primarySoft : t.status.neutralBg;
  const fg = tone === 'accent' ? t.accent.primaryDark : t.status.neutralFg;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText
        variant="bodyStrong"
        style={{
          color: fg,
          fontSize: Math.max(12, size * 0.36),
        }}
      >
        {initials(name)}
      </AppText>
    </View>
  );
}
