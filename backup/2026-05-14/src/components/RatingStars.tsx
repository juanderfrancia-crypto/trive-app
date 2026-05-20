import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface RatingStarsProps {
  rating: number
  size?: number
  color?: string
  showText?: boolean
}

/**
 * Component para mostrar rating en estrellas
 * @param rating - Rating de 0-5
 * @param size - Tamaño de las estrellas (default: 16)
 * @param color - Color de las estrellas (default: #FFD700 - gold)
 * @param showText - Si mostrar el número también (default: true)
 */
export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  size = 16,
  color = '#FFD700',
  showText = true,
}) => {
  // Redondear a media estrella
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <View style={styles.container}>
      {/* Full stars */}
      {Array(fullStars)
        .fill(0)
        .map((_, i) => (
          <Ionicons key={`full-${i}`} name="star" size={size} color={color} />
        ))}

      {/* Half star */}
      {hasHalfStar && (
        <Ionicons key="half" name="star-half" size={size} color={color} />
      )}

      {/* Empty stars */}
      {Array(emptyStars)
        .fill(0)
        .map((_, i) => (
          <Ionicons
            key={`empty-${i}`}
            name="star-outline"
            size={size}
            color={color}
          />
        ))}

      {/* Text */}
      {showText && (
        <Text style={[styles.text, { marginLeft: 4 }]}>
          {rating > 0 ? rating.toFixed(1) : 'Sin rating'}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
})
