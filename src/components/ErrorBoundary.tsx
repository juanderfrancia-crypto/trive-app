/**
 * Global Error Boundary Component
 * Catches errors across the entire app and displays user-friendly messages
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary Caught:', error);
    console.error('Component Stack:', errorInfo.componentStack);

    // Incrementar contador de errores
    this.setState(prev => ({
      errorCount: prev.errorCount + 1,
    }));

    // Mostrar toast con error
    Toast.show({
      type: 'error',
      text1: 'Algo salio mal',
      text2: this.getErrorMessage(error),
      visibilityTime: 4000,
    });

    // Si hay demasiados errores, podría intentar reload
    if (this.state.errorCount > 5) {
      console.warn('⚠️ Múltiples errores detectados - considera reiniciar la app');
    }
  }

  private getErrorMessage(error: Error): string {
    const errorMessage = error.message || 'Error desconocido';

    // Mensajes amigables según tipo de error
    if (errorMessage.includes('Network')) {
      return 'Problema de conexión - verifica tu internet';
    }
    if (errorMessage.includes('AuthError') || errorMessage.includes('auth')) {
      return 'Sesión expirada - por favor inicia sesión de nuevo';
    }
    if (errorMessage.includes('Database') || errorMessage.includes('FOREIGN')) {
      return 'Error en la base de datos - intenta de nuevo más tarde';
    }
    if (errorMessage.includes('Payment')) {
      return 'Problema al procesar el pago - intenta de nuevo';
    }
    if (errorMessage.includes('File')) {
      return 'Problema al procesar el archivo - asegúrate del formato y tamaño';
    }

    // Mensaje genérico si el específico es muy largo
    if (errorMessage.length > 80) {
      return 'Ocurrió un error inesperado - intenta de nuevo';
    }

    return errorMessage;
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Algo salió mal</Text>
              
              <View style={styles.errorDetails}>
                <Text style={styles.errorMessage}>
                  {this.state.error?.message || 'Error desconocido'}
                </Text>
              </View>

              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>Qué puedes hacer:</Text>
                <Text style={styles.suggestion}>• Intenta recargar la pantalla</Text>
                <Text style={styles.suggestion}>• Verifica tu conexión a internet</Text>
                <Text style={styles.suggestion}>• Cierra y abre la app de nuevo</Text>
                <Text style={styles.suggestion}>• Si persiste, contacta a soporte</Text>
              </View>

              <View style={styles.actions}>
                <View style={[styles.button, styles.retryButton]}>
                  <Text
                    style={styles.retryButtonText}
                    onPress={this.handleReset}
                  >
                    ↻ Intentar de nuevo
                  </Text>
                </View>
              </View>

              {__DEV__ && (
                <View style={styles.devInfo}>
                  <Text style={styles.devTitle}>Developer Info:</Text>
                  <Text style={styles.devError}>{this.state.error?.toString()}</Text>
                  <Text style={styles.devStack}>
                    {this.state.error?.stack}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  errorBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  errorMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  suggestions: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#3498DB',
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  suggestion: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 4,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#3498DB',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  devInfo: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  devTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 8,
  },
  devError: {
    fontSize: 11,
    color: '#E74C3C',
    fontFamily: 'monospace',
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 4,
  },
  devStack: {
    fontSize: 10,
    color: '#7F8C8D',
    fontFamily: 'monospace',
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 4,
    maxHeight: 200,
  },
});
