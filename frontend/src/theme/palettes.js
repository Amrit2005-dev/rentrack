/**
 * MoveXpress carries two visual languages, exactly as drawn in the SRS mockups:
 *
 *   amber  — login, registration and the whole driver app. Warm, brand-forward,
 *            hero imagery, dark text on white cards.
 *   indigo — every admin CRUD surface. Flat, dense, no imagery, coloured
 *            section headings.
 *
 * They share one set of neutrals, status colours and spacing so a screen is a
 * token swap rather than a second component library.
 */

export const neutral = {
  ink: '#141519',
  body: '#3D4149',
  muted: '#767C87',
  faint: '#A2A8B3',
  line: '#E8EAEF',
  lineSoft: '#F1F2F6',
  surface: '#FFFFFF',
  canvas: '#F7F8FA',
  canvasWarm: '#FDF9F2',
};
export const status = {
  successFg: '#16A34A',
  successBg: '#DCFCE7',
  warningFg: '#D97706',
  warningBg: '#FEF3C7',
  dangerFg: '#DC2626',
  dangerBg: '#FEE2E2',
  infoFg: '#2563EB',
  infoBg: '#DBEAFE',
  neutralFg: '#64748B',
  neutralBg: '#F1F5F9',
};
export const amber = {
  key: 'amber',
  primary: '#F5A623',
  primaryDark: '#DE8F0C',
  primaryPressed: '#C97F08',
  primarySoft: '#FEF1DC',
  primaryFaint: '#FFFBF3',
  onPrimary: '#1A1206',
  headerTint: '#F5A623',
};
export const indigo = {
  key: 'indigo',
  primary: '#5B3EE8',
  primaryDark: '#4A2FD0',
  primaryPressed: '#3F27B4',
  primarySoft: '#EDE9FE',
  primaryFaint: '#F8F6FF',
  onPrimary: '#FFFFFF',
  headerTint: '#5B3EE8',
};
