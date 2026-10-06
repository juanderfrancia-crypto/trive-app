import Constants from 'expo-constants'
import * as Application from 'expo-application'

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0'

export const APP_BUILD: string | null = Application.nativeBuildVersion

export const APP_VERSION_LABEL: string = APP_BUILD
  ? `${APP_VERSION} (${APP_BUILD})`
  : APP_VERSION
