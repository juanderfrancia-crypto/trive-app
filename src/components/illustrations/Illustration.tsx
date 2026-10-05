import React from 'react'
import type { SvgProps } from 'react-native-svg'
import RoutePlanningIllustration from './undraw/RoutePlanningIllustration'
import ProudDriverIllustration from './undraw/ProudDriverIllustration'
import AddingFundsIllustration from './undraw/AddingFundsIllustration'
import WalletDiagIllustration from './undraw/WalletDiagIllustration'
import SendGiftIllustration from './undraw/SendGiftIllustration'
import AllCheckedIllustration from './undraw/AllCheckedIllustration'
import PostOnlineIllustration from './undraw/PostOnlineIllustration'
import MobileEncryptionIllustration from './undraw/MobileEncryptionIllustration'
import TheSearchIllustration from './undraw/TheSearchIllustration'
import NoDataIllustration from './undraw/NoDataIllustration'
import MyNotificationsIllustration from './undraw/MyNotificationsIllustration'
import ScheduleIllustration from './undraw/ScheduleIllustration'
import SharingArticlesIllustration from './undraw/SharingArticlesIllustration'
import BlockedIllustration from './undraw/BlockedIllustration'
import SavingMoneyIllustration from './undraw/SavingMoneyIllustration'
import PersonalFileIllustration from './undraw/PersonalFileIllustration'
import BeginChatIllustration from './undraw/BeginChatIllustration'
import WarningIllustration from './undraw/WarningIllustration'

const ILLUSTRATIONS = {
  routePlanning: RoutePlanningIllustration,
  proudDriver: ProudDriverIllustration,
  addingFunds: AddingFundsIllustration,
  walletDiag: WalletDiagIllustration,
  sendGift: SendGiftIllustration,
  allChecked: AllCheckedIllustration,
  postOnline: PostOnlineIllustration,
  mobileEncryption: MobileEncryptionIllustration,
  theSearch: TheSearchIllustration,
  noData: NoDataIllustration,
  myNotifications: MyNotificationsIllustration,
  schedule: ScheduleIllustration,
  sharingArticles: SharingArticlesIllustration,
  blocked: BlockedIllustration,
  savingMoney: SavingMoneyIllustration,
  personalFile: PersonalFileIllustration,
  beginChat: BeginChatIllustration,
  warning: WarningIllustration,
} as const

export type IllustrationName = keyof typeof ILLUSTRATIONS

type Props = Omit<SvgProps, 'width' | 'height'> & {
  name: IllustrationName
  width?: number
  height?: number
}

function Illustration({ name, width = 200, height, ...rest }: Props) {
  const Component = ILLUSTRATIONS[name]
  return <Component width={width} height={height} {...rest} />
}

export default React.memo(Illustration)
