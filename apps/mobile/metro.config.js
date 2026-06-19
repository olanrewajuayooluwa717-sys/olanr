const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Single React instance (monorepo duplicate fix)
const reactDir = path.dirname(require.resolve('react/package.json', { paths: [projectRoot] }));
const reactNativeDir = path.dirname(require.resolve('react-native/package.json', { paths: [projectRoot] }));

config.resolver.extraNodeModules = {
  react: reactDir,
  'react-native': reactNativeDir,
};

module.exports = config;
