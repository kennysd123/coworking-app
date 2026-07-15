## ADDED Requirements

### Requirement: Suscripción a actualizaciones de sala vía WebSocket
El sistema SHALL permitir a clientes autenticados suscribirse a actualizaciones de disponibilidad de una sala específica emitiendo el evento `subscribe-sala` con `{ salaId }` tras conectarse al namespace `/bookings`. La conexión SHALL requerir un JWT válido en el handshake.

#### Scenario: Conexión exitosa con token válido
- **WHEN** un cliente conecta al namespace `/bookings` con un JWT válido en `handshake.auth.token`
- **THEN** el servidor SHALL aceptar la conexión y el cliente SHALL poder emitir eventos

#### Scenario: Conexión rechazada sin token
- **WHEN** un cliente intenta conectar al namespace `/bookings` sin token o con token inválido
- **THEN** el servidor SHALL rechazar la conexión con error de autenticación

#### Scenario: Suscripción exitosa a sala
- **WHEN** un cliente autenticado emite `subscribe-sala` con `{ salaId: "<uuid>" }`
- **THEN** el servidor SHALL incorporar al cliente en la room de esa sala y SHALL responder con confirmación

#### Scenario: Suscripción a múltiples salas
- **WHEN** un cliente emite `subscribe-sala` varias veces con distintos `salaId`
- **THEN** el cliente SHALL recibir actualizaciones de todas las salas suscritas simultáneamente

---

### Requirement: Emisión push de booking.created tras reserva exitosa
El sistema SHALL emitir el evento `booking.created` a todos los clientes suscritos a la sala afectada inmediatamente después de que `CreateBookingUseCase` persiste la reserva con éxito. El payload SHALL incluir `salaId`, `inicio` y `fin`.

#### Scenario: Evento booking.created enviado a suscriptores de la sala
- **WHEN** se crea exitosamente una reserva para la Sala A
- **THEN** todos los clientes suscritos a la Sala A SHALL recibir el evento `booking.created` con `{ salaId, inicio, fin }` en menos de 1 segundo

#### Scenario: Clientes de otras salas no reciben el evento
- **WHEN** se crea una reserva para la Sala A
- **THEN** los clientes suscritos únicamente a la Sala B NO SHALL recibir el evento `booking.created` de esa reserva

#### Scenario: Evento no emitido si la creación falla
- **WHEN** `CreateBookingUseCase` lanza una excepción (overlap, límite, etc.)
- **THEN** el evento `booking.created` NO SHALL ser emitido a ningún cliente

---

### Requirement: Contrato booking.cancelled preparado
El sistema SHALL definir y exponer el evento `booking.cancelled` en el gateway con payload `{ salaId, bookingId }`, aunque la lógica de cancelación no esté implementada aún. El evento SHALL emitirse cuando un caso de uso futuro de cancelación invoque `IBookingEventPublisher.publishBookingCancelled`.

#### Scenario: Estructura del evento booking.cancelled definida
- **WHEN** se implementa un caso de uso de cancelación que llama a `publishBookingCancelled({ salaId, bookingId })`
- **THEN** el gateway SHALL emitir `booking.cancelled` con ese payload a los suscriptores de la sala

---

### Requirement: Autenticación JWT en el handshake WebSocket
El gateway SHALL rechazar conexiones sin JWT válido utilizando `WsJwtGuard` que verifica el token en `handshake.auth.token` antes de permitir la conexión.

#### Scenario: Token expirado rechazado en handshake
- **WHEN** un cliente intenta conectar con un JWT expirado
- **THEN** el servidor SHALL cerrar la conexión con código de error de autenticación

#### Scenario: Payload del JWT disponible en client.data.user
- **WHEN** un cliente con JWT válido se conecta
- **THEN** `client.data.user` SHALL contener `{ id, email, role }` extraídos del payload del token
