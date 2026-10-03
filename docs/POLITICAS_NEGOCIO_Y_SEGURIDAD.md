# Políticas de negocio y seguridad de Trive

Decisiones confirmadas por el dueño. Son reglas que el código debe cumplir.
Última actualización: 2026-10-03.

---

## 1. Modelo de cobro

- Trive **no procesa pagos de viajes**. Pasajero y conductor pagan entre ellos (efectivo, Nequi, Daviplata).
- Trive cobra solo:
  - **$2.000** por publicar una ruta (descontados del saldo del conductor).
  - **$5.000** cuando una solicitud de viaje particular o de aeropuerto se acepta.
- **Pago anticipado:** el conductor recarga su billetera. Ninguna acción que cuesta dinero se ejecuta sin saldo suficiente.
- **El saldo nunca puede ser negativo.** Se garantiza en la base de datos, no solo en la app.
- **No hay límite de viajes por conductor.** Cada viaje se cobra; el volumen no se restringe.
- **Recarga manual** por ahora: el conductor transfiere y un admin acredita el saldo. Wompi se integra solo cuando se decida cobrar en línea.

## 2. Reembolsos de la comisión de $5.000

| Caso | Resultado |
|---|---|
| El pasajero cancela antes de que inicie el viaje | Reembolso completo al saldo del conductor |
| El conductor cancela | Sin reembolso |
| El viaje se ejecuta | Sin reembolso |
| Emergencia real del conductor (ej. accidente) | Un admin puede aprobar el reembolso, con motivo registrado en el libro contable |

Todo movimiento queda en el libro contable (`wallet_transactions`).

## 3. Confirmación del viaje

- El conductor marca el viaje como **completado**.
- El pasajero recibe una notificación con dos opciones: **"Sí, llegué"** o **"Hubo un problema"**.
- Si el pasajero no responde en **24 horas**, el viaje se confirma automáticamente.
- La **calificación** solo se habilita después de la confirmación.
- Si el pasajero reporta un problema, el caso pasa a revisión de un admin.

## 4. Verificación de conductores

Para **conducir** (publicar rutas, aceptar solicitudes, hacer ofertas y chatear de negociación) hay que cumplir requisitos:

- Cuenta con rol de conductor.
- Documentos aprobados por un admin: **cédula, licencia de conducción, tarjeta de propiedad, SOAT y revisión técnico-mecánica**, todos vigentes.
- Cuenta activa, sin suspensiones.

El **pasajero** solo necesita su número de teléfono para registrarse. No requiere documentos.

Esta regla se implementa en **una sola función del servidor** (`puede_conducir`), que usan todas las acciones de conductor.

**Cédula única:** cada cédula pertenece a una sola cuenta de conductor.

**Vencimiento de documentos:** un conductor con documentos vencidos no puede conducir hasta renovarlos. La función `check-document-expiry` controla esto.

**Almacenamiento privado:** los documentos se guardan en almacenamiento privado y solo se abren con enlaces temporales.

## 5. Vehículos

- El vehículo es una entidad propia, separada de la persona.
- **Placa única** entre vehículos activos.
- Un conductor puede tener varios vehículos registrados, pero **solo uno activo** a la vez.
- Al cambiar de carro: el vehículo nuevo se registra con sus documentos, un admin lo aprueba, y el anterior pasa a **inactivo** (no se borra).
- Si hay una ruta publicada o un viaje aceptado con el vehículo anterior, debe terminarse o cancelarse antes de cambiar.
- Cada ruta y cada solicitud aceptada guardan el vehículo con el que se hizo el viaje.
- **Sanciones pegadas a la persona y a la placa:** si un conductor o una placa quedan suspendidos, no pueden seguir operando cambiando de vehículo.
- **Placa de otra persona:** solo se libera con la liberación del titular anterior o con prueba de traspaso (RUNT) aprobada por un admin.
- **Un vehículo puede ser usado por dos conductores**, cada uno con su cédula, pero solo uno activo a la vez. El dueño registrado firma una autorización.
- **El dueño de la tarjeta de propiedad puede ser distinto del conductor**, con autorización firmada.

## 6. Fraude: principios

- **Ningún cobro depende del cliente.** Cada acción que cuesta dinero se ejecuta en el servidor, cobra y registra en el libro en la misma transacción.
- **Ninguna escritura que cuesta dinero se hace directo desde la app.** Se cierran los accesos directos a rutas, aceptación de solicitudes, chat y saldo.
- **Monitoreo sin bloqueo automático.** Se detectan patrones sospechosos (pares conductor-pasajero repetidos, viajes sin confirmación, calificaciones recíprocas, cancelaciones después de aceptar) y se envían a revisión humana. No se restringe el volumen de viajes.
- **Bono de referido:** se paga solo después de que el nuevo conductor complete y se confirme su primer viaje, y con cédula única por cuenta.
- **Fraude comprobado** implica suspensión de la cuenta, según los términos de uso.

## 7. Flujo de negociación (estilo InDriver)

1. El pasajero publica una solicitud con su precio.
2. El conductor puede:
   - aceptar el precio del pasajero (cobro de $5.000 al aceptar), o
   - hacer una contrapropuesta (oferta con su precio). Sin cobro hasta que se acepte.
3. El pasajero puede aceptar una oferta (cobro de $5.000 al conductor), rechazarla (la solicitud sigue visible para otros conductores), o subir su precio.
4. Al aceptar una oferta, las demás ofertas de esa solicitud se rechazan.
5. El chat de negociación está abierto para ambos antes de aceptar, sin costo. El cobro ocurre solo al aceptar.
6. Si el conductor no tiene saldo al aceptar, el mensaje de saldo insuficiente se le muestra a él, no al pasajero.

## 8. Cuentas y seguridad de empleados

- Los administradores y el equipo interno no usan `profiles.is_admin` como permiso general. Se usa una **tabla de roles de empleados** con cargos (contabilidad, verificación, atención al cliente, operaciones, analítica, administrador general).
- **MFA obligatorio** para empleados.
- **Bitácora de auditoría** de cada acción interna en `admin_actions`.

## 9. Requisitos de Google Play

- Política de privacidad pública y accesible desde la app.
- Eliminación de cuenta desde la app, con su URL pública para solicitarla.
- Formulario de seguridad de datos completo.
- Canal de soporte para usuarios.
