// Metro for an npm-workspaces monorepo. Expo detects the workspace root on its own;
// the one extra rule pins React to this app's copy.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The web app hoists a newer React to the root. React Native's renderer must use the exact
// React it ships with, and shared libraries (React Query, React Navigation) must see the same copy.
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return { type: 'sourceFile', filePath: require.resolve(moduleName, { paths: [__dirname] }) };
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
