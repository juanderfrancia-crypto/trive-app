import React from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, ViewStyle } from 'react-native'

interface Props {
  children: React.ReactNode
  style?: ViewStyle
  /** Separación extra entre el teclado y el campo enfocado (p. ej. si hay un header fijo encima). */
  extraOffset?: number
  /** false para sheets centrados/al fondo (justifyContent:'flex-end') que deben
   * conservar su alto de contenido en vez de estirarse a toda la pantalla. */
  fill?: boolean
}

// Mismo patrón que ya usaba LoginPhoneScreen: "padding" funciona en los dos
// sistemas (incluido Android con edgeToEdgeEnabled, donde el resize automático
// del sistema ya no es confiable). Envolver cualquier formulario con esto evita
// que el teclado tape el campo que se está llenando.
export default function KeyboardAvoidingScreen({ children, style, extraOffset = 0, fill = true }: Props) {
  return (
    <KeyboardAvoidingView
      style={[fill && styles.flex, style]}
      behavior="padding"
      keyboardVerticalOffset={(Platform.OS === 'ios' ? 0 : 24) + extraOffset}
    >
      {children}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
