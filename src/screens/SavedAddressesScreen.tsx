import { useEffect, useState } from 'react'
import { View, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, StatusBar, ScrollView } from 'react-native'
import { Text } from '../components/AppText'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon, { type IconName } from '../components/Icon'
import Illustration from '../components/illustrations/Illustration'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme/theme'
import KeyboardAvoidingScreen from '../components/KeyboardAvoidingScreen'

interface SavedAddress {
  id: string
  user_id: string
  label: string
  address: string
  latitude?: number | null
  longitude?: number | null
  is_home: boolean | null
  is_work: boolean | null
  created_at: string | null
}

export default function SavedAddressesScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState('')
  const [isHome, setIsHome] = useState(false)
  const [isWork, setIsWork] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.id && !loadedOnce) {
      loadAddresses()
    } else if (!user?.id) {
      setLoading(false)
    }
  }, [user?.id, loadedOnce])

  const loadAddresses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
      setLoadedOnce(true)
    } catch (err) {
      console.error('Error loading addresses:', err)
      Alert.alert('Error', 'No se pueden cargar las direcciones')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setLabel('')
    setAddress('')
    setIsHome(false)
    setIsWork(false)
    setEditingId(null)
  }

  const toggleForm = () => {
    resetForm()
    setShowForm(!showForm)
  }

  const handleSave = async () => {
    if (!label.trim() || !address.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos')
      return
    }

    if (!user?.id) return

    try {
      setSaving(true)

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('saved_addresses')
          .update({
            label,
            address,
            is_home: isHome,
            is_work: isWork,
          })
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error

        // Optimistic update
        setAddresses(
          addresses.map((addr) =>
            addr.id === editingId
              ? {
                  ...addr,
                  label,
                  address,
                  is_home: isHome,
                  is_work: isWork,
                }
              : addr
          )
        )
      } else {
        // Create
        const { data, error } = await supabase
          .from('saved_addresses')
          .insert({
            user_id: user.id,
            label,
            address,
            is_home: isHome,
            is_work: isWork,
          })
          .select()
          .single()

        if (error) throw error

        // Optimistic update - prepend new address
        if (data) {
          setAddresses([data, ...addresses])
        }
      }

      resetForm()
      setShowForm(false)

      Alert.alert('Listo', editingId ? 'Dirección actualizada' : 'Dirección guardada')
    } catch (err) {
      console.error('Error saving address:', err)
      Alert.alert('Error', 'No se pudo guardar la dirección')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (addressItem: SavedAddress) => {
    setLabel(addressItem.label)
    setAddress(addressItem.address)
    setIsHome(addressItem.is_home ?? false)
    setIsWork(addressItem.is_work ?? false)
    setEditingId(addressItem.id)
    setShowForm(true)
  }

  const handleDelete = (addressId: string) => {
    Alert.alert('Eliminar dirección', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('saved_addresses')
              .delete()
              .eq('id', addressId)
              .eq('user_id', user?.id ?? '')

            if (error) throw error

            // Optimistic update - remove from list
            setAddresses(addresses.filter((addr) => addr.id !== addressId))
          } catch (err) {
            Alert.alert('Error', 'No se pudo eliminar la dirección')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="ChevronLeft" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Direcciones guardadas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={toggleForm} activeOpacity={0.85}>
          <Icon name={showForm ? 'X' : 'CirclePlus'} size={16} color={COLORS.white} />
          <Text style={styles.addBtnText}>{showForm ? 'Cerrar' : 'Agregar'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingScreen>
      {showForm && (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.formTitle}>{editingId ? 'Editar dirección' : 'Nueva dirección'}</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Casa, oficina, la del barrio"
            placeholderTextColor={COLORS.textTertiary}
            value={label}
            onChangeText={setLabel}
          />

          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Ej: Calle 5 #10-20, apto 305"
            placeholderTextColor={COLORS.textTertiary}
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <Text style={styles.label}>Marcar como</Text>
          <View style={styles.tagRow}>
            <TagToggle icon="House" label="Casa" active={isHome} onPress={() => setIsHome(!isHome)} />
            <TagToggle icon="Briefcase" label="Trabajo" active={isWork} onPress={() => setIsWork(!isWork)} />
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowForm(false)
                setEditingId(null)
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>{editingId ? 'Actualizar' : 'Guardar'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      )}
      </KeyboardAvoidingScreen>

      {addresses.length > 0 ? (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const tagIcon: IconName = item.is_home ? 'House' : item.is_work ? 'Briefcase' : 'MapPin'
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Icon name={tagIcon} size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.cardTitleCol}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                    <Text style={styles.cardAddress}>{item.address}</Text>
                  </View>
                </View>

                {(item.is_home || item.is_work) && (
                  <View style={styles.badgeRow}>
                    {item.is_home && <Text style={styles.badge}>Casa</Text>}
                    {item.is_work && <Text style={styles.badge}>Trabajo</Text>}
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)} activeOpacity={0.85}>
                    <Icon name="Pencil" size={15} color={COLORS.primary} />
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)} activeOpacity={0.85}>
                    <Icon name="Trash2" size={15} color={COLORS.error} />
                    <Text style={styles.deleteBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      ) : (
        <View style={styles.empty}>
          <Illustration name="routePlanning" width={170} />
          <Text style={styles.emptyTitle}>Sin direcciones guardadas</Text>
          <Text style={styles.emptyText}>Guarda tus lugares frecuentes para reservar más rápido.</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

function TagToggle({ icon, label, active, onPress }: {
  icon: IconName
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.tag, active && styles.tagActive]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
    >
      <Icon name={icon} size={16} color={active ? COLORS.white : COLORS.textSecondary} />
      <Text style={[styles.tagText, active && styles.tagTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    ...SHADOWS.xs,
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { ...TYPOGRAPHY.h4, flex: 1, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    height: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  addBtnText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.white },

  form: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  formTitle: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  label: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  inputMultiline: { height: 70, paddingTop: SPACING.md, textAlignVertical: 'top' },

  tagRow: { flexDirection: 'row', gap: SPACING.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    height: 40,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  tagActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tagText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textSecondary },
  tagTextActive: { color: COLORS.white },

  buttonGroup: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { ...TYPOGRAPHY.button, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { ...TYPOGRAPHY.button, fontWeight: TYPOGRAPHY.weight.extrabold, color: COLORS.white },
  btnDisabled: { opacity: 0.6 },

  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
  card: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleCol: { flex: 1, gap: 2 },
  cardLabel: { ...TYPOGRAPHY.bodyMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.textPrimary },
  cardAddress: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  badgeRow: { flexDirection: 'row', gap: SPACING.xs },
  badge: {
    ...TYPOGRAPHY.caption,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryTint,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  editBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryTint,
  },
  editBtnText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.primary },
  deleteBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
  },
  deleteBtnText: { ...TYPOGRAPHY.labelMedium, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.error },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.weight.extrabold, marginTop: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center' },
})
