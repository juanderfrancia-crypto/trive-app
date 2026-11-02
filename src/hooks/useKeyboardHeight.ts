import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

/**
 * Alto real del teclado en pantalla, medido con los eventos del sistema en vez
 * de confiado al redimensionamiento automático de KeyboardAvoidingView — ese
 * redimensionamiento no ocurre dentro de un <Modal> nativo de RN en Android
 * (su propia ventana, menos aún con edgeToEdgeEnabled en app.json), lo que
 * dejaba campos de texto tapados o "pegados" arriba después de cerrar el teclado.
 *
 * `active` debe reflejar el `visible` del Modal que lo usa, para dejar de
 * escuchar y resetear a 0 cuando se cierra (si no, un teclado abierto en la
 * pantalla de atrás dejaría la próxima apertura ya con el valor puesto).
 */
export function useKeyboardHeight(active: boolean): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!active) {
      setHeight(0)
      return
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates?.height ?? 0))
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [active])

  return height
}
