# Política de reembolsos de Trive

Versión de trabajo, en pesos colombianos. Es la fuente de verdad para lo que la app promete. Requiere revisión legal antes de publicarse en la tienda.

## 1. Qué cobra Trive

Trive no retiene el dinero de los viajes. El pasajero paga al conductor en efectivo, Nequi, Daviplata o transferencia. Trive solo cobra dos comisiones, descontadas del saldo del conductor:

| Comisión | Monto | Cuándo se cobra |
|---|---|---|
| Publicar una ruta | $2.000 | Al publicar la ruta |
| Aceptar una solicitud particular o de aeropuerto | $5.000 | Al aceptar la solicitud |

Por eso los reembolsos de Trive son siempre sobre estas comisiones. Lo que el pasajero paga al conductor se resuelve entre ellos, con ayuda de la app (ver sección 4).

## 2. Reembolsos de la tarifa de publicación ($2.000)

El ancla de todas las reglas es el momento en que el conductor pulsa **"Salir"**. Antes de ese momento puede cancelar; después, no. Las salidas son de minutos: un carro puede publicarse y salir en pocos minutos, así que no se usan plazos de horas.

| Caso | Resultado |
|---|---|
| Error de la app al publicar (cobro duplicado) | 100% al saldo, automático |
| Cancela antes de "Salir", **sin reservas confirmadas** | 100% al saldo, automático. Límite de 3 devoluciones automáticas por conductor al día |
| Cancela antes de "Salir", **con reservas confirmadas** | Sin reembolso. Los pasajeros quedan liberados y avisados |
| Pulsa "Salir" | Sin reembolso. Se cierran reservas y cancelación |
| Pasa la hora de salida sin pulsar "Salir" | Sin reembolso. La ruta se cierra sola y se avisa a los pasajeros reservados |
| Emergencia documentada (accidente, salud, fuerza mayor) | Un administrador revisa el caso y puede aprobar el reembolso, con motivo registrado |

Por qué estas reglas: la devolución automática solo aplica cuando nadie resulta afectado; no se puede recuperar el cobro atrayendo pasajeros y cancelando después; y no se puede reclamar devolución por no pulsar "Salir".

Trive no controla cómo se opera el viaje fuera de la app ni garantiza la ocupación del vehículo. Los pasajeros que el conductor recoja fuera de la app no reservaron por Trive y no están cubiertos por esta política.

**Estado de implementación:** la migración `20261008130000_route_fee_refunds.sql` implementa estas reglas, pero debe aplicarse y probarse con cuentas de prueba antes de salir a producción. El cierre automático de rutas vencidas requiere activar la extensión pg_cron en Supabase.

## 3. Reembolsos de la comisión de aceptación ($5.000)

| Caso | Resultado |
|---|---|
| El pasajero cancela antes de que inicie el viaje | 100% al saldo del conductor, automático |
| El conductor cancela el viaje aceptado | Sin reembolso |
| El viaje se ejecuta | Sin reembolso |
| Error de la app (reserva no confirmada, cobro duplicado) | 100% al saldo, automático |
| Emergencia real del conductor (por ejemplo, accidente) | Un administrador puede aprobarlo, con motivo registrado |

Todo movimiento queda en el libro contable (`wallet_transactions`) con su motivo.

## 4. Pagos entre pasajero y conductor

Como Trive no retiene dinero, la app ayuda a resolverlo así:

1. Si el viaje no se hizo y el pasajero ya pagó, lo primero es escribirle al conductor por el chat de la reserva.
2. Si no se resuelve, el pasajero reporta el problema en la app dentro de las **24 horas** siguientes al viaje.
3. Un administrador revisa el caso con ambas partes y deja constancia de la decisión.

Trive no garantiza devoluciones de dinero entregado directamente entre usuarios. Sí garantiza que cualquier comisión cobrada por error se devuelve.

## 5. Saldo y cierre de cuenta

- El saldo es de uso exclusivo dentro de Trive. No es retirable, no es transferible y no se convierte en efectivo.
- Las recargas no son reembolsables.
- Al cerrar la cuenta, el saldo que quede no se devuelve. Las únicas devoluciones son las de los casos de error de la app de las secciones 2 y 3, que se acreditan al saldo.
- Los términos de uso (sección 7 y 8A) describen estas reglas.

## 6. Principios

- **Automático cuando es error nuestro.** Si la app falla, el saldo se devuelve sin que el usuario pida nada.
- **Sin créditos extra.** No se regalan montos adicionales; el reembolso es el monto cobrado.
- **Claridad antes de cobrar.** Cada cobro muestra su monto y su regla antes de confirmarse.
- **Un solo lugar de verdad.** Esta política y `docs/POLITICAS_NEGOCIO_Y_SEGURIDAD.md` deben decir lo mismo.
