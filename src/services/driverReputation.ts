import { supabase } from './supabase'

export interface DriverReputation {
  driverId: string
  driverName: string
  avgRating: number
  weightedRating: number
  totalReviews: number
  completedTrips: number
  recommendPercent: number
  achievements: Achievement[]
  reviewComments: ReviewComment[]
}

export interface Achievement {
  id: string
  code: string
  name: string
  description: string
  iconName: string
  unlockedAt?: string
}

export interface ReviewComment {
  id: string
  rating: number
  comment: string
  recommend: boolean
  reviewerName: string
  createdAt: string
}

export interface RatingConfig {
  weightAverage: number
  weightConsistency: number
  weightRecency: number
  weightRecommendations: number
}

/**
 * Get rating configuration from database
 */
export const getRatingConfig = async (): Promise<RatingConfig> => {
  try {
    const { data, error } = await supabase
      .from('rating_config')
      .select('weight_average, weight_consistency, weight_recency, weight_recommendations')
      .eq('name', 'default')
      .limit(1)

    if (error) throw error

    if (!data || data.length === 0) {
      return {
        weightAverage: 0.5,
        weightConsistency: 0.2,
        weightRecency: 0.15,
        weightRecommendations: 0.15,
      }
    }

    return {
      weightAverage: data[0]?.weight_average || 0.5,
      weightConsistency: data[0]?.weight_consistency || 0.2,
      weightRecency: data[0]?.weight_recency || 0.15,
      weightRecommendations: data[0]?.weight_recommendations || 0.15,
    }
  } catch (error) {
    console.error('Error getting rating config:', error)
    return {
      weightAverage: 0.5,
      weightConsistency: 0.2,
      weightRecency: 0.15,
      weightRecommendations: 0.15,
    }
  }
}

/**
 * Calculate weighted rating based on multiple factors
 */
export const calculateWeightedRating = (
  avgRating: number,
  consistency: number,
  recencyScore: number,
  recommendPercent: number,
  config: RatingConfig
): number => {
  // Normalize values to 0-5 scale
  const consistencyScore = Math.max(0, 5 - consistency * 5) // Lower std dev = better
  const recommendScore = (recommendPercent / 100) * 5 // 0-5 based on percent

  const weighted =
    avgRating * config.weightAverage +
    consistencyScore * config.weightConsistency +
    recencyScore * config.weightRecency +
    recommendScore * config.weightRecommendations

  return Math.round(weighted * 10) / 10 // Round to 1 decimal
}

/**
 * Calculate recency score (recent reviews weighted higher)
 */
const calculateRecencyScore = (reviewDates: string[]): number => {
  if (reviewDates.length === 0) return 0

  const now = new Date()
  const scores = reviewDates.map((dateStr) => {
    const date = new Date(dateStr)
    const daysOld = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)

    // Recent reviews (0-30 days): score 5
    if (daysOld <= 30) return 5
    // Medium (31-90 days): score 4
    if (daysOld <= 90) return 4
    // Older (91-180 days): score 3
    if (daysOld <= 180) return 3
    // Very old (180+ days): score 2
    return 2
  })

  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}

/**
 * Get driver reputation summary
 */
export const getDriverReputation = async (driverId: string): Promise<DriverReputation | null> => {
  try {
    // Get reputation summary from view
    const { data: repData, error: repError } = await supabase
      .from('driver_reputation_summary')
      .select(
        'driver_id, name, avg_rating, rating_consistency, recommend_percent, completed_trips, total_reviews'
      )
      .eq('driver_id', driverId)
      .single()

    if (repError) throw repError

    const config = await getRatingConfig()
    const recencyScore = await getRecencyScore(driverId)

    const weightedRating = calculateWeightedRating(
      repData.avg_rating,
      repData.rating_consistency,
      recencyScore,
      repData.recommend_percent,
      config
    )

    // Get unlocked achievements
    const { data: achievementData, error: achieveError } = await supabase
      .from('driver_achievements')
      .select(
        `
        id,
        unlocked_at,
        achievements (
          id,
          code,
          name,
          description,
          icon_name
        )
      `
      )
      .eq('driver_id', driverId)

    if (achieveError) throw achieveError

    const achievements: Achievement[] = achievementData
      ? achievementData.map((da: any) => ({
          id: da.achievements.id,
          code: da.achievements.code,
          name: da.achievements.name,
          description: da.achievements.description,
          iconName: da.achievements.icon_name,
          unlockedAt: da.unlocked_at,
        }))
      : []

    // Get review comments
    const reviewComments = await getDriverReviewComments(driverId)

    return {
      driverId,
      driverName: repData.name,
      avgRating: Math.round(repData.avg_rating * 10) / 10,
      weightedRating,
      totalReviews: repData.total_reviews,
      completedTrips: repData.completed_trips,
      recommendPercent: Math.round(repData.recommend_percent),
      achievements,
      reviewComments,
    }
  } catch (error) {
    console.error('Error getting driver reputation:', error)
    return null
  }
}

/**
 * Get recency score for driver
 */
const getRecencyScore = async (driverId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('created_at')
      .eq('reviewee_id', driverId)
      .order('created_at', { ascending: false })
      .limit(50) // Last 50 reviews

    if (error) throw error

    if (!data || data.length === 0) return 0

    const dates = data.map((r) => r.created_at)
    return calculateRecencyScore(dates)
  } catch (error) {
    console.error('Error calculating recency score:', error)
    return 0
  }
}

/**
 * Get driver's review comments (with public details)
 */
export const getDriverReviewComments = async (
  driverId: string,
  limit: number = 10
): Promise<ReviewComment[]> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(
        `
        id,
        rating,
        comment,
        recommend,
        created_at,
        profiles:reviewer_id(name)
      `
      )
      .eq('reviewee_id', driverId)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data
      ? data.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          recommend: r.recommend,
          reviewerName: r.profiles.name || 'Usuario',
          createdAt: r.created_at,
        }))
      : []
  } catch (error) {
    console.error('Error getting review comments:', error)
    return []
  }
}

/**
 * Check and unlock achievements for driver
 */
export const checkAndUnlockAchievements = async (driverId: string): Promise<void> => {
  try {
    // Get driver's current stats
    const reputation = await getDriverReputation(driverId)
    if (!reputation) return

    // Get available achievements
    const { data: achievements, error: achieveError } = await supabase
      .from('achievements')
      .select('id, code, min_trips, min_rating, min_recommendations_percent')

    if (achieveError) throw achieveError

    // Get already unlocked achievements
    const { data: unlockedData, error: unlockedError } = await supabase
      .from('driver_achievements')
      .select('achievement_id')
      .eq('driver_id', driverId)

    if (unlockedError) throw unlockedError

    const unlockedIds = new Set(unlockedData?.map((u: any) => u.achievement_id) || [])

    // Check each achievement
    for (const achievement of achievements) {
      const isUnlocked = unlockedIds.has(achievement.id)
      if (isUnlocked) continue

      const meetsTrips = reputation.completedTrips >= achievement.min_trips
      const meetsRating = reputation.weightedRating >= achievement.min_rating
      const meetsRecommendations =
        reputation.recommendPercent >= achievement.min_recommendations_percent

      const shouldUnlock = meetsTrips && meetsRating && meetsRecommendations

      if (shouldUnlock) {
        const { error: insertError } = await supabase.from('driver_achievements').insert({
          driver_id: driverId,
          achievement_id: achievement.id,
        })

        if (insertError && !insertError.message.includes('duplicate')) {
          throw insertError
        }
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error)
  }
}

/**
 * Get all achievements available in system
 */
export const getAllAchievements = async (): Promise<Achievement[]> => {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('id, code, name, description, icon_name')
      .order('created_at', { ascending: true })

    if (error) throw error

    return data
      ? data.map((a: any) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          description: a.description,
          iconName: a.icon_name,
        }))
      : []
  } catch (error) {
    console.error('Error getting achievements:', error)
    return []
  }
}
