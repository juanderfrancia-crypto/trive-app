import React from 'react'
import { useAppStore } from '../store/useAppStore'
import PassengerHomeScreen from './PassengerHomeScreen'
import DriverHomeScreen from './DriverHomeScreen'

export default function HomeScreen() {
  const isDriver = useAppStore((s) => s.user?.role === 'driver')
  return isDriver ? <DriverHomeScreen /> : <PassengerHomeScreen />
}
