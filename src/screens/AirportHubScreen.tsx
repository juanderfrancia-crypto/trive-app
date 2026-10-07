import React, { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, Pressable, TouchableOpacity } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from '../components/Icon'
import { useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'
import { isDriverRole } from '../utils/userRole'

import ActiveChatsTab from '../components/AirportHub/ActiveChatsTab'
import AvailableOffersTab from '../components/AirportHub/AvailableOffersTab'
import PendingRequestsTab from '../components/AirportHub/PendingRequestsTab'
import ActiveTripsTab from '../components/AirportHub/ActiveTripsTab'
import TripHistoryTab from '../components/AirportHub/TripHistoryTab'
import type { HubTabProps } from '../components/AirportHub/types'

type TabDef = {
  name: string
  label: string
  component: React.ComponentType<HubTabProps>
}

export default function AirportHubScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const isDriver = isDriverRole(user)
  const [activeTab, setActiveTab] = useState(0)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setActiveTab(0)
    setShowHistory(false)
  }, [isDriver])

  const tabs = useMemo((): TabDef[] => {
    const first: TabDef = isDriver
      ? { name: 'Ofertas', label: 'Nuevas', component: AvailableOffersTab }
      : { name: 'MisSolicitudes', label: 'Mis solicitudes', component: PendingRequestsTab }
    return [
      first,
      { name: 'Chats', label: 'Mis chats', component: ActiveChatsTab },
      { name: 'MisViajes', label: 'Aceptadas', component: ActiveTripsTab },
    ]
  }, [isDriver])

  const ActiveComponent = showHistory ? TripHistoryTab : tabs[activeTab].component

  const handlePrimaryAction = () => {
    if (isDriver) {
      navigation.navigate('AirportFeed')
    } else {
      navigation.navigate('AirportRequest')
    }
  }

  const subtitle = showHistory
    ? 'Viajes completados'
    : isDriver
      ? 'Rutas personalizadas que te piden'
      : 'Pide una ruta personalizada a tu destino'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Solicitudes</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.historyBtn} onPress={() => setShowHistory((v) => !v)} activeOpacity={0.85}>
              <Text style={styles.historyBtnText}>{showHistory ? 'Volver' : 'Historial'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={handlePrimaryAction} activeOpacity={0.85}>
              <Icon name={isDriver ? 'Search' : 'CirclePlus'} size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {!showHistory && (
        <View style={styles.segment}>
          {tabs.map((tab, idx) => {
            const active = activeTab === idx
            return (
              <Pressable
                key={tab.name}
                style={[styles.segItem, active && styles.segItemActive]}
                onPress={() => setActiveTab(idx)}
              >
                <Text style={[styles.segText, active && styles.segTextActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}

      <View style={styles.tabContent}>
        <ActiveComponent
          key={`${isDriver ? 'driver' : 'passenger'}-${showHistory ? 'history' : activeTab}`}
          isDriver={isDriver}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  historyBtn: {
    height: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  segment: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.xl,
    padding: SPACING.xs,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceAlt,
  },
  segItem: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  segItemActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.xs,
  },
  segText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segTextActive: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  tabContent: {
    flex: 1,
    marginTop: SPACING.lg,
  },
})
