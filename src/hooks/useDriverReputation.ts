import { useState, useEffect } from 'react'
import {
  getDriverReputation,
  DriverReputation,
  checkAndUnlockAchievements,
} from '../services/driverReputation'

interface UseDriverReputationReturn {
  reputation: DriverReputation | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to get driver reputation data with caching
 */
export const useDriverReputation = (driverId: string): UseDriverReputationReturn => {
  const [reputation, setReputation] = useState<DriverReputation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get reputation
      const rep = await getDriverReputation(driverId)
      if (!rep) throw new Error('Could not load reputation data')

      setReputation(rep)

      // Check and unlock achievements
      await checkAndUnlockAchievements(driverId)

      // Refetch to get updated achievements
      const updatedRep = await getDriverReputation(driverId)
      if (updatedRep) {
        setReputation(updatedRep)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('useDriverReputation error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (driverId) {
      refetch()
    }
  }, [driverId])

  return { reputation, loading, error, refetch }
}
