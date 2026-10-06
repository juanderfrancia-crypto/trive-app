import { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { checkDriverApprovalStatus, getDriverRestrictionMessage, type DriverApprovalStatus } from '../services/driverApproval'

export const useCreateRouteGate = (userId?: string) => {
  const navigation = useNavigation<any>()
  const [approvalStatus, setApprovalStatus] = useState<DriverApprovalStatus | null>(null)
  const [checkingApproval, setCheckingApproval] = useState(true)

  useEffect(() => {
    if (!userId) {
      setCheckingApproval(false)
      return
    }
    checkDriverApprovalStatus(userId).then((status) => {
      setApprovalStatus(status)
      setCheckingApproval(false)
    })
  }, [userId])

  const goToCreateRoute = useCallback(() => {
    if (!approvalStatus) {
      Alert.alert('Error', 'Verificando estado de aprobación...')
      return
    }

    if (!approvalStatus.canCreateRoutes) {
      Alert.alert('No puedes crear rutas', getDriverRestrictionMessage(approvalStatus), [
        { text: 'Ver documentos', onPress: () => navigation.navigate('DriverDocuments') },
        { text: 'Cerrar', style: 'cancel' },
      ])
      return
    }

    navigation.navigate('DriverRegister')
  }, [approvalStatus, navigation])

  return { approvalStatus, checkingApproval, goToCreateRoute }
}
