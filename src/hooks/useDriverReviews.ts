import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export interface DriverReview {
  id: string
  rating: number
  comment?: string
  created_at: string
  reviewer_name?: string
}

export const useDriverReviews = (driverId?: string | null, limit = 3) => {
  const [reviews, setReviews] = useState<DriverReview[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!driverId) return
    let cancelled = false

    const fetch = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, profiles:reviewer_id(name)')
          .eq('reviewee_id', driverId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (!cancelled && data) {
          setReviews(
            data.map((r: any) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              created_at: r.created_at,
              reviewer_name: r.profiles?.name,
            }))
          )
        }
      } catch (_e) {
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [driverId, limit])

  return { reviews, loading }
}
