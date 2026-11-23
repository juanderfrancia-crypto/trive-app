import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { checkDriverApprovalStatus, getDriverRestrictionMessage, type DriverApprovalStatus } from '../services/driverApproval'
import { showWarning } from '../utils/showError'
import { AppAlert } from '../components/AppAlert'

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
      showWarning('Verificando estado de aprobación...')
      return
    }

    if (!approvalStatus.canCreateRoutes) {
      AppAlert.confirm({
        title: 'No puedes crear rutas',
        message: getDriverRestrictionMessage(approvalStatus),
        confirmText: 'Ver documentos',
        cancelText: 'Cerrar',
        onConfirm: () => navigation.navigate('DriverDocuments'),
      })
      return
    }

    navigation.navigate('DriverRegister')
  }, [approvalStatus, navigation])

  return { approvalStatus, checkingApproval, goToCreateRoute }
}
