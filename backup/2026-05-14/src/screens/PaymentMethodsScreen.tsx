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
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'
import { COLORS, SPACING, TYPOGRAPHY } from '../theme/theme'

interface PaymentMethod {
  id: string
  user_id: string
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'digital_wallet'
  label: string
  last_four: string
  is_default: boolean
  created_at: string
}

export default function PaymentMethodsScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCVV, setCardCVV] = useState('')
  const [saving, setSaving] = useState(false)
  const [paymentType, setPaymentType] = useState<'credit_card' | 'debit_card' | 'bank_account' | 'digital_wallet'>('credit_card')
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    // Solo cargar una vez cuando tengamos user.id
    if (user?.id && !loadedOnce) {
      loadPaymentMethods()
    }
  }, [user?.id, loadedOnce])

  const loadPaymentMethods = async () => {
    if (!user?.id || loadedOnce) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading payment methods:', error)
        // No mostrar alert aquí, solo setear métodos vacío si es primer intento
        setMethods([])
      } else {
        setMethods(data || [])
      }
      
      setLoadedOnce(true)
    } catch (err) {
      console.error('Error loading payment methods:', err)
      setMethods([])
      setLoadedOnce(true)
    } finally {
      setLoading(false)
    }
  }

  const validateCardNumber = (number: string) => {
    const cleaned = number.replace(/\D/g, '')
    return cleaned.length >= 13 && cleaned.length <= 19
  }

  const getCardType = (number: string) => {
    const cleaned = number.replace(/\D/g, '')
    if (/^4/.test(cleaned)) return 'Visa'
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard'
    if (/^3[47]/.test(cleaned)) return 'American Express'
    return 'Tarjeta'
  }

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '')
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const handleSave = async () => {
    if (paymentType === 'credit_card' || paymentType === 'debit_card') {
      if (!cardNumber.trim() || !cardName.trim() || !cardExpiry.trim() || !cardCVV.trim()) {
        Alert.alert('Error', 'Por favor completa todos los campos')
        return
      }

      if (!validateCardNumber(cardNumber)) {
        Alert.alert('Error', 'Número de tarjeta inválido')
        return
      }
    }

    if (!user?.id) return

    try {
      setSaving(true)
      const lastFour = cardNumber.replace(/\D/g, '').slice(-4)

      const { data, error } = await supabase.from('payment_methods').insert({
        user_id: user.id,
        type: paymentType,
        label: cardName,
        last_four: lastFour,
        is_default: methods.length === 0,
      }).select().single()

      if (error) throw error

      // Actualizar estado local inmediatamente (no llamar loadPaymentMethods)
      setMethods([data as PaymentMethod, ...methods])

      // Reset form
      setCardNumber('')
      setCardName('')
      setCardExpiry('')
      setCardCVV('')
      setPaymentType('credit_card')
      setShowForm(false)

      Alert.alert('Éxito', 'Método de pago agregado')
    } catch (err) {
      console.error('Error saving payment method:', err)
      Alert.alert('Error', 'No se pudo guardar el método de pago')
    } finally {
      setSaving(false)
    }
  }

  const setAsDefault = async (methodId: string) => {
    if (!user?.id) return

    try {
      // Remover default de todos
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)

      // Establecer como default
      await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId)

      // Actualizar estado local inmediatamente (no llamar loadPaymentMethods)
      setMethods(
        methods.map((m) => ({
          ...m,
          is_default: m.id === methodId,
        }))
      )

      Alert.alert('Éxito', 'Método de pago establecido como predeterminado')
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar')
    }
  }

  const handleDelete = (methodId: string) => {
    Alert.alert('Eliminar método de pago', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase
              .from('payment_methods')
              .delete()
              .eq('id', methodId)
              .eq('user_id', user?.id)

            // Actualizar estado local inmediatamente (no llamar loadPaymentMethods)
            setMethods(methods.filter((m) => m.id !== methodId))
            Alert.alert('Éxito', 'Método de pago eliminado')
          } catch (err) {
            Alert.alert('Error', 'No se pudo eliminar')
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
    methodCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.primary,
    },
    methodHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    methodLabel: {
      fontSize: TYPOGRAPHY.size.sm,
      fontWeight: TYPOGRAPHY.weight.bold,
      color: COLORS.primary,
      flex: 1,
    },
    defaultBadge: {
      backgroundColor: COLORS.success + '20',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: TYPOGRAPHY.weight.bold,
      color: COLORS.success,
    },
    methodInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    methodType: {
      fontSize: TYPOGRAPHY.size.sm,
      color: COLORS.textSecondary,
      flex: 1,
    },
    lastFour: {
      fontSize: TYPOGRAPHY.size.sm,
      fontWeight: TYPOGRAPHY.weight.bold,
      color: COLORS.textPrimary,
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
    defaultBtn: {
      backgroundColor: COLORS.success + '20',
    },
    deleteBtn: {
      backgroundColor: COLORS.error + '20',
    },
    actionBtnText: {
      fontSize: TYPOGRAPHY.size.xs,
      fontWeight: TYPOGRAPHY.weight.bold,
    },
    defaultBtnText: {
      color: COLORS.success,
    },
    deleteBtnText: {
      color: COLORS.error,
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
    typeSelector: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    },
    typeOption: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
    },
    typeOptionActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    typeOptionText: {
      fontSize: TYPOGRAPHY.size.xs,
      fontWeight: TYPOGRAPHY.weight.bold,
      color: COLORS.textPrimary,
    },
    typeOptionTextActive: {
      color: COLORS.textInverse,
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
    row: {
      flexDirection: 'row',
      gap: SPACING.md,
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
    infoBox: {
      backgroundColor: COLORS.primary + '10',
      borderLeftWidth: 4,
      borderLeftColor: COLORS.primary,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderRadius: 8,
      marginBottom: SPACING.md,
    },
    infoText: {
      fontSize: TYPOGRAPHY.size.xs,
      color: COLORS.primary,
      fontWeight: TYPOGRAPHY.weight.semibold,
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
        <Text style={styles.title}>💳 Métodos de Pago</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setCardNumber('')
            setCardName('')
            setCardExpiry('')
            setCardCVV('')
            setPaymentType('credit_card')
            setShowForm(!showForm)
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.textInverse} />
          <Text style={styles.addBtnText}>
            {showForm ? 'Cancelar' : 'Agregar tarjeta'}
          </Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Nueva tarjeta</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🔒 Tus datos de pago están encriptados y seguros
            </Text>
          </View>

          <Text style={{ ...TYPOGRAPHY.label, marginBottom: SPACING.sm }}>Tipo de tarjeta</Text>
          <View style={styles.typeSelector}>
            {[
              { label: 'Crédito', value: 'credit_card' as const },
              { label: 'Débito', value: 'debit_card' as const },
            ].map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.typeOption, paymentType === type.value && styles.typeOptionActive]}
                onPress={() => setPaymentType(type.value)}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    paymentType === type.value && styles.typeOptionTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Nombre titular"
            placeholderTextColor={COLORS.textTertiary}
            value={cardName}
            onChangeText={setCardName}
          />

          <TextInput
            style={styles.input}
            placeholder="Número de tarjeta"
            placeholderTextColor={COLORS.textTertiary}
            value={formatCardNumber(cardNumber)}
            onChangeText={(text) => setCardNumber(text.replace(/\D/g, ''))}
            keyboardType="numeric"
            maxLength={19}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="MM/YY"
              placeholderTextColor={COLORS.textTertiary}
              value={cardExpiry}
              onChangeText={setCardExpiry}
              keyboardType="numeric"
              maxLength={5}
            />

            <TextInput
              style={[styles.input, { flex: 0.8 }]}
              placeholder="CVV"
              placeholderTextColor={COLORS.textTertiary}
              value={cardCVV}
              onChangeText={setCardCVV}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
            />
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowForm(false)
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
                <Text style={styles.saveBtnText}>Agregar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {methods.length > 0 ? (
        <FlatList
          data={methods}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <Text style={styles.methodLabel}>{item.label}</Text>
                {item.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.badgeText}>PREDETERMINADA</Text>
                  </View>
                )}
              </View>

              <View style={styles.methodInfo}>
                <Ionicons name="card-outline" size={16} color={COLORS.primary} />
                <Text style={styles.methodType}>
                  {item.type === 'credit_card' ? 'Tarjeta de Crédito' : 'Tarjeta de Débito'}
                </Text>
                <Text style={styles.lastFour}>•••• {item.last_four}</Text>
              </View>

              <View style={styles.actions}>
                {!item.is_default && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.defaultBtn]}
                    onPress={() => setAsDefault(item.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
                    <Text style={[styles.actionBtnText, styles.defaultBtnText]}>
                      Predeterminada
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash" size={16} color={COLORS.error} />
                  <Text style={[styles.actionBtnText, styles.deleteBtnText]}>
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyText}>
            No tienes métodos de pago{'\n'}
            Agrega una tarjeta para comenzar
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}
