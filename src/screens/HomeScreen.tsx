import React from 'react'
import { useAppStore } from '../store/useAppStore'
import PassengerHomeScreen from './PassengerHomeScreen'
import DriverHomeScreen from './DriverHomeScreen'

export default function HomeScreen() {
  // viewingAsPassenger: un conductor puede ver la app como pasajero sin cambiar
  // su rol real (profiles.role) — ver docs/MODO_CONDUCTOR_PASAJERO.md.
  const isDriver = useAppStore((s) => s.user?.role === 'driver' && !s.viewingAsPassenger)
  return isDriver ? <DriverHomeScreen /> : <PassengerHomeScreen />
}
