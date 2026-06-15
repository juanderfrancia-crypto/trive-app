import React, { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView, Pressable, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme/theme'
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
  desc: string
  icon: string
  component: React.ComponentType<HubTabProps>
}

export default function AirportHubScreen() {
  const navigation = useNavigation<any>()
  const user = useAppStore((s) => s.user)
  const isDriver = isDriverRole(user)
  const [activeTab, setActiveTab] = useState(0)

  // Si el usuario cambia de rol, volver al primer tab del modo correspondiente
  useEffect(() => {
    setActiveTab(0)
  }, [isDriver])

  const tabs = useMemo((): TabDef[] => {
    if (isDriver) {
      return [
        { name: 'Ofertas', label: 'Solicitudes', desc: 'Viajes que puedes aceptar', icon: 'briefcase', component: AvailableOffersTab },
        { name: 'MisViajes', label: 'En curso', desc: 'Tus viajes activos', icon: 'car', component: ActiveTripsTab },
        { name: 'Chats', label: 'Mensajes', desc: 'Chat con pasajeros', icon: 'chatbubbles', component: ActiveChatsTab },
        { name: 'Historial', label: 'Historial', desc: 'Viajes completados', icon: 'checkmark-circle', component: TripHistoryTab },
      ]
    }
    return [
      { name: 'MisSolicitudes', label: 'Mis solicitudes', desc: 'Publicadas y en negociación', icon: 'document', component: PendingRequestsTab },
      { name: 'MisViajes', label: 'En curso', desc: 'Viajes confirmados', icon: 'airplane', component: ActiveTripsTab },
      { name: 'Chats', label: 'Mensajes', desc: 'Chat con conductores', icon: 'chatbubbles', component: ActiveChatsTab },
      { name: 'Historial', label: 'Historial', desc: 'Viajes completados', icon: 'checkmark-circle', component: TripHistoryTab },
    ]
  }, [isDriver])

  const ActiveComponent = tabs[activeTab].component
  const activeTabInfo = tabs[activeTab]

  const handlePrimaryAction = () => {
    if (isDriver) {
      navigation.navigate('AirportFeed')
    } else {
      navigation.navigate('AirportRequest')
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.rolePill}>{isDriver ? 'Modo conductor' : 'Modo pasajero'}</Text>
          <Text style={styles.headerTitle}>{activeTabInfo.label}</Text>
          <Text style={styles.headerSubtitle}>{activeTabInfo.desc}</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={handlePrimaryAction} activeOpacity={0.85}>
          <Ionicons
            name={isDriver ? 'search' : 'add-circle'}
            size={22}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
        scrollEventThrottle={16}
      >
        {tabs.map((tab, idx) => (
          <Pressable
            key={tab.name}
            style={[styles.tabButton, activeTab === idx && styles.tabButtonActive]}
            onPress={() => setActiveTab(idx)}
          >
            <View style={styles.tabIconContainer}>
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === idx ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
            <Text
              style={[styles.tabLabel, activeTab === idx && styles.tabLabelActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {activeTab === idx && <View style={styles.tabDot} />}
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.tabContent}>
        <ActiveComponent key={`${isDriver ? 'driver' : 'passenger'}-${activeTab}`} isDriver={isDriver} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flex: 1,
  },
  rolePill: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  tabsContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 90,
  },
  tabsContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  tabButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.xs,
    minWidth: 70,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    marginVertical: SPACING.xs,
  },
  tabButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  tabIconContainer: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.xs,
  },
  tabContent: {
    flex: 1,
  },
})
