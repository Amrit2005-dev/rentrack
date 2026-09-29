import { useWindowDimensions } from 'react-native';

/** Collapsed rail — wide enough for a 40px target with breathing room. */
export const RAIL_WIDTH = 68;

/** What the rail grows to when pointed at. */
export const RAIL_EXPANDED_WIDTH = 272;

/**
 * Below this the rail would cost too much of the screen — 68px of a 375px
 * phone is a fifth of it — so narrow viewports keep the hamburger and the
 * overlay panel instead. The same split Gmail makes.
 */
export const WIDE_SHELL_BREAKPOINT = 900;

/**
 * Whether this viewport gets the always-visible rail.
 *
 * Width rather than platform: a tablet in landscape and a browser window both
 * have the room, and a browser window narrowed past the breakpoint should fall
 * back to the overlay rather than keep a rail that no longer fits.
 */
export function useIsWideShell() {
  const { width } = useWindowDimensions();
  return width >= WIDE_SHELL_BREAKPOINT;
}
