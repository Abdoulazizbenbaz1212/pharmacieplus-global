const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];
config.resolver.blockList = [
  /node_modules\/.*\/ios\/.*/,
  /node_modules\/.*\/android\/build\/.*/,
];

module.exports = config;
