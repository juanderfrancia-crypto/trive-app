import React from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, View, ViewStyle } from 'react-native'
import { useKeyboardHeight } from '../hooks/useKeyboardHeight'

interface Props {
  children: React.ReactNode
  style?: ViewStyle
  /** Separación extra entre el teclado y el campo enfocado (p. ej. si hay un header fijo encima). */
  extraOffset?: number
  /** false para sheets centrados/al fondo (justifyContent:'flex-end') que deben
   * conservar su alto de contenido en vez de estirarse a toda la pantalla. */
  fill?: boolean
  /** true cuando este componente vive dentro de un <Modal> nativo de RN: en
   * Android un Modal crea su propia ventana, que no se redimensiona sola con
   * el teclado (menos con edgeToEdgeEnabled en app.json) — KeyboardAvoidingView
   * calcula mal el offset ahí adentro y el campo se queda "pegado" arriba
   * después de cerrar el teclado, con un hueco en blanco hasta el fondo. En
   * este modo se mide el alto real del teclado con los eventos del sistema y
   * se aplica como padding inferior, en vez de depender de ese redimensionamiento. */
  measureKeyboard?: boolean
  /** Con measureKeyboard: debe reflejar el `visible` del Modal que lo contiene,
   * para dejar de escuchar y resetear el padding a 0 cuando se cierra. Si se
   * omite, se asume siempre activo. */
  active?: boolean
}

// Mismo patrón que ya usaba LoginPhoneScreen: "padding" funciona en los dos
// sistemas (incluido Android con edgeToEdgeEnabled, donde el resize automático
// del sistema ya no es confiable). Envolver cualquier formulario con esto evita
// que el teclado tape el campo que se está llenando.
//
// Dentro de un <Modal> de RN en Android, ese resize automático directamente no
// ocurre (es su propia ventana) — para esos casos, pasar measureKeyboard.
export default function KeyboardAvoidingScreen({
  children,
  style,
  extraOffset = 0,
  fill = true,
  measureKeyboard = false,
  active = true,
}: Props) {
  const keyboardHeight = useKeyboardHeight(measureKeyboard && active)

  if (measureKeyboard) {
    return <View style={[fill && styles.flex, style, { paddingBottom: keyboardHeight }]}>{children}</View>
  }

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
