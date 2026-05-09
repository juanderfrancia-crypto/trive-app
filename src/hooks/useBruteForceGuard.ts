import { useState, useEffect, useRef } from 'react'

// 3 fallos → 30 s bloqueado  |  6 fallos → 5 min bloqueado
const THRESHOLDS = [
  { attempts: 3, lockSeconds: 30 },
  { attempts: 6, lockSeconds: 300 },
]

export function useBruteForceGuard() {
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockUntil, setLockUntil] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (lockUntil === null) {
      if (timerRef.current) clearInterval(timerRef.current)
      setCountdown(0)
      return
    }

    const tick = () => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockUntil(null)
        setCountdown(0)
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        setCountdown(remaining)
      }
    }

    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [lockUntil])

  const isLocked = lockUntil !== null && Date.now() < lockUntil

  const recordFailure = () => {
    setFailedAttempts((prev) => {
      const next = prev + 1
      const threshold = [...THRESHOLDS].reverse().find((t) => next >= t.attempts)
      if (threshold) {
        setLockUntil(Date.now() + threshold.lockSeconds * 1000)
      }
      return next
    })
  }

  const recordSuccess = () => {
    setFailedAttempts(0)
    setLockUntil(null)
  }

  const formatCountdown = (): string => {
    if (countdown >= 60) {
      const m = Math.floor(countdown / 60)
      const s = countdown % 60
      return `${m}:${s.toString().padStart(2, '0')}`
    }
    return `${countdown}s`
  }

  return { isLocked, countdown, formatCountdown, recordFailure, recordSuccess, failedAttempts }
}
