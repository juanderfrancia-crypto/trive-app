import { Component, type ReactNode } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Text } from './AppText'
import { COLORS, SPACING, RADIUS } from '../theme/theme'
import Illustration from './illustrations/Illustration'

type Props = { children: ReactNode }
type State = { hasError: boolean }

// Captura errores de render para que un fallo en una pantalla no cierre la app
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary:', error)
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <View style={styles.container}>
        <Illustration name="warning" width={180} />
        <Text style={styles.title}>Algo salió mal</Text>
        <Text style={styles.message}>
          Tuvimos un problema inesperado. Intenta de nuevo; si sigue pasando, cierra y vuelve a abrir la app.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
  },
  buttonText: {
    color: COLORS.surface,
    fontWeight: '600',
    fontSize: 15,
  },
})
