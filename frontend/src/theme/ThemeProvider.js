import React, { createContext, useContext, useMemo } from 'react';
import { amber, indigo, neutral, status } from './palettes';
import { radius, shadow, sizing, spacing, type as typography } from './tokens';
const build = (accent) => ({
  accent,
  color: neutral,
  status,
  spacing,
  radius,
  sizing,
  type: typography,
  shadow,
});
const amberTheme = build(amber);
const indigoTheme = build(indigo);
const ThemeContext = createContext(amberTheme);
export function ThemeProvider({ accent, children }) {
  const value = useMemo(() => (accent === 'indigo' ? indigoTheme : amberTheme), [accent]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
