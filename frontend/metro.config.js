const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Keep the mock backend out of builds that did not ask for it.
 *
 * Guarding the call site is not enough: Metro does not tree-shake, so a
 * `require('./mock')` sitting inside a branch that can never run is still an
 * edge in the module graph, and the seed data ships anyway. Verified — a
 * production export still contained "Bharat Movers" until this file existed.
 *
 * Resolving the module to a no-op stub instead removes it from the graph
 * entirely, which is the only thing that actually shrinks the bundle.
 */
const MOCK_ENABLED = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';

if (!MOCK_ENABLED) {
  const stub = path.resolve(__dirname, 'src/api/mock/disabled.js');
  const mockDir = path.resolve(__dirname, 'src/api/mock');
  const previous = config.resolver.resolveRequest;

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolve = previous ?? context.resolveRequest;
    const result = resolve(context, moduleName, platform);
    /*
     * Matched on the resolved path rather than the specifier, so it catches
     * every spelling — './mock', '@/api/mock', a deep import of the seed data —
     * without having to enumerate them. The stub itself is exempt, or it would
     * resolve to itself forever.
     */
    if (
      result?.type === 'sourceFile' &&
      result.filePath &&
      result.filePath !== stub &&
      path.resolve(result.filePath).startsWith(mockDir)
    ) {
      return { type: 'sourceFile', filePath: stub };
    }
    return result;
  };
}

module.exports = config;
