import React, { useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView, Pressable, Text, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/theme'
import { useAppStore } from '../store/useAppStore'

// Importar componentes de tabs
import ActiveChatsTab from '../components/AirportHub/ActiveChatsTab'
import AvailableOffersTab from '../components/AirportHub/AvailableOffersTab'
import PendingRequestsTab from '../components/AirportHub/PendingRequestsTab'
import ActiveTripsTab from '../components/AirportHub/ActiveTripsTab'
import TripHistoryTab from '../components/AirportHub/TripHistoryTab'

export default function AirportHubScreen() {
  const user = useAppStore((s) => s.user)
  const isDriver = user?.role === 'conductor'
  const [activeTab, setActiveTab] = useState(0)

  // Determinar qué tabs mostrar según rol
  const tabs = useMemo(() => {
    if (isDriver) {
      return [
        { name: 'Ofertas', label: 'Ofertas', desc: 'Solicitudes disponibles', icon: 'briefcase', component: AvailableOffersTab },
        { name: 'MisViajes', label: 'Detalles', desc: 'Información del viaje', icon: 'car', component: ActiveTripsTab },
        { name: 'Chats', label: 'Mensajes', desc: 'Comunicación activa', icon: 'chatbubbles', component: ActiveChatsTab },
        { name: 'Historial', label: 'Historial', desc: 'Viajes completados', icon: 'checkmark-circle', component: TripHistoryTab },
      ]
    } else {
      return [
        { name: 'MisSolicitudes', label: 'Solicitudes', desc: 'Tus solicitudes', icon: 'document', component: PendingRequestsTab },
        { name: 'MisViajes', label: 'Detalles', desc: 'Información del viaje', icon: 'airplane', component: ActiveTripsTab },
        { name: 'Chats', label: 'Mensajes', desc: 'Comunicación activa', icon: 'chatbubbles', component: ActiveChatsTab },
        { name: 'Historial', label: 'Historial', desc: 'Viajes completados', icon: 'checkmark-circle', component: TripHistoryTab },
      ]
    }
  }, [isDriver])

  const ActiveComponent = tabs[activeTab].component
  const activeTabInfo = tabs[activeTab]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{activeTabInfo.label}</Text>
          <Text style={styles.headerSubtitle}>{activeTabInfo.desc}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name={activeTabInfo.icon as any} size={32} color={COLORS.primary} />
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
        scrollEventThrottle={16}
      >
        {tabs.map((tab, idx) => (
          <Pressable
            key={idx}
            style={[
              styles.tabButton,
              activeTab === idx && styles.tabButtonActive,
            ]}
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
              style={[
                styles.tabLabel,
                activeTab === idx && styles.tabLabelActive,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {activeTab === idx && <View style={styles.tabDot} />}
          </Pressable>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        <ActiveComponent key={activeTab} />
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
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  headerIcon: {
    marginLeft: SPACING.md,
    opacity: 0.3,
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
