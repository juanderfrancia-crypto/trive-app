let _analytics: any = null
try { _analytics = require('@react-native-firebase/analytics').default } catch {}

export const setUserId = async (userId: string | null) => {
  try {
    if (_analytics) await _analytics().setUserId(userId)
  } catch {}
}
