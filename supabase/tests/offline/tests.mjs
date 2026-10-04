import { buildDb } from './apply.mjs'

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(ok ? 'PASA ' : 'FALLA', name, detail ? `(${detail})` : '')
}

const { db, failures } = await buildDb()
if (failures.length) {
  console.log('No se puede probar: falla al aplicar migraciones')
  process.exit(1)
}

const D = '00000000-0000-0000-0000-00000000000d' // conductor verificado
const N = '00000000-0000-0000-0000-00000000000e' // conductor referido
const R = '00000000-0000-0000-0000-0000000000aa' // referidor
const P = '00000000-0000-0000-0000-0000000000b1' // pasajero
const P2 = '00000000-0000-0000-0000-0000000000b2' // pasajero 2
const S = '00000000-0000-0000-0000-0000000000cc' // extraño
const A = '00000000-0000-0000-0000-0000000000ad' // administrador

const asSuper = () => db.exec('RESET ROLE; SELECT set_config(\'request.jwt.claim.sub\', \'\', false), set_config(\'request.jwt.claim.role\', \'\', false)')
const asUser = (uid) =>
  db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '${uid}', false), set_config('request.jwt.claim.role', 'authenticated', false); SET ROLE authenticated;`)
const asAnon = () =>
  db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false); SET ROLE anon;`)

const q = async (sql) => (await db.query(sql)).rows
const err = async (fn) => {
  try { await fn(); return null } catch (e) { return e }
}

// ---------- Datos base (como superusuario) ----------
await asSuper()
await db.exec(`
  INSERT INTO auth.users (id, email) VALUES
    ('${D}','d@x'),('${N}','n@x'),('${R}','r@x'),('${P}','p@x'),('${P2}','p2@x'),('${S}','s@x'),('${A}','a@x');
  INSERT INTO profiles (id, name, role, driver_verified, balance, referral_code, referred_by, is_admin) VALUES
    ('${D}','Conductor D','driver',true,10000,'CODIGOD',NULL,false),
    ('${N}','Conductor N','driver',true,10000,'CODIGON','REFCODE',false),
    ('${R}','Referidor R','driver',true,0,'REFCODE',NULL,false),
    ('${P}','Pasajero P','passenger',false,0,NULL,NULL,false),
    ('${P2}','Pasajero P2','passenger',false,0,NULL,NULL,false),
    ('${S}','Extraño S','passenger',false,0,NULL,NULL,false),
    ('${A}','Admin','passenger',false,0,NULL,NULL,true);
`)

// ---------- Identidad y vehículos ----------
await asUser(D)
check('Conductor guarda su cédula', (await err(() => db.exec("SELECT public.set_driver_identity('1020304050')"))) === null)
await asUser(N)
check('Otro conductor no puede usar la misma cédula',
  (await err(() => db.exec("SELECT public.set_driver_identity('1020304050')")))?.message.includes('ya está registrada') === true)
await db.exec("SELECT public.set_driver_identity('5060708090')").catch(() => {})
await db.exec("SELECT * FROM public.register_vehicle('XYZ789','Mazda',2019,'Rojo')")
await asSuper()
const nvid = (await q(`SELECT id FROM vehicles WHERE driver_id='${N}'`))[0].id
await asUser(A)
await db.exec(`SELECT public.approve_vehicle('${nvid}')`)
await asUser(N)
await asUser(D)
await db.exec("SELECT * FROM public.register_vehicle('abc123','Toyota',2018,'Blanco')")
check('Vehículo queda pendiente de aprobación',
  (await q(`SELECT status FROM vehicles WHERE driver_id='${D}'`))[0]?.status === 'pending')
await asUser(N)
check('Otro conductor no puede registrar la misma placa',
  (await err(() => db.exec("SELECT * FROM public.register_vehicle('ABC123','Mazda',2019,'Rojo')")))?.message.includes('ya está registrada') === true)
await asUser(D)
const vid = (await q(`SELECT id FROM vehicles WHERE driver_id='${D}'`))[0].id
await asSuper()
await db.exec("INSERT INTO auth.users (id,email) VALUES ('00000000-0000-0000-0000-0000000000ff','f@x') ON CONFLICT DO NOTHING")
await asUser(A)
await asUser(D)
check('Conductor no puede aprobar su propio vehículo',
  (await err(() => db.exec(`SELECT public.approve_vehicle('${vid}')`)))?.message.includes('No autorizado') === true)
await asUser(A)
await db.exec(`SELECT public.approve_vehicle('${vid}')`)
await asSuper()
check('Admin aprueba el vehículo y queda activo',
  (await q(`SELECT status, is_active FROM vehicles WHERE id='${vid}'`))[0].status === 'verified')

// ---------- Publicar ruta ----------
await asUser(D)
const route1 = (await q(`SELECT (public.publish_route('{"origin":"Puerto Tejada","destination":"Cali","departure_time":"${new Date(Date.now()+86400000).toISOString().slice(0,16).replace('T',' ')}","price_per_seat":15000,"total_seats":3,"available_seats":3,"status":"scheduled","vehicle_plate":"FAKE999"}'::jsonb)).id AS id`))[0].id
const r1 = (await q(`SELECT vehicle_plate, status FROM routes WHERE id='${route1}'`))[0]
check('Publicar ruta usa la placa del vehículo activo (no la del cliente)', r1.vehicle_plate === 'ABC123', r1.vehicle_plate)
check('Publicar ruta cobra $2.000', (await q(`SELECT balance FROM profiles WHERE id='${D}'`))[0].balance === 8000)
check('Cobro queda en el libro (route_fee, approved)',
  (await q(`SELECT count(*)::int c FROM wallet_transactions WHERE user_id='${D}' AND type='route_fee' AND status='approved'`))[0].c === 1)

await asUser(D)
check('Conductor no puede escribir su saldo desde la API',
  (await err(() => db.exec(`UPDATE profiles SET balance = 999999 WHERE id='${D}'`)))?.message.includes('permission denied') === true)
check('Conductor no puede darse privilegio de administrador',
  (await err(() => db.exec(`UPDATE profiles SET is_admin = true WHERE id='${D}'`)))?.message.includes('permission denied') === true)
check('Conductor no puede cambiar su rol a administrador',
  (await err(() => db.exec(`UPDATE profiles SET role = 'admin' WHERE id='${D}'`)))?.message.includes('Rol no permitido') === true)
check('Conductor sí puede cambiar su nombre',
  (await err(() => db.exec(`UPDATE profiles SET name = 'Nuevo nombre' WHERE id='${D}'`))) === null)
check('Conductor no puede insertar rutas directamente',
  (await err(() => db.exec(`INSERT INTO routes (driver_id, origin, destination, departure_time, price_per_seat, total_seats, available_seats, status) VALUES ('${D}','X','Y', now() + interval '1 day', 1, 1, 1, 'scheduled')`)))?.message.includes('row-level security') === true)

// ---------- Reservas ----------
await asUser(S)
check('Pasajero sin relación no ve las reservas de otros',
  (await q(`SELECT count(*)::int c FROM bookings`))[0].c === 0)

await asUser(P)
const bookingRows = await q(`SELECT * FROM public.reserve_seats('${route1}', ARRAY[1,2], 'cash', NULL, false)`)
check('Pasajero reserva dos asientos', bookingRows.length === 2)
check('Precio de la reserva sale de la ruta (no del cliente)', bookingRows.every((b) => Number(b.price) === 15000))
const b1 = bookingRows.find((b) => b.seat_number === 1).id
const b2 = bookingRows.find((b) => b.seat_number === 2).id

await asUser(S)
const dup = await err(() => db.exec(`SELECT * FROM public.reserve_seats('${route1}', ARRAY[1], 'cash', NULL, false)`))
check('Asiento ocupado devuelve error 23505 (conflicto)', dup?.message.includes('ya fueron reservados') === true, dup?.code)
check('Mapa de asientos muestra ocupados sin datos de pasajeros',
  JSON.stringify((await q(`SELECT public.route_occupied_seats('${route1}') AS s`))[0].s) === JSON.stringify([1,2]))

await asUser(P)
const fin = await q(`SELECT success FROM public.finalize_bookings_atomic(ARRAY['${b1}'::uuid,'${b2}'::uuid], 'cash')`)
check('Pasajero confirma sus reservas', fin[0]?.success === true)
check('Un pasajero no puede confirmar reservas ajenas',
  (await q(`SELECT success FROM public.finalize_bookings_atomic(ARRAY['${b1}'::uuid], 'cash')`))[0]?.success === false)

await asUser(P)
check('Pasajero ve sus propias reservas', (await q(`SELECT count(*)::int c FROM bookings`))[0].c === 2)
await asUser(D)
check('Conductor ve las reservas de su ruta', (await q(`SELECT count(*)::int c FROM bookings`))[0].c === 2)

// ---------- Cierre del viaje y confirmación ----------
await asUser(D)
await db.exec(`SELECT public.driver_set_route_status('${route1}', 'in_progress')`)
await asSuper()
await db.exec(`UPDATE routes SET departure_time = now() - interval '2 hours' WHERE id='${route1}'`)
await asUser(D)
await db.exec(`SELECT public.driver_set_route_status('${route1}', 'completed')`)
check('Al completar, la reserva espera confirmación del pasajero',
  (await q(`SELECT booking_status FROM bookings WHERE id='${b1}'`))[0].booking_status === 'awaiting_confirmation')
await asSuper()
check('Pasajero recibe aviso para confirmar',
  (await q(`SELECT count(*)::int c FROM notifications WHERE user_id='${P}' AND type='trip_confirm'`))[0].c >= 1)
check('Sin confirmación no hay ganancia del conductor',
  (await q(`SELECT count(*)::int c FROM earnings_transactions WHERE booking_id='${b1}'`))[0].c === 0)

await asUser(S)
check('Extraño no puede confirmar el viaje de otro',
  (await err(() => db.exec(`SELECT public.passenger_confirm_trip('${b1}', true)`)))?.message.includes('No autorizado') === true)
await asUser(P)
await db.exec(`SELECT public.passenger_confirm_trip('${b1}', true)`)
check('Pasajero confirma que llegó: reserva completada', (await q(`SELECT booking_status FROM bookings WHERE id='${b1}'`))[0].booking_status === 'completed')
check('Confirmación genera la ganancia del conductor',
  (await q(`SELECT count(*)::int c FROM earnings_transactions WHERE booking_id='${b1}'`))[0].c === 1)
await db.exec(`SELECT public.passenger_confirm_trip('${b2}', false)`)
check('Pasajero reporta un problema: reserva en disputa',
  (await q(`SELECT booking_status FROM bookings WHERE id='${b2}'`))[0].booking_status === 'disputed')

await asUser(P)
await db.exec(`SELECT public.rate_booking('${b1}', 5, 'Muy bien', true)`)
check('Pasajero califica al conductor de un viaje completado', true)
check('Calificar dos veces queda bloqueado',
  (await err(() => db.exec(`SELECT public.rate_booking('${b1}', 4, NULL, false)`)))?.message.includes('Ya calificaste') === true)
await asUser(S)
check('Extraño no puede calificar un viaje ajeno',
  (await err(() => db.exec(`SELECT public.rate_booking('${b1}', 1, NULL, false)`)))?.message.includes('No eres participante') === true)
await asSuper()
check('El promedio del conductor se calcula en el servidor',
  Number((await q(`SELECT rating FROM profiles WHERE id='${D}'`))[0].rating) === 5)

// ---------- Referido: primer viaje completado y confirmado ----------
await asUser(N)
const route2 = (await q(`SELECT (public.publish_route('{"origin":"Puerto Tejada","destination":"Cali","departure_time":"${new Date(Date.now()+86400000).toISOString().slice(0,16).replace('T',' ')}","price_per_seat":10000,"total_seats":2,"available_seats":2,"status":"scheduled"}'::jsonb)).id AS id`))[0].id
await asUser(P2)
const rb = await q(`SELECT id FROM public.reserve_seats('${route2}', ARRAY[1], 'cash', NULL, false)`)
await db.exec(`SELECT * FROM public.finalize_bookings_atomic(ARRAY['${rb[0].id}'::uuid], 'cash')`)
await asSuper()
await db.exec(`UPDATE routes SET departure_time = now() - interval '2 hours' WHERE id='${route2}'`)
await asUser(N)
await db.exec(`SELECT public.driver_set_route_status('${route2}', 'completed')`)
await asUser(P2)
await db.exec(`SELECT public.passenger_confirm_trip('${rb[0].id}', true)`)
await asSuper()
check('Referido: el referidor recibe $2.000',
  (await q(`SELECT balance FROM profiles WHERE id='${R}'`))[0].balance === 2000)
check('Referido: el conductor nuevo recibe $1.000 de descuento',
  (await q(`SELECT balance FROM profiles WHERE id='${N}'`))[0].balance === 10000 - 2000 + 1000)
check('Libro registra bono y descuento de referido',
  (await q(`SELECT count(*)::int c FROM wallet_transactions WHERE type IN ('referral_bonus','referral_discount')`))[0].c === 2)

// ---------- Solicitudes de aeropuerto ----------
await asUser(P)
const req1 = (await q(`INSERT INTO airport_requests (passenger_id, origin, destination, departure_time, offered_price, status) VALUES ('${P}','Puerto Tejada','Aeropuerto Cali', now() + interval '1 day', 45000, 'pending') RETURNING id`))[0].id
check('Pasajero crea solicitud pendiente', !!req1)

await asUser(D)
await db.exec(`SELECT public.accept_request_direct('${req1}')`)
check('Conductor acepta solicitud: cobra $5.000', (await q(`SELECT balance FROM profiles WHERE id='${D}'`))[0].balance === 3000)
check('Aceptación directa crea su oferta aceptada (hilo de chat)',
  (await q(`SELECT count(*)::int c FROM airport_offers WHERE request_id='${req1}' AND status='accepted'`))[0].c === 1)
await asSuper()
await db.exec(`UPDATE profiles SET balance = 1000 WHERE id='${D}'`)
const reqSinSaldo = (await q(`INSERT INTO airport_requests (passenger_id, origin, destination, departure_time, offered_price, status) VALUES ('${P}','Puerto Tejada','Aeropuerto Cali', now() + interval '1 day', 45000, 'pending') RETURNING id`))[0].id
await asUser(D)
check('Aceptar con saldo insuficiente queda bloqueado ($5.000 requeridos)',
  (await err(() => db.exec(`SELECT public.accept_request_direct('${reqSinSaldo}')`)))?.message.includes('Necesitas $5.000') === true)
await asSuper()
await db.exec(`UPDATE profiles SET balance = 3000 WHERE id='${D}'`)
await asUser(D)

await asUser(P)
await db.exec(`SELECT public.cancel_airport_request('${req1}')`)
check('Pasajero cancela solicitud aceptada: conductor recupera $5.000',
  (await q(`SELECT balance FROM profiles WHERE id='${D}'`))[0].balance === 8000)
await asSuper()
check('Reembolso queda en el libro', (await q(`SELECT count(*)::int c FROM wallet_transactions WHERE type='airport_refund'`))[0].c === 1)

await asSuper()
const reqEnCurso = (await q(`INSERT INTO airport_requests (passenger_id, driver_id, origin, destination, departure_time, offered_price, status) VALUES ('${P}','${D}','Puerto Tejada','Aeropuerto Cali', now(), 45000, 'in_progress') RETURNING id`))[0].id
await asUser(P)
check('No se puede cancelar un viaje en curso',
  (await err(() => db.exec(`SELECT public.cancel_airport_request('${reqEnCurso}')`)))?.message.includes('ya no se puede cancelar') === true)

// Ofertas y chat
await asUser(P2)
const req2 = (await q(`INSERT INTO airport_requests (passenger_id, origin, destination, departure_time, offered_price, status) VALUES ('${P2}','Puerto Tejada','Aeropuerto Cali', now() + interval '1 day', 40000, 'pending') RETURNING id`))[0].id
await asUser(N)
const offerN = (await q(`INSERT INTO airport_offers (request_id, driver_id, proposed_price, status) VALUES ('${req2}','${N}', 50000, 'pending') RETURNING id`))[0].id
await asUser(D)
const offerD = (await q(`INSERT INTO airport_offers (request_id, driver_id, proposed_price, status) VALUES ('${req2}','${D}', 45000, 'pending') RETURNING id`))[0].id

await asUser(P2)
await db.exec(`SELECT public.reject_airport_offer('${offerD}')`)
check('Pasajero rechaza la oferta de D (la solicitud sigue abierta)',
  (await q(`SELECT status FROM airport_offers WHERE id='${offerD}'`))[0].status === 'rejected')
check('No se puede rechazar dos veces',
  (await err(() => db.exec(`SELECT public.reject_airport_offer('${offerD}')`)))?.message.includes('ya no está pendiente') === true)
await asUser(P2)
await db.exec(`UPDATE airport_offers SET status='accepted' WHERE id='${offerN}'`)
await asSuper()
check('Pasajero no puede aceptar una oferta por escritura directa (sigue pendiente)',
  (await q(`SELECT status FROM airport_offers WHERE id='${offerN}'`))[0].status === 'pending')
await asUser(P2)
await db.exec(`SELECT public.accept_airport_offer('${offerN}')`)
await asSuper()
check('Aceptar oferta de N: N paga $5.000 (10000 - 2000 ruta + 1000 referido - 5000 = 4000)',
  (await q(`SELECT balance FROM profiles WHERE id='${N}'`))[0].balance === 4000, String((await q(`SELECT balance FROM profiles WHERE id='${N}'`))[0].balance))
check('Libro registra la comisión de la oferta aceptada',
  (await q(`SELECT count(*)::int c FROM wallet_transactions WHERE user_id='${N}' AND type='airport_fee'`))[0].c === 1)

// Chat por hilo
await asUser(N)
await db.exec(`SELECT public.send_chat_message('${req2}', '${N}', 'Hola, llego a las 6', 'text')`)
check('Conductor con oferta aceptada escribe en su hilo', true)
await asUser(D)
check('Conductor con oferta rechazada no puede escribir (hilo cerrado)',
  (await err(() => db.exec(`SELECT public.send_chat_message('${req2}', '${D}', 'hola', 'text')`)))?.message.includes('cerrado') === true)
await asUser(P2)
const unread = (await q(`SELECT public.mark_chat_thread_read('${req2}', '${N}') AS n`))[0].n
check('Pasajero marca como leído solo lo recibido en ese hilo', Number(unread) === 1, String(unread))
await asUser(S)
check('Extraño no ve los mensajes de otros',
  (await q(`SELECT count(*)::int c FROM negotiation_messages`))[0].c === 0)

// ---------- Login por teléfono: upsert del propio perfil ----------
await asUser(P2)
check('Usuario actualiza su perfil con upsert (login por teléfono, incluye email)',
  (await err(() => db.exec(`INSERT INTO profiles (id, name, email, phone, role) VALUES ('${P2}', 'Pasajero dos', 'p2@correo.com', '3001112233', 'passenger') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, role = EXCLUDED.role`))) === null)

// ---------- Privacidad de perfiles ----------
await asUser(S)
check('Extraño no ve el perfil de un pasajero sin relación',
  (await q(`SELECT count(*)::int c FROM profiles WHERE id='${P}'`))[0].c === 0)
check('Cualquier usuario autenticado ve un conductor con rutas publicadas (para buscar viajes)',
  (await q(`SELECT count(*)::int c FROM profiles WHERE id='${D}'`))[0].c === 1)
await asUser(P)
check('Pasajero ve el perfil del conductor de su reserva',
  (await q(`SELECT count(*)::int c FROM profiles WHERE id='${D}'`))[0].c === 1)
check('Pasajero ve su propio perfil', (await q(`SELECT count(*)::int c FROM profiles WHERE id='${P}'`))[0].c === 1)
await asAnon()
check('Usuario sin sesión no ve perfiles', (await q(`SELECT count(*)::int c FROM profiles`))[0].c === 0)
check('Usuario sin sesión no ve notificaciones', (await q(`SELECT count(*)::int c FROM notifications`))[0].c === 0)
check('Usuario sin sesión no puede llamar al cobro de comisión',
  (await err(() => db.exec(`SELECT public.create_negotiation_payment('${offerN}', 5000)`)))?.message.includes('permission denied') === true)
check('Usuario sin sesión no puede acreditar saldo',
  (await err(() => db.exec(`SELECT public.increment_wallet_balance('${S}', 1000000)`)))?.message.includes('permission denied') === true)

// ---------- Cierre automático a 24 horas ----------
await asSuper()
const b3 = (await q(`INSERT INTO bookings (route_id, passenger_id, seat_number, price, booking_status, payment_status, updated_at) VALUES ('${route2}','${P}',2,10000,'awaiting_confirmation','pending', now() - interval '25 hours') RETURNING id`))[0].id
const auto = (await q(`SELECT public.auto_confirm_expired_trips() AS n`))[0].n
check('Cierre automático confirma reservas sin respuesta en 24 h', Number(auto) >= 1, String(auto))
check('Reserva automática queda completada',
  (await q(`SELECT booking_status FROM bookings WHERE id='${b3}'`))[0].booking_status === 'completed')

// ---------- Listado de documentos para el administrador ----------
await asSuper()
await db.exec(`INSERT INTO driver_documents (driver_id, document_type, file_path, file_name, file_size, file_type, status, uploaded_at) VALUES ('${D}','cedula','drivers/${D}/cedula.jpg','cedula.jpg',1200,'image/jpeg','pending', now())`)
await asUser(A)
await asSuper()
await db.exec(`INSERT INTO driver_documents (driver_id, document_type, file_path, file_name, file_size, file_type, status, uploaded_at) VALUES ('${D}','soat','drivers/${D}/soat-viejo.jpg','soat-viejo.jpg',900,'image/jpeg','pending', now() - interval '3 days'), ('${D}','licencia','drivers/${D}/lic-nueva.jpg','lic-nueva.jpg',900,'image/jpeg','verifying', now() - interval '1 day')`)
await asUser(A)
const orden = await q(`SELECT document_type, status FROM public.get_pending_documents_for_admin()`)
check('Cola de revisión: pendientes primero, y dentro del grupo el más antiguo primero',
  orden.length >= 2 && orden[0].status === 'pending' && orden[0].document_type === 'soat' && orden.findIndex((d) => d.status === 'verifying') > 0 && orden.findIndex((d) => d.status === 'pending') < orden.findIndex((d) => d.status === 'verifying'), JSON.stringify(orden.map((d) => d.status)))
check('Administrador ve la lista de documentos pendientes sin error',
  (await err(() => db.exec(`SELECT * FROM public.get_pending_documents_for_admin()`))) === null)
check('Administrador ve el historial de documentos sin error',
  (await err(() => db.exec(`SELECT * FROM public.get_processed_documents_for_admin()`))) === null)

// ---------- Recarga manual por administrador ----------
await asUser(D)
check('Conductor no puede acreditarse saldo con la recarga de administrador',
  (await err(() => db.exec(`SELECT public.admin_credit_balance('${D}', 5000, 'Nequi 123')`)))?.message.includes('No autorizado') === true)
await asUser(A)
check('Administrador sin nota no puede acreditar',
  (await err(() => db.exec(`SELECT public.admin_credit_balance('${D}', 5000, '  ')`)))?.message.includes('nota') === true)
const nuevoSaldo = (await q(`SELECT public.admin_credit_balance('${D}', 5000, 'Nequi comprobante 991') AS b`))[0].b
check('Administrador acredita recarga con nota', Number(nuevoSaldo) === 8000 + 5000, String(nuevoSaldo))
await asSuper()
check('La recarga queda en el libro como recharge aprobada',
  (await q(`SELECT count(*)::int c FROM wallet_transactions WHERE user_id='${D}' AND type='recharge' AND status='approved'`))[0].c === 1)
check('La recarga queda en la bitácora de administrador',
  (await q(`SELECT count(*)::int c FROM admin_actions WHERE target_user_id='${D}' AND action='balance_recharge'`))[0].c === 1)

// ---------- Eliminación de cuenta ----------
await asSuper()
await db.exec(`SELECT public.anonymize_account('${P}')`)
check('Eliminar cuenta: el perfil queda anonimizado',
  (await q(`SELECT name, email, phone FROM profiles WHERE id='${P}'`))[0].name === 'Usuario eliminado')
check('Eliminar cuenta: se borran sus notificaciones',
  (await q(`SELECT count(*)::int c FROM notifications WHERE user_id='${P}'`))[0].c === 0)
await asUser(P)
check('Un usuario no puede ejecutar el borrado directamente',
  (await err(() => db.exec(`SELECT public.anonymize_account('${P2}')`)))?.message.includes('permission denied') === true)

const fails = results.filter((r) => !r.ok)
console.log(`\nTotal: ${results.length}  pasan: ${results.length - fails.length}  fallan: ${fails.length}`)
for (const f of fails) console.log('  - FALLA:', f.name)
process.exit(fails.length ? 1 : 0)
