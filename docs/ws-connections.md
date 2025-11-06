# Conexiones WebSocket — ESP32 y Backoffice (Dashboard)

Este documento describe las rutas/URLs donde se conectan el cliente ESP32 (cargador) y el usuario Backoffice (Dashboard), con ejemplos de mensajes enviados y recibidos y una breve explicación de cada uno.

## URL base

Asumiendo que el servidor corre en el host y puerto configurados (ver `.env`):

- HTTP server: http://HOST:PORT
- WebSocket endpoint: ws://HOST:PORT/ws

> Nota: la implementación actual en `src/ws/wsServer.js` espera query params con el nombre `role` (ej. `publisher` o `client`) y `estacionId` cuando aplica. En documentación anterior se usó `type=dashboard`; para el MVP recomendamos usar `role` por consistencia con el código.

## Parámetros de conexión (query string)

- `role`: rol del cliente. Valores esperados:
  - `publisher` — normalmente el ESP32 / cargador que publica métricas y eventos.
  - `client` — cliente suscriptor (Dashboard / Backoffice) que recibe actualizaciones.
- `estacionId`: identificador numérico de la estación/cargador (requerido para publisher y client/subscribe).
- `token`: JWT opcional para autenticación (la verificación está comentada por ahora; recomendable activarla en producción).

Ejemplos de URL de conexión

- ESP32 (publisher):

  ws://localhost:3000/ws?role=publisher&estacionId=1

- Dashboard (suscriptor / backoffice):

  ws://localhost:3000/ws?role=client&estacionId=1


## Mensajes — formato y ejemplos

Todos los mensajes se envían como JSON (texto). A continuación se indican los tipos principales usados por el MVP y su significado.

### Desde ESP32 → Backend

- Lectura NFC (ESP32 detecta una tarjeta):

```json
{
  "type": "nfc_scan",
  "nfc_uid": "VIRTUAL-1-A4F2E8"
}
```

Qué hace: notifica al backend que un usuario intentó iniciar sesión con la tarjeta NFC. El backend validará el usuario y creará la sesión.

- Métricas periódicas (ej. cada 3s):

```json
{
  "type": "metrics",
  "session_id": 123,
  "v": 220.5,
  "a": 16.2,
  "w": 3572.1,
  "ts": 1699276425
}
```

Qué hace: envía voltaje, corriente, potencia y timestamp para que el backend calcule energía acumulada, costo y almacene lecturas.

- Detener carga (botón STOP en el ESP32):

```json
{
  "type": "stop",
  "session_id": 123
}
```

Qué hace: notifica al backend que la sesión terminó desde el lado del cargador (usuario físico apretó STOP). El backend finalizará la sesión y guardará el resumen.

- Paro de emergencia:

```json
{
  "type": "emergency",
  "session_id": 123
}
```

Qué hace: evento crítico que debe parar la salida inmediatamente y generar una alerta en el backend y Dashboard.


### Desde Backend → ESP32

- Iniciar sesión (comando para activar relé):

```json
{
  "type": "start",
  "session_id": 123,
  "user_name": "Juan Pérez"
}
```

Qué hace: indica al ESP32 que active el relé y comience la medición para la sesión indicada.

- Detener sesión (comando remoto):

```json
{
  "type": "stop",
  "session_id": 123
}
```

Qué hace: instrucción para desactivar el relé y detener la carga.

- Mensaje de error:

```json
{
  "type": "error",
  "message": "Descripción del error",
  "code": "ERROR_CODE"
}
```

Qué hace: comunica fallas o validaciones fallidas al ESP32.


### Desde Backend → Dashboard (Backoffice)

- Estado inicial / init:

```json
{
  "type": "init",
  "charger": {
    "id": 1,
    "status": "disponible",
    "session": null
  }
}
```

Qué hace: mensaje inicial que describe el estado actual del cargador al abrir el Dashboard.

- Métricas en tiempo real (broadcast desde backend):

```json
{
  "type": "metrics",
  "session_id": 123,
  "charger_id": 1,
  "v": 220.5,
  "a": 16.2,
  "w": 3572.1,
  "kwh": 2.45,
  "cost": 17.15,
  "time": 850
}
```

Qué hace: el Dashboard actualiza la UI con lecturas, energía acumulada, costo y tiempo transcurrido.

- Notificación de sesión iniciada (cuando backend crea sesión):

```json
{
  "type": "session_started",
  "session_id": 123,
  "charger_id": 1,
  "user_name": "Juan Pérez",
  "timestamp": "2025-11-06T12:00:00.000Z"
}
```

Qué hace: informa que una sesión se inició y proporciona datos básicos para la UI.

- Notificación de sesión finalizada:

```json
{
  "type": "session_ended",
  "session_id": 123,
  "charger_id": 1,
  "kwh": 3.12,
  "cost": 21.84,
  "duration": 1200
}
```

Qué hace: resumen de la sesión para mostrar al usuario y/o guardar historial.

- Error / alertas:

```json
{
  "type": "error",
  "message": "ESP32 no conectado"
}
```

o alertas de emergencia:

```json
{
  "type": "emergency",
  "charger_id": 1,
  "session_id": 123,
  "timestamp": "2025-11-06T12:05:00.000Z"
}
```


## Mensajes/de eventos del servidor al conectar

- Cuando un `publisher` se conecta correctamente, el servidor envía:

```json
{ "type": "connected", "role": "publisher", "estacionId": "1" }
```

- Cuando un `client` (dashboard) se suscribe:

```json
{ "type": "subscribed", "estacionId": "1" }
```

- Cuando un cliente se suscribe y ya existe un publisher conectado, el servidor pedirá sincronización al publisher:

Publisher recibe:

```json
{ "type": "sync_request", "from": "server" }
```

Esto permite al publisher reenviar el estado o métricas iniciales al nuevo subscriber.


## Códigos de cierre / validación (ejemplos usados en `wsServer.js`)

- `4003` — token inválido (comentado en la implementación actual).
- `4004` — falta `estacionId` para `publisher`.
- `4005` — `Estacion` no encontrada en base de datos.
- `4006` — falta `estacionId` para `client`.

Si el servidor detecta un problema en la conexión, cerrará la conexión con uno de estos códigos y una razón.


## Flujo ejemplo (inicio de sesión via NFC)

1. ESP32 detecta tarjeta y envía:

```json
{ "type": "nfc_scan", "nfc_uid": "VIRTUAL-1-A4F2E8" }
```

2. Backend valida y crea sesión (SessionService) y responde al ESP32 con:

```json
{ "type": "start", "session_id": 123, "user_name": "Juan Pérez" }
```

3. ESP32 activa relé y comienza a enviar `metrics` periódicos.

4. Backend procesa métricas, guarda lecturas y reenvía datos al Dashboard:

```json
{ "type": "metrics", "session_id": 123, "charger_id": 1, "v": 220.5, "a": 16.2, "w": 3572.1, "kwh": 2.45, "cost": 17.15 }
```

5. Cuando se presiona STOP en el ESP32 o en el Dashboard, se envía `stop` y el backend finaliza la sesión y notifica el `session_ended` al Dashboard.


## Recomendaciones rápidas

- Para el MVP, usar `role=publisher` para ESP32 y `role=client` para Dashboard.
- Añadir `token` y validar JWT en `wsServer.js` antes de aceptar conexiones en producción.
- Mantener `estacionId` en todos los mensajes relevantes para direccionar correctamente en escenarios con múltiples cargadores.
- Manejar reintentos y reconexiones en el ESP32 y en el Dashboard.


## Ejemplos de prueba (herramientas)

Puedes probar conexiones con `wscat` o herramientas similares:

```powershell
# Suscribir (dashboard):
wscat -c "ws://localhost:3000/ws?role=client&estacionId=1"

# Conectar como publisher (simula ESP32):
wscat -c "ws://localhost:3000/ws?role=publisher&estacionId=1"
```

> Ajusta `localhost:3000` según tu configuración en `.env`.


---

Archivo creado automáticamente para el MVP. Si quieres, puedo:
- Generar una versión en `src/docs/` o integrarla en `MVP.md`.
- Implementar en el servidor la compatibilidad para `type=dashboard` si prefieres esa convención.
