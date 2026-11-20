import { View, StyleSheet } from 'react-native'
import Svg, { G, Path, Circle, Polyline } from 'react-native-svg'

// Mismo patrón visual que antes (84 variaciones de Car/Plane/Luggage/MapPin/
// Package/Bus/Bike/Map en cuadrícula), pero dibujado como un solo <Svg> con las
// formas crudas de cada ícono, en vez de 80 componentes <Icon> por separado --
// un solo árbol de componentes en vez de 80 es lo que de verdad evita el frenón
// al abrir el chat (bajar ROWS ya ayudaba, esto es la causa de fondo).
// Formas copiadas de lucide-react-native (Car/Plane/Luggage/MapPin/Package/Bus/Bike/Map),
// cada una en su viewBox nativo de 24x24.
type IconKey = 'Car' | 'Plane' | 'Luggage' | 'MapPin' | 'Package' | 'Bus' | 'Bike' | 'Map'

function IconShape({ icon }: { icon: IconKey }) {
  switch (icon) {
    case 'Car':
      return (
        <>
          <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <Circle cx={7} cy={17} r={2} />
          <Path d="M9 17h6" />
          <Circle cx={17} cy={17} r={2} />
        </>
      )
    case 'Plane':
      return (
        <Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      )
    case 'Luggage':
      return (
        <>
          <Path d="M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2" />
          <Path d="M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" />
          <Path d="M10 20h4" />
          <Circle cx={16} cy={20} r={2} />
          <Circle cx={8} cy={20} r={2} />
        </>
      )
    case 'MapPin':
      return (
        <>
          <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <Circle cx={12} cy={10} r={3} />
        </>
      )
    case 'Package':
      return (
        <>
          <Path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
          <Path d="M12 22V12" />
          <Polyline points="3.29 7 12 12 20.71 7" />
          <Path d="m7.5 4.27 9 5.15" />
        </>
      )
    case 'Bus':
      return (
        <>
          <Path d="M8 6v6" />
          <Path d="M15 6v6" />
          <Path d="M2 12h19.6" />
          <Path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
          <Circle cx={7} cy={18} r={2} />
          <Path d="M9 18h5" />
          <Circle cx={16} cy={18} r={2} />
        </>
      )
    case 'Bike':
      return (
        <>
          <Circle cx={18.5} cy={17.5} r={3.5} />
          <Circle cx={5.5} cy={17.5} r={3.5} />
          <Circle cx={15} cy={5} r={1} />
          <Path d="M12 17.5V14l-3-3 4-3 2 3h2" />
        </>
      )
    case 'Map':
      return (
        <>
          <Path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
          <Path d="M15 5.764v15" />
          <Path d="M9 3.236v15" />
        </>
      )
  }
}

const DOODLE_ICONS: IconKey[] = ['Car', 'Plane', 'Luggage', 'MapPin', 'Package', 'Bus', 'Bike', 'Map']
const COLS = 8
const ROWS = 10
const CELL_W = 68
const CELL_H = 62
// Los íconos originales se mostraban a size=30 en un viewBox nativo de 24x24.
const ICON_SCALE = 30 / 24

const CELLS = (() => {
  const cells: { key: string; left: number; top: number; icon: IconKey }[] = []
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

const WIDTH = COLS * CELL_W
const HEIGHT = ROWS * CELL_H

export default function ChatDoodleBackground() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg
        width={WIDTH}
        height={HEIGHT}
        stroke="#000000"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {CELLS.map((cell) => (
          <G key={cell.key} translate={`${cell.left}, ${cell.top}`} scale={ICON_SCALE}>
            <IconShape icon={cell.icon} />
          </G>
        ))}
      </Svg>
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
