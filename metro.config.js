const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce Metro concurrency on Windows to avoid worker crashes during bundling.
config.maxWorkers = 1;

module.exports = config;
