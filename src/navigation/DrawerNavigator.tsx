import { createDrawerNavigator, DrawerNavigationProp } from '@react-navigation/drawer'
import { DrawerNavigationOptions } from '@react-navigation/drawer'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TabNavigator from './TabNavigator'
import AdminDocumentsScreen from '../screens/AdminDocumentsScreen'
import { useAppStore } from '../store/useAppStore'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme/theme'

const Drawer = createDrawerNavigator()

interface DrawerItem {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  screen: string
}

const DRAWER_ITEMS: DrawerItem[] = [
  {
    label: 'Inicio',
    icon: 'home-outline',
    screen: 'HomeStack',
  },
]

const ADMIN_DRAWER_ITEMS: DrawerItem[] = [
  {
    label: 'Verificar Documentos',
    icon: 'document-outline',
    screen: 'AdminDocuments',
  },
]

interface CustomDrawerContentProps {
  navigation: any
  state: any
}

function CustomDrawerContent({ navigation, state }: CustomDrawerContentProps) {
  const insets = useSafeAreaInsets()
  const { user } = useAppStore()
  const isAdmin = user?.is_admin === true

  const mainItems = DRAWER_ITEMS
  const adminItems = isAdmin ? ADMIN_DRAWER_ITEMS : []

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerAvatar}>
            <Ionicons name="person-circle" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.headerName}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.headerEmail}>{user?.email || ''}</Text>
        </View>

        {/* Main Menu Items */}
        <View style={styles.section}>
          {mainItems.map((item) => {
            const isFocused = state.routes[state.index]?.name === item.screen
            return (
              <TouchableOpacity
                key={item.screen}
                style={[
                  styles.drawerItem,
                  isFocused && styles.drawerItemActive,
                ]}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={isFocused ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.drawerItemText,
                    isFocused && styles.drawerItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Admin Section */}
        {adminItems.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ADMINISTRACIÓN</Text>
              {adminItems.map((item) => {
                const isFocused = state.routes[state.index]?.name === item.screen
                return (
                  <TouchableOpacity
                    key={item.screen}
                    style={[
                      styles.drawerItem,
                      isFocused && styles.drawerItemActive,
                    ]}
                    onPress={() => navigation.navigate(item.screen)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={isFocused ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.drawerItemText,
                        isFocused && styles.drawerItemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer Note */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          TRIVE {new Date().getFullYear()}
        </Text>
      </View>
    </View>
  )
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props: any) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: COLORS.surface,
          width: '75%',
        },
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.textSecondary,
        drawerLabelStyle: {
          marginLeft: -16,
        },
      }}
    >
      <Drawer.Screen name="HomeStack" component={TabNavigator} />
      <Drawer.Screen
        name="AdminDocuments"
        component={AdminDocumentsScreen}
        options={{
          title: 'Verificar Documentos',
        }}
      />
    </Drawer.Navigator>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  headerAvatar: {
    marginBottom: SPACING.md,
  },
  headerName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  headerEmail: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  drawerItemActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  drawerItemText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
  },
  drawerItemTextActive: {
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
})
