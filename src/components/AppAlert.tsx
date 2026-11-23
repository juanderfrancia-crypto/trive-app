import React, { useEffect, useState } from 'react'
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from './AppText'
import Icon, { IconName } from './Icon'
import { COLORS, RADIUS, SPACING } from '../theme/theme'

type ConfirmOptions = {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  icon?: IconName
  onConfirm?: () => void
  onCancel?: () => void
}

type InfoOptions = {
  title: string
  message?: string
  buttonText?: string
  icon?: IconName
  onClose?: () => void
}

type AlertState =
  | { mode: 'confirm'; opts: ConfirmOptions }
  | { mode: 'info'; opts: InfoOptions }

let showRef: ((state: AlertState) => void) | null = null

// Reemplazo de Alert.alert con la misma identidad del toast (franja/modal
// oscuro, patrón WhatsApp/OS) -- decidido 23-nov-2026. Uso: AppAlert.confirm({...})
// o AppAlert.info({...}) desde cualquier archivo, sin hooks, igual que
// showError()/showSuccess().
export const AppAlert = {
  confirm(opts: ConfirmOptions) {
    showRef?.({ mode: 'confirm', opts })
  },
  info(opts: InfoOptions) {
    showRef?.({ mode: 'info', opts })
  },
}

export default function AppAlertHost() {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<AlertState | null>(null)

  useEffect(() => {
    showRef = (s: AlertState) => {
      setState(s)
      setVisible(true)
    }
    return () => { showRef = null }
  }, [])

  if (!state) return null

  const close = () => setVisible(false)

  if (state.mode === 'info') {
    const opts = state.opts
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.scrim}>
          <View style={styles.card}>
            <View style={styles.iconChip}>
              <Icon name={opts.icon ?? 'Info'} size={18} color={COLORS.statusDarkText} />
            </View>
            <Text style={styles.title}>{opts.title}</Text>
            {!!opts.message && <Text style={styles.message}>{opts.message}</Text>}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { backgroundColor: COLORS.primary }]}
                activeOpacity={0.8}
                onPress={() => { close(); opts.onClose?.() }}
              >
                <Text style={styles.btnPrimaryText}>{opts.buttonText ?? 'Entendido'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  const opts = state.opts
  const accent = opts.destructive ? COLORS.error : COLORS.primary

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.iconChip}>
            <Icon name={opts.icon ?? (opts.destructive ? 'Trash2' : 'Info')} size={18} color={COLORS.statusDarkText} />
          </View>
          <Text style={styles.title}>{opts.title}</Text>
          {!!opts.message && <Text style={styles.message}>{opts.message}</Text>}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btn}
              activeOpacity={0.8}
              onPress={() => { close(); opts.onCancel?.() }}
            >
              <Text style={styles.btnText}>{opts.cancelText ?? 'Cancelar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { backgroundColor: accent }]}
              activeOpacity={0.8}
              onPress={() => { close(); opts.onConfirm?.() }}
            >
              <Text style={styles.btnPrimaryText}>{opts.confirmText ?? 'Aceptar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 26, 46, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.statusDarkSolid,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.statusDarkText,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: COLORS.statusDarkTextSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 19,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md - 2,
    borderWidth: 1,
    borderColor: COLORS.statusDarkBorder,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.statusDarkTextSecondary,
  },
  btnPrimary: {
    borderColor: 'transparent',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.statusDarkText,
  },
})
