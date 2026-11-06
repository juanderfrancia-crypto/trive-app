import { View, StyleSheet } from 'react-native'
import Icon, { type IconName } from './Icon'

// Fondo de doodles estilo WhatsApp para el chat: una cuadrícula fija, más grande
// que cualquier pantalla real, para que cubra todo el área de mensajes sin
// depender de medir el tamaño del contenedor en tiempo de ejecución.
const DOODLE_ICONS: IconName[] = ['Car', 'Plane', 'Luggage', 'MapPin', 'Package', 'Bus', 'Bike', 'Map']
const COLS = 8
const ROWS = 18
const CELL_W = 68
const CELL_H = 62

const CELLS = (() => {
  const cells: { key: string; left: number; top: number; icon: IconName }[] = []
  let i = 0
  for (let r = 0; r < ROWS; r++) {
    const rowShift = r % 2 === 1 ? CELL_W / 2 : 0
    for (let c = 0; c < COLS; c++) {
      cells.push({
        key: `${r}-${c}`,
        left: c * CELL_W + rowShift - 10,
        top: r * CELL_H - 10,
        icon: DOODLE_ICONS[i % DOODLE_ICONS.length],
      })
      i++
    }
  }
  return cells
})()

export default function ChatDoodleBackground() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={{ width: COLS * CELL_W, height: ROWS * CELL_H }}>
        {CELLS.map((cell) => (
          <Icon
            key={cell.key}
            name={cell.icon}
            size={30}
            color="#000000"
            strokeWidth={1.6}
            style={{ position: 'absolute', left: cell.left, top: cell.top }}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    overflow: 'hidden',
  },
})
