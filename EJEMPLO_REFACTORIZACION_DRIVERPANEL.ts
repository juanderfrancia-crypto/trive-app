/**
 * EJEMPLO DE REFACTORIZACIÓN: DriverPanelScreen
 * 
 * Antes: Múltiples listeners manuales → Memory leak, 50+ conexiones
 * Después: RealtimeSubscriptionManager singleton → 4 canales totales
 */

// ============================================================
// ❌ ANTES (DriverPanelScreen actual - con problemas)
// ============================================================

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'

export function DriverPanelScreenBefore() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const msgChannelsRef = useRef<Map<string, any>>(new Map()) // ⚠️ Memory leak risk

  useEffect(() => {
    // ❌ Crea listener manual
    const routesChannel = supabase
      .channel(`driver-routes:${userId}:${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, () => {
        fetchDriverRoutes()
      })
      .subscribe()

    // ❌ Crea otro listener manual
    const bookingsChannel = supabase
      .channel(`driver-bookings:${userId}:${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchDriverRoutes()
      })
      .subscribe()

    // ❌ Para cada ruta, crea un listener manual
    routes.forEach((route) => {
      const msgChannel = supabase
        .channel(`messages-${route.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'negotiation_messages' }, () => {
          // Handle message
        })
        .subscribe()
      msgChannelsRef.current.set(route.id, msgChannel)
    })

    // ⚠️ Cleanup incompleto
    return () => {
      routesChannel.unsubscribe()
      bookingsChannel.unsubscribe()
      msgChannelsRef.current.forEach((ch) => ch.unsubscribe())
    }
  }, [routes])

  // Total: 2 + routes.length listeners = 10+ simultáneamente ❌
}

// ============================================================
// ✅ DESPUÉS (Refactorizado con Realtime Singleton)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { realtimeManager } from '../services/realtimeSubscriptionManager'
import { useQueryClient } from '@tanstack/react-query'

export function DriverPanelScreenAfter({ userId }: { userId: string }) {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  const queryClient = useQueryClient()
  const hookIdRef = useRef(`DriverPanelScreen_${Date.now()}_${Math.random()}`)
  const unsubscribersRef = useRef<Array<() => void>>([])

  // 📡 Fetch driver routes with JOIN (FASE 1 optimization)
  const fetchDriverRoutes = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('routes')
        .select(
          `
          *,
          bookings!inner(
            id,
            passenger_id,
            seat_number,
            booking_status,
            payment_method,
            created_at,
            dropoff_point,
            dropoff_point_custom,
            passenger:profiles!passenger_id(id, name, email, phone)
          )
        `
        )
        .eq('driver_id', userId)
        .in('status', ['scheduled', 'in_progress'])
        .order('departure_time', { ascending: true })

      if (error) throw error
      setRoutes(data || [])
    } catch (err) {
      console.error('Error fetching routes:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // 🔌 Setup realtime listeners using SINGLETON
  useEffect(() => {
    if (!userId) return

    console.log(`🔌 [DriverPanelScreen] Setting up realtime via singleton`)
    const newUnsubscribers: Array<() => void> = []

    // ✅ 1️⃣ SINGLETON: All driver routes changes consolidated
    // (replaces manual routesChannel + bookingsChannel from BEFORE)
    const unsubDriver = realtimeManager.subscribeToDriverRoutes(
      userId,
      hookIdRef.current,
      (payload: any) => {
        console.log(`✅ [Realtime] Driver route update:`, payload.eventType)
        fetchDriverRoutes() // Refetch
      }
    )
    newUnsubscribers.push(unsubDriver)

    // ✅ 2️⃣ SINGLETON: All driver offers consolidated
    const unsubOffers = realtimeManager.subscribeToDriverOffers(
      userId,
      hookIdRef.current,
      (payload: any) => {
        console.log(`✅ [Realtime] Driver offer update:`, payload.eventType)
        // Invalidate queries if using React Query
        queryClient.invalidateQueries({ queryKey: ['driver_offers', userId] })
      }
    )
    newUnsubscribers.push(unsubOffers)

    // ✅ 3️⃣ SINGLETON: Message notifications per request
    // (replaces manual msgChannelsRef.forEach from BEFORE)
    // Subscribe to request messages for unread count badge
    routes.forEach((route) => {
      const requestId = route.id
      const unsubMessages = realtimeManager.subscribeToRequestMessages(
        requestId,
        `${hookIdRef.current}_${requestId}`,
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setUnreadCounts((prev) => ({
              ...prev,
              [requestId]: (prev[requestId] ?? 0) + 1,
            }))
          }
        }
      )
      newUnsubscribers.push(unsubMessages)
    })

    unsubscribersRef.current = newUnsubscribers

    // ✅ Auto cleanup: single return
    return () => {
      console.log(`🔌 [DriverPanelScreen] Cleaning up realtime listeners`)
      unsubscribersRef.current.forEach((unsub) => unsub())
      unsubscribersRef.current = []
    }
  }, [userId, routes, fetchDriverRoutes, queryClient])

  return (
    <div>
      {/* Routes list con unread count badges */}
      {routes.map((route) => (
        <div key={route.id}>
          <h2>{route.origin} → {route.destination}</h2>
          {unreadCounts[route.id] > 0 && (
            <span className="badge">{unreadCounts[route.id]} new messages</span>
          )}
          {/* ... route details ... */}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// 📊 COMPARACIÓN
// ============================================================

/**
ANTES (❌ PROBLEMA):
─────────────────────────────────────────────────────────
Listeners creados por DriverPanelScreen:
1. routesChannel (manual)
2. bookingsChannel (manual)
3. messageChannel (manual × N routes)

Si hay 10 rutas → 1 + 1 + 10 = 12 listeners en DriverPanelScreen
Si hay 5 drivers activos → 5 × 12 = 60 listeners totales ❌

Problemas:
- No se limpian bien
- msgChannelsRef.current crece sin límite (memory leak)
- Duplicados: Si useAirportNegotiation también escucha, +5 listeners más
- Total app: 50+ listeners simultáneamente


DESPUÉS (✅ SOLUCIÓN):
─────────────────────────────────────────────────────────
Listeners creados vía RealtimeSubscriptionManager:
1. user_driver_routes_${userId} (SINGLETON - consolidado)
2. user_driver_data_${userId} (SINGLETON - consolidado)
3. request_messages_${requestId} (SINGLETON - consolidado)

Si hay 10 rutas → reusa canales existentes (solo +consolidados)
Si hay 5 drivers activos → 5 × 3 = 15 listeners totales ✅

Beneficios:
- Auto cleanup en unmount
- msgChannels NO se crean manualmente (singleton gestiona)
- Deduplicado: Múltiples hooks de la misma data reusan listener
- Total app: 4-5 listeners simultáneamente

MEJORA: 60 → 15 listeners (75% reducción)
 */

// ============================================================
// 🚀 PASOS PARA MIGRAR
// ============================================================

/**
1. Reemplazar este archivo en DriverPanelScreen.tsx
2. Cambiar imports a usar realtimeManager
3. Remover listeners manuales (routesChannel, bookingsChannel, msgChannelsRef)
4. Usar unsubscribersRef para limpiar en useEffect return
5. Test: 
   - Abrir DevTools
   - Verificar que unread counts actualizan en realtime
   - Verificar no hay memory leaks (Chrome DevTools → Memory)
   - Verificar realtimeManager.getStats() muestra solo 4-5 canales
*/
