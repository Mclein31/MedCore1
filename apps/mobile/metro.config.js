const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
// Shared validation and QR encoding resolve dependencies from either app root.
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, '../shared'), path.resolve(__dirname, '../../node_modules')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, '../../node_modules')];
module.exports = config;
