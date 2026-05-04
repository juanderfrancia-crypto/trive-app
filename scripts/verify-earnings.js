#!/usr/bin/env node

/**
 * Script para verificar datos REALES de ganancias en Supabase
 * Uso: node scripts/verify-earnings.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://iksenkkaxlmdiyeezoym.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJKV1QiLCJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrc2Vua2theGxtZGl5ZWV6b3ltIiwidHlwIjoiSldXIn0.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrc2Vua2theGxtZGl5ZWV6b3ltIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTcxMzcwMzI3NiwiZXhwIjoxODcxMjAzMjc2fQ.UQqKuVXmjMUC-1d6sFJ-WH1vTJdOVwFM4KhPNsqG-IM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyEarnings() {
  console.log('🔍 VERIFICANDO DATOS DE GANANCIAS EN SUPABASE...\n');

  try {
    // 1. Obtener datos del usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No hay usuario autenticado');
      return;
    }

    console.log(`📱 Usuario: ${user.id}`);
    console.log(`📧 Email: ${user.email}\n`);

    // 2. Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('❌ Error al obtener perfil:', profileError.message);
      return;
    }

    console.log(`👤 Rol: ${profile?.role}`);
    console.log(`📝 Nombre: ${profile?.full_name}\n`);

    if (profile?.role !== 'driver') {
      console.log('⚠️  Este usuario NO es conductor. Ganancias no aplican.');
      return;
    }

    // 3. Obtener rutas del conductor
    const { data: routes, error: routesError } = await supabase
      .from('routes')
      .select('id, status, price_per_seat, departure_time, created_at')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });

    if (routesError) {
      console.log('❌ Error al obtener rutas:', routesError.message);
      return;
    }

    console.log(`📍 RUTAS TOTALES: ${routes?.length || 0}`);
    if (routes && routes.length > 0) {
      routes.slice(0, 3).forEach((route, idx) => {
        const status = route.status || 'unknown';
        console.log(`   ${idx + 1}. [${status.toUpperCase()}] Precio: $${route.price_per_seat} - ${new Date(route.created_at).toLocaleDateString()}`);
      });
      if (routes.length > 3) {
        console.log(`   ... y ${routes.length - 3} rutas más`);
      }
    }
    console.log();

    if (!routes || routes.length === 0) {
      console.log('⚠️  No hay rutas registradas. Ganancias = 0.');
      return;
    }

    // 4. Obtener bookings de esas rutas
    const routeIds = routes.map(r => r.id);
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, route_id, price, payment_status, booking_status, created_at')
      .in('route_id', routeIds);

    if (bookingsError) {
      console.log('❌ Error al obtener bookings:', bookingsError.message);
      return;
    }

    console.log(`💰 BOOKINGS TOTALES: ${bookings?.length || 0}\n`);

    // 5. Calcular estadísticas
    const completedBookings = bookings?.filter(b => b.payment_status === 'completed') || [];
    const pendingBookings = bookings?.filter(b => b.payment_status === 'pending') || [];
    const failedBookings = bookings?.filter(b => b.payment_status === 'failed') || [];

    const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const pendingAmount = pendingBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const completedTrips = routes.filter(r => r.status === 'completed').length;

    console.log('📊 ESTADÍSTICAS DE GANANCIAS:');
    console.log(`   ✅ Completados: ${completedBookings.length} bookings = $${totalEarnings.toLocaleString()}`);
    console.log(`   ⏳ Pendientes: ${pendingBookings.length} bookings = $${pendingAmount.toLocaleString()}`);
    console.log(`   ❌ Fallidos: ${failedBookings.length} bookings`);
    console.log(`   🚗 Viajes Completados: ${completedTrips}\n`);

    // 6. Mostrar detalles de bookings completados
    if (completedBookings.length > 0) {
      console.log('💵 DETALLES - BOOKINGS COMPLETADOS:');
      completedBookings.slice(0, 5).forEach((booking, idx) => {
        const date = new Date(booking.created_at).toLocaleDateString();
        console.log(`   ${idx + 1}. $${booking.price} - ${booking.booking_status || 'unknown'} - ${date}`);
      });
      if (completedBookings.length > 5) {
        console.log(`   ... y ${completedBookings.length - 5} más`);
      }
      console.log();
    }

    // 7. Mostrar detalles de bookings pendientes
    if (pendingBookings.length > 0) {
      console.log('⏳ DETALLES - BOOKINGS PENDIENTES:');
      pendingBookings.slice(0, 5).forEach((booking, idx) => {
        const date = new Date(booking.created_at).toLocaleDateString();
        console.log(`   ${idx + 1}. $${booking.price} - ${booking.booking_status || 'unknown'} - ${date}`);
      });
      if (pendingBookings.length > 5) {
        console.log(`   ... y ${pendingBookings.length - 5} más`);
      }
      console.log();
    }

    // 8. Conclusión
    console.log('✅ CONCLUSIÓN:');
    if (totalEarnings > 0) {
      console.log(`   Los datos SON REALES ✓`);
      console.log(`   Ganancias Totales Verificadas: $${totalEarnings.toLocaleString()}`);
    } else {
      console.log(`   Los datos son CERO porque:`);
      console.log(`   - No hay bookings completados (payment_status = 'completed')`);
      console.log(`   - Las ganancias pendientes ($${pendingAmount}) aún no se han procesado`);
      if (pendingAmount > 0) {
        console.log(`   - Una vez se completen los pagos pendientes, se sumará: $${pendingAmount.toLocaleString()}`);
      }
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
  }
}

verifyEarnings();
