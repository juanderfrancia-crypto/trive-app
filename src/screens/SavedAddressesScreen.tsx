import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import { COLORS, SPACING, TYPOGRAPHY } from '../theme/theme'

interface SavedAddress {
  id: string
  user_id: string
  label: string
  address: string
  latitude?: number
  longitude?: number
  is_home: boolean
  is_work: boolean
  created_at: string
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

  const handleSave = async () => {
    if (!label.trim() || !address.trim()) {
      Alert.alert('Error', 'Por favor completa tous los campos')
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

      // Reset form
      setLabel('')
      setAddress('')
      setIsHome(false)
      setIsWork(false)
      setEditingId(null)
      setShowForm(false)

      Alert.alert('Éxito', editingId ? 'Dirección actualizada' : 'Dirección guardada')
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
    setIsHome(addressItem.is_home)
    setIsWork(addressItem.is_work)
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
              .eq('user_id', user?.id)

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    title: {
      fontSize: TYPOGRAPHY.size.lg,
      fontWeight: TYPOGRAPHY.weight.bold,
      color: COLORS.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    addBtn: {
      backgroundColor: COLORS.primary,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
    },
    addBtnText: {
      color: COLORS.textInverse,
      fontWeight: TYPOGRAPHY.weight.bold,
      fontSize: TYPOGRAPHY.size.sm,
    },
    listContainer: {
      padding: SPACING.md,
    },
    addressCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.primary,
    },
    addressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    addressLabel: {
      fontSize: TYPOGRAPHY.size.sm,
      fontWeight: TYPOGRAPHY.weight.bold,
      color: COLORS.primary,
      flex: 1,
    },
    badgesContainer: {
      flexDirection: 'row',
      gap: SPACING.xs,
    },
    badge: {
      backgroundColor: COLORS.primary + '20',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: TYPOGRAPHY.weight.bold,
      color: COLORS.primary,
    },
    addressText: {
      fontSize: TYPOGRAPHY.size.sm,
      color: COLORS.textSecondary,
      marginBottom: SPACING.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
    },
    editBtn: {
      backgroundColor: COLORS.primary + '20',
    },
    deleteBtn: {
      backgroundColor: COLORS.error + '20',
    },
    editBtnText: {
      color: COLORS.primary,
      fontSize: TYPOGRAPHY.size.xs,
      fontWeight: TYPOGRAPHY.weight.bold,
    },
    deleteBtnText: {
      color: COLORS.error,
      fontSize: TYPOGRAPHY.size.xs,
      fontWeight: TYPOGRAPHY.weight.bold,
    },
    form: {
      backgroundColor: COLORS.surface,
      padding: SPACING.lg,
      margin: SPACING.md,
      borderRadius: 12,
      marginBottom: SPACING.lg,
    },
    formTitle: {
      fontSize: TYPOGRAPHY.size.md,
      fontWeight: TYPOGRAPHY.weight.bold,
      color: COLORS.textPrimary,
      marginBottom: SPACING.md,
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 8,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.md,
      backgroundColor: COLORS.background,
      color: COLORS.textPrimary,
      fontSize: TYPOGRAPHY.size.sm,
    },
    checkboxContainer: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    checkbox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      backgroundColor: COLORS.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    checkboxText: {
      flex: 1,
      fontSize: TYPOGRAPHY.size.sm,
      color: COLORS.textPrimary,
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    saveBtn: {
      flex: 1,
      backgroundColor: COLORS.primary,
      paddingVertical: SPACING.md,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnText: {
      color: COLORS.textInverse,
      fontWeight: TYPOGRAPHY.weight.bold,
      fontSize: TYPOGRAPHY.size.sm,
    },
    cancelBtn: {
      flex: 1,
      backgroundColor: COLORS.border,
      paddingVertical: SPACING.md,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      color: COLORS.textPrimary,
      fontWeight: TYPOGRAPHY.weight.bold,
      fontSize: TYPOGRAPHY.size.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: SPACING.md,
    },
    emptyText: {
      fontSize: TYPOGRAPHY.size.md,
      color: COLORS.textSecondary,
      textAlign: 'center',
    },
  })

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>📍 Mis Direcciones</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setLabel('')
            setAddress('')
            setIsHome(false)
            setIsWork(false)
            setEditingId(null)
            setShowForm(!showForm)
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.textInverse} />
          <Text style={styles.addBtnText}>
            {showForm ? 'Cancelar' : 'Añadir dirección'}
          </Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {editingId ? 'Editar dirección' : 'Nueva dirección'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: Casa, Oficina, etc."
            placeholderTextColor={COLORS.textTertiary}
            value={label}
            onChangeText={setLabel}
          />

          <TextInput
            style={[styles.input, { minHeight: 50 }]}
            placeholder="Ej: Calle 5 #10-20, Apto 305"
            placeholderTextColor={COLORS.textTertiary}
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, isHome && { borderColor: COLORS.primary }]}
              onPress={() => setIsHome(!isHome)}
            >
              <Ionicons
                name={isHome ? 'checkbox' : 'checkbox-outline'}
                size={18}
                color={isHome ? COLORS.primary : COLORS.textTertiary}
              />
              <Text style={styles.checkboxText}>Casa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkbox, isWork && { borderColor: COLORS.primary }]}
              onPress={() => setIsWork(!isWork)}
            >
              <Ionicons
                name={isWork ? 'checkbox' : 'checkbox-outline'}
                size={18}
                color={isWork ? COLORS.primary : COLORS.textTertiary}
              />
              <Text style={styles.checkboxText}>Trabajo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowForm(false)
                setEditingId(null)
              }}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Actualizar' : 'Guardar'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {addresses.length > 0 ? (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressLabel}>{item.label}</Text>
                <View style={styles.badgesContainer}>
                  {item.is_home && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>CASA</Text>
                    </View>
                  )}
                  {item.is_work && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>TRABAJO</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.addressText}>{item.address}</Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => handleEdit(item)}
                >
                  <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  <Text style={styles.editBtnText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash" size={16} color={COLORS.error} />
                  <Text style={styles.deleteBtnText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>
            No tienes direcciones guardadas{'\n'}
            Añade direcciones frecuentes para ahorrar tiempo
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}
