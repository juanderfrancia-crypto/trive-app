module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    plugins: [
      ...(config.plugins ?? []),
      'expo-secure-store',
      '@react-native-community/datetimepicker',
      '@sentry/react-native',
    ],
  };
};
