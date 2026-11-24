const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce Metro concurrency on Windows to avoid worker crashes during bundling.
config.maxWorkers = 1;

// Expo deja esto en `false` por defecto (ver @expo/metro-config/build/ExpoMetroConfig.js).
// Con inlineRequires, cada require()/import solo se ejecuta la primera vez que el
// código realmente lo referencia, en vez de al cargar el módulo entero -- reduce
// el trabajo de arranque en proporción a cuántos imports del árbol nunca llegan
// a usarse en esa pantalla/sesión.
config.transformer.getTransformOptions = async () => ({
  transform: { experimentalImportSupport: true, inlineRequires: true },
});

module.exports = config;
