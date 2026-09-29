/**
 * Stand-in for the mock backend in builds that do not want one.
 *
 * metro.config.js resolves ./mock here whenever EXPO_PUBLIC_USE_MOCK_API is
 * not "true", which is what actually keeps the seed data and the router out of
 * the bundle. Metro has no tree-shaking — a `require` inside a dead branch is
 * still an edge in the module graph — so excluding the module has to happen at
 * resolution, not at runtime.
 *
 * Nothing here is ever called: the only caller checks the same flag first.
 */

export const isMockEnabled = () => false;

export function installMockApi() {
  return false;
}
