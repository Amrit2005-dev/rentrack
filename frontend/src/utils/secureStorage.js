import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * expo-secure-store has no web implementation. On web we fall back to
 * localStorage, which is the same trade-off React Native Web apps normally
 * make — the token is no less exposed there than any cookie-less SPA session.
 */
const isWeb = Platform.OS === 'web';
export const secureStorage = {
  async get(key) {
    if (isWeb) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (isWeb) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* storage disabled — session stays in memory only */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key) {
    if (isWeb) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* nothing to clean up */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
