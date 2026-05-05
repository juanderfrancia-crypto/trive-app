import React, { Component, ReactNode } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  private reset = () => this.setState({ hasError: false, error: null })

  private friendlyMessage(error: Error): string {
    const msg = error.message || ''
    if (msg.includes('Network') || msg.includes('fetch'))
      return 'Problema de conexión. Verifica tu internet.'
    if (msg.includes('auth') || msg.includes('Auth'))
      return 'Sesión expirada. Inicia sesión de nuevo.'
    if (msg.includes('Database') || msg.includes('FOREIGN'))
      return 'Error en la base de datos. Intenta de nuevo.'
    return 'Ocurrió un error inesperado.'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.icon}>⚠️</Text>
          <Text style={s.title}>Algo salió mal</Text>
          <Text style={s.message}>
            {this.state.error ? this.friendlyMessage(this.state.error) : 'Error desconocido'}
          </Text>
          <Text style={s.hint}>
            • Verifica tu conexión{'\n'}
            • Cierra y abre la app{'\n'}
            • Si persiste, contacta soporte
          </Text>
          <TouchableOpacity style={s.btn} onPress={this.reset}>
            <Text style={s.btnText}>↻ Intentar de nuevo</Text>
          </TouchableOpacity>
          {__DEV__ && this.state.error && (
            <View style={s.devBox}>
              <Text style={s.devText}>{this.state.error.toString()}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    )
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  icon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#2C3E50', textAlign: 'center', marginBottom: 12 },
  message: {
    fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20,
    backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#FF6B6B', marginBottom: 16,
  },
  hint: {
    fontSize: 13, color: '#555', lineHeight: 22,
    backgroundColor: '#F0F7FF', borderRadius: 8, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#3498DB', marginBottom: 24,
  },
  btn: {
    backgroundColor: '#3498DB', borderRadius: 8,
    paddingVertical: 13, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  devBox: {
    marginTop: 20, backgroundColor: '#F8F9FA',
    borderRadius: 6, padding: 10,
  },
  devText: { fontSize: 11, color: '#E74C3C', fontFamily: 'monospace' },
})
