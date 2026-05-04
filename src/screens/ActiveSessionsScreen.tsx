import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface Session {
  id: string
  deviceName: string
  deviceType: 'mobile' | 'web' | 'tablet'
  lastActive: string
  location: string
  isCurrent: boolean
  osVersion: string
}

export default function ActiveSessionsScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      deviceName: 'Samsung Galaxy A51',
      deviceType: 'mobile',
      lastActive: 'Hace 2 minutos',
      location: 'Medellín, Colombia',
      isCurrent: true,
      osVersion: 'Android 12'
    },
    {
      id: '2',
      deviceName: 'Laptop Windows 10',
      deviceType: 'web',
      lastActive: 'Hace 3 horas',
      location: 'Medellín, Colombia',
      isCurrent: false,
      osVersion: 'Windows 10'
    },
    {
      id: '3',
      deviceName: 'iPhone 12 Pro',
      deviceType: 'mobile',
      lastActive: 'Ayer a las 18:45',
      location: 'Bogotá, Colombia',
      isCurrent: false,
      osVersion: 'iOS 15.4'
    }
  ])

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return 'phone-portrait-outline'
      case 'web':
        return 'laptop-outline'
      case 'tablet':
        return 'tablet-landscape-outline'
      default:
        return 'phone-portrait-outline'
    }
  }

  const handleLogoutSession = (sessionId: string) => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión en este dispositivo?',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          onPress: () => {
            setSessions(sessions.filter(s => s.id !== sessionId))
            Alert.alert('Éxito', 'Sesión cerrada en el dispositivo')
          },
          style: 'destructive'
        }
      ]
    )
  }

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Sesiones Activas</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Welcome Section */}
        <View style={styles.section}>
          <View style={styles.welcomeBox}>
            <Ionicons name="phone-landscape-outline" size={48} color={COLORS.primary} />
            <Text style={styles.welcomeTitle}>Gestiona tus Dispositivos</Text>
            <Text style={styles.welcomeText}>
              Aquí puedes ver y controlar todos los dispositivos conectados a tu cuenta
            </Text>
          </View>
        </View>

        {/* Current Session Highlight */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sesión Actual</Text>
          {sessions.filter(s => s.isCurrent).map((session) => (
            <View key={session.id} style={[styles.sessionCard, styles.currentSession]}>
              <View style={styles.sessionTop}>
                <View style={styles.deviceIconBox}>
                  <Ionicons
                    name={getDeviceIcon(session.deviceType) as any}
                    size={28}
                    color={COLORS.background}
                  />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.deviceName}>{session.deviceName}</Text>
                  <Text style={styles.osVersion}>{session.osVersion}</Text>
                </View>
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Actual</Text>
                </View>
              </View>
              <View style={styles.sessionDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>{session.location}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>{session.lastActive}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Other Active Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Otros Dispositivos ({sessions.filter(s => !s.isCurrent).length})
          </Text>
          {sessions.filter(s => !s.isCurrent).map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionTop}>
                <View style={[styles.deviceIconBox, { backgroundColor: COLORS.textTertiary }]}>
                  <Ionicons
                    name={getDeviceIcon(session.deviceType) as any}
                    size={24}
                    color={COLORS.background}
                  />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.deviceName}>{session.deviceName}</Text>
                  <Text style={styles.osVersion}>{session.osVersion}</Text>
                </View>
              </View>
              <View style={styles.sessionDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>{session.location}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>{session.lastActive}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => handleLogoutSession(session.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={16} color={COLORS.error} />
                <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Security Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consejos de Seguridad</Text>
          
          <View style={styles.tipCard}>
            <Ionicons name="warning-outline" size={20} color={COLORS.error} />
            <Text style={styles.tipText}>
              Si no reconoces un dispositivo, ciérralo inmediatamente y cambia tu contraseña
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
            <Text style={styles.tipText}>
              Revisa regularmente esta lista para asegurar que solo tus dispositivos tienen acceso
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.success} />
            <Text style={styles.tipText}>
              Usa contraseñas fuertes y única para cada dispositivo cuando sea posible
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              La ubicación se calcula aproximadamente basada en la dirección IP. La lista se actualiza en tiempo real.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  welcomeBox: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  welcomeTitle: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  welcomeText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  currentSession: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  deviceIconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sessionInfo: {
    flex: 1,
  },
  deviceName: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  osVersion: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  currentBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  currentBadgeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 11,
  },
  sessionDetails: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.lg,
  },
  logoutButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  tipText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '08',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  infoText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    flex: 1,
    lineHeight: 18,
  },
})
