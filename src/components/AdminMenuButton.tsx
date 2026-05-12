import { useState, useEffect } from 'react'
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppStore } from '../store/useAppStore'
import { getPendingDocumentsCount } from '../services/driverDocuments'
import { supabase } from '../services/supabase'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

interface AdminMenuButtonProps {
  onAdminDocumentsPress?: () => void
}

export default function AdminMenuButton({ onAdminDocumentsPress }: AdminMenuButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const { user } = useAppStore()
  const insets = useSafeAreaInsets()

  const isAdmin = user?.is_admin === true

  useEffect(() => {
    if (!isAdmin) return

    getPendingDocumentsCount().then(setPendingCount)

    // Actualizar el badge en tiempo real cuando lleguen nuevos documentos
    const channel = supabase
      .channel('admin_badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_documents' },
        () => getPendingDocumentsCount().then(setPendingCount)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isAdmin])

  if (!isAdmin) return null

  const handleAdminDocumentsPress = () => {
    setIsMenuOpen(false)
    onAdminDocumentsPress?.()
  }

  return (
    <>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setIsMenuOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="menu" size={24} color={COLORS.primary} />
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {pendingCount > 99 ? '99+' : pendingCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isMenuOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContent, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADMINISTRACIÓN</Text>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleAdminDocumentsPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconWrap}>
                  <Ionicons name="document-text" size={24} color={COLORS.primary} />
                  {pendingCount > 0 && (
                    <View style={styles.itemBadge}>
                      <Text style={styles.itemBadgeText}>
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemLabel}>Verificar Documentos</Text>
                  <Text style={styles.menuItemDesc}>
                    {pendingCount > 0
                      ? `${pendingCount} documento${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`
                      : 'Revisar documentos de conductores'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.footerText}>Conectado como: {user?.email}</Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000040',
  },
  modalContent: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  menuList: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  menuIconWrap: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  itemBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  itemBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  menuItemDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  modalFooter: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
})
