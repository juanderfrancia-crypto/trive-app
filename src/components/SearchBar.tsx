import React from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../theme/theme'

interface SearchBarProps {
  searchText: string
  onSearchChange: (text: string) => void
  onClear: () => void
  matchCount?: number
  totalCount?: number
}

export const SearchBar = ({
  searchText,
  onSearchChange,
  onClear,
  matchCount = 0,
  totalCount = 0,
}: SearchBarProps) => {
  const iconName: any = matchCount > 0 ? 'checkmark-circle' : 'close-circle'
  
  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Buscar en chat..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchText}
          onChangeText={onSearchChange}
          returnKeyType="done"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {searchText.length > 0 && (
        <View style={styles.resultCounter}>
          {/* @ts-ignore - Ionicons conditional name */}
          <Ionicons name="locate" size={14} color={COLORS.primary} />
          <View style={styles.counterText}>
            {/* @ts-ignore - Ionicons conditional name */}
            <Ionicons
              name={iconName}
              size={14}
              color={matchCount > 0 ? COLORS.success : COLORS.textTertiary}
            />
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    height: 40,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
    padding: 0,
  },
  clearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  resultCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  counterText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
  },
})
