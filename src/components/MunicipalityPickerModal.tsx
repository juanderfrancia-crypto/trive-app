import { useState, useMemo } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, StatusBar,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import { COLOMBIA_MUNICIPALITIES, Municipality } from '../data/colombiaMunicipalities'

interface Props {
  visible: boolean
  current?: string | null
  onSelect: (municipality: Municipality) => void
  onClose: () => void
}

export function MunicipalityPickerModal({ visible, current, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COLOMBIA_MUNICIPALITIES
    return COLOMBIA_MUNICIPALITIES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q)
    )
  }, [query])

  const handleSelect = (item: Municipality) => {
    onSelect(item)
    setQuery('')
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Elige tu municipio</Text>
            <Text style={styles.sub}>Filtra los viajes disponibles en tu zona</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar municipio o departamento..."
            placeholderTextColor={COLORS.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.department}-${item.name}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => {
            const isSelected = item.name === current
            return (
              <TouchableOpacity
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemDept}>{item.department}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={36} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>Sin resultados para "{query}"</Text>
            </View>
          }
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0E1C4E' },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F4F6FB', borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg, marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, paddingVertical: 11 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F8F9FF',
  },
  itemSelected: { backgroundColor: '#EEF2FF' },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  itemNameSelected: { fontWeight: '700', color: COLORS.primary },
  itemDept: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
})
