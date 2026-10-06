import { useNavigation } from '@react-navigation/native'
import PublishRouteFlow from './driver/PublishRouteFlow'

// Pantalla "Publicar viaje": requisitos, datos, revisión y cobro, y confirmación.
// El alta del vehículo vive en EditVehicleScreen.
export default function DriverRegisterScreen() {
  const navigation = useNavigation<any>()

  return (
    <PublishRouteFlow
      onExit={() => navigation.goBack()}
      onOpenPanel={() => navigation.navigate('DriverPanel' as never)}
      onOpenHome={() => navigation.navigate('Main' as never)}
      onOpenWallet={() => navigation.navigate('Wallet' as never)}
    />
  )
}
