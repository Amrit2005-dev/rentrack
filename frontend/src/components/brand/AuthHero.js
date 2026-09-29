import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import { AppText } from '@/components/ui';

/**
 * The SRS auth frames sit on a photographic hero of trucks and cranes against a
 * city skyline. We have no rights to those renders, so this is the same
 * composition drawn as vector: warm gradient, skyline band, equipment silhouette.
 */
function Skyline({ color }) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 360 160"
      preserveAspectRatio="xMidYMax slice"
    >
      <Rect x="14" y="62" width="34" height="98" fill={color} opacity={0.55} />
      <Rect x="56" y="38" width="26" height="122" fill={color} opacity={0.4} />
      <Rect x="92" y="76" width="40" height="84" fill={color} opacity={0.6} />
      <Rect x="142" y="50" width="30" height="110" fill={color} opacity={0.45} />
      <Rect x="182" y="84" width="46" height="76" fill={color} opacity={0.5} />
      <Rect x="238" y="46" width="28" height="114" fill={color} opacity={0.4} />
      <Rect x="276" y="70" width="38" height="90" fill={color} opacity={0.55} />
      <Rect x="322" y="54" width="24" height="106" fill={color} opacity={0.42} />
    </Svg>
  );
}
function Equipment({ body, accent }) {
  const wheel = (cx, cy, r, key) => (
    <React.Fragment key={key}>
      <Circle cx={cx} cy={cy} r={r} fill={body} />
      <Circle cx={cx} cy={cy} r={r * 0.42} fill="#B9B2A6" />
    </React.Fragment>
  );
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 120">
      {/* Tipper: cab, tipping body, chassis */}
      <Path d="M20 46 L74 46 L74 82 L20 82 Z" fill={accent} />
      <Path d="M74 54 L96 54 L104 68 L104 82 L74 82 Z" fill={body} />
      <Rect x="88" y="58" width="13" height="9" rx="2" fill="#DCE4EC" />
      <Rect x="18" y="82" width="88" height="5" rx="2" fill={body} />
      {wheel(36, 92, 9, 'a1')}
      {wheel(62, 92, 9, 'a2')}
      {wheel(92, 92, 9, 'a3')}

      {/* Loader: arm, bucket, cab */}
      <Path d="M150 86 L136 86 L128 96 L150 96 Z" fill={accent} />
      <Path
        d="M150 90 L172 74"
        stroke={accent}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x="168" y="62" width="46" height="26" rx="5" fill={accent} />
      <Rect x="176" y="67" width="16" height="11" rx="2" fill="#DCE4EC" />
      {wheel(182, 94, 11, 'b1')}
      {wheel(208, 94, 9, 'b2')}

      {/* Crane: boom, counterweight, carrier */}
      <Path
        d="M270 62 L270 26"
        stroke={accent}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M270 28 L340 44"
        stroke={accent}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M338 44 L338 58" stroke={body} strokeWidth={2.5} fill="none" />
      <Rect x="332" y="58" width="12" height="8" rx="2" fill={body} />
      <Rect x="252" y="62" width="62" height="24" rx="5" fill={accent} />
      <Rect x="258" y="66" width="14" height="10" rx="2" fill="#DCE4EC" />
      <Rect x="250" y="86" width="66" height="5" rx="2" fill={body} />
      {wheel(266, 96, 9, 'c1')}
      {wheel(300, 96, 9, 'c2')}
    </Svg>
  );
}
export function AuthHero({ height = 240, children }) {
  const t = useTheme();
  return (
    <View
      style={{
        height,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={['#FFF7E8', '#FDE7BC', '#F8D89A']}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      />

      {/* The screens using this hero overlap it with a card by 28pt, so the
          equipment band is lifted clear of that seam. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 96,
          height: 130,
        }}
      >
        <Skyline color="#D8BE93" />
      </View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 34,
          height: 116,
        }}
      >
        <Equipment body="#5C544A" accent={t.accent.primary} />
      </View>

      {children ? (
        <View
          style={{
            padding: t.spacing.xl,
            paddingTop: t.spacing.xxl,
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

/** "Powering Your Projects" lockup from the login frame. */
export function BrandLockup() {
  return (
    <View>
      <AppText variant="display">Powering Your</AppText>
      <AppText variant="display" tone="accent">
        Projects
      </AppText>
      <AppText
        variant="body"
        tone="body"
        style={{
          marginTop: 8,
          maxWidth: 260,
        }}
      >
        Rent trucks, bulldozers, cranes and temp transport with ease.
      </AppText>
    </View>
  );
}
