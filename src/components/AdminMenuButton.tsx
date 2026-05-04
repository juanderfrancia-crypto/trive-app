import { useState } from 'react'
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
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

interface AdminMenuButtonProps {
  onAdminDocumentsPress?: () => void
}

export default function AdminMenuButton({ onAdminDocumentsPress }: AdminMenuButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAppStore()
  const insets = useSafeAreaInsets()

  const isAdmin = user?.is_admin === true

  if (!isAdmin) {
    return null
  }

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
      </TouchableOpacity>

      <Modal
        visible={isMenuOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContent, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADMINISTRACIÓN</Text>
              <TouchableOpacity
                onPress={() => setIsMenuOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
              {/* Admin Options */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleAdminDocumentsPress}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemLabel}>Verificar Documentos</Text>
                  <Text style={styles.menuItemDesc}>Revisar documentos de conductores</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </ScrollView>

            {/* Footer */}
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
  menuItemText: {
    flex: 1,
    marginHorizontal: SPACING.md,
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
