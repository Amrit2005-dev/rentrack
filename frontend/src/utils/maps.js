import { Linking, Platform } from 'react-native';

/**
 * Opening a trip's route on a map, without coordinates.
 *
 * The API stores locations as free text — `pickup_location`, `destination` and
 * `site_location` are all String(500), and there is no latitude or longitude
 * column anywhere in the schema. An embedded map would therefore have nothing
 * to plot: drawing one needs either new columns or a geocoding service and the
 * API key that comes with it.
 *
 * Handing the text to a maps provider instead costs nothing and needs neither.
 * Google geocodes the query on its side, so "Bhosari MIDC, Pune" resolves the
 * same way it would if it had been typed into the search box — and the link
 * opens the installed Maps app on a phone and a browser tab on the web target.
 *
 * The trade-off worth knowing: resolution is only as good as what the operator
 * typed. A vague site name lands on a vague pin. That is a data problem the
 * real fix (storing coordinates) solves; this makes the text useful meanwhile.
 */

const encode = (value) => encodeURIComponent(String(value ?? '').trim());

/** Something the operator actually typed, rather than a placeholder. */
export const hasPlace = (value) => !!String(value ?? '').trim();

/**
 * Turn-by-turn from one place to another. Falls back to a plain search when
 * only one end of the route is known, because directions from nowhere is an
 * error page rather than a useful map.
 */
export function routeUrl(origin, destination) {
  const from = hasPlace(origin) ? encode(origin) : null;
  const to = hasPlace(destination) ? encode(destination) : null;
  if (from && to) {
    return `https://www.google.com/maps/dir/?api=1&origin=${from}&destination=${to}&travelmode=driving`;
  }
  const single = to ?? from;
  return single ? `https://www.google.com/maps/search/?api=1&query=${single}` : null;
}

/** A single place on the map — a site, a pickup point. */
export function placeUrl(place) {
  return hasPlace(place)
    ? `https://www.google.com/maps/search/?api=1&query=${encode(place)}`
    : null;
}

/**
 * Opens a maps URL, answering whether it went anywhere.
 *
 * On the web target `Linking.openURL` replaces the current tab, which would
 * throw away whatever the operator was part-way through entering, so the web
 * case opens a new one instead.
 */
export async function openMap(url) {
  if (!url) return false;
  try {
    if (Platform.OS === 'web') {
      globalThis.open?.(url, '_blank', 'noopener,noreferrer');
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    // No maps app, or the platform refused the scheme. The caller says so
    // rather than leaving a button that looks broken.
    return false;
  }
}
