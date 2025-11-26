# 🚀 Guía de Implementación - Sistema de Sesiones de Carga Mejorado

## 📋 Resumen de Cambios

Se han implementado las siguientes funcionalidades al sistema de sesiones de carga:

1. ✅ **Consulta de tarifa** antes de iniciar sesión
2. ✅ **Monitoreo en tiempo real** con actualizaciones cada minuto vía WebSocket
3. ✅ **Cobro proporcional** por tiempo real utilizado
4. ✅ **Finalización automática** cuando termina el tiempo
5. ✅ **Detención manual mejorada** con ajuste de cobro

---

## 🗂️ Archivos Modificados y Creados

### Archivos Modificados
- ✏️ `src/models/SesionCarga.js` - Agregados 3 campos nuevos
- ✏️ `src/models/index.js` - Agregado alias 'Usuario' a relación
- ✏️ `src/services/sesionCarga.service.js` - Refactorizado con WebSocket e IoT
- ✏️ `src/controllers/sesionCarga.controller.js` - Agregado endpoint de tarifa
- ✏️ `src/routes/sesionCarga.routes.js` - Ruta nueva y documentación Swagger
- ✏️ `src/ws/message.handler.js` - Mejorado manejo de confirmaciones IoT
- ✏️ `src/index.js` - Inicialización del servicio de monitoreo

### Archivos Creados
- 🆕 `src/services/sessionMonitor.service.js` - Servicio de monitoreo en tiempo real
- 🆕 `migrations/20251119_agregar_campos_monitoreo_tiempo_real.sql` - Script de migración
- 🆕 `FLUJO_SESION_CARGA_MEJORADO.md` - Documentación del flujo completo
- 🆕 `MEJORAS_Y_BUENAS_PRACTICAS.md` - Guía de arquitectura y patrones
- 🆕 `GUIA_IMPLEMENTACION.md` - Este archivo

---

## 🛠️ Pasos de Instalación

### 1. Migración de Base de Datos

Ejecuta el script SQL para agregar los nuevos campos:

```bash
# Si usas SQL Server Management Studio (SSMS)
# Abre el archivo: migrations/20251119_agregar_campos_monitoreo_tiempo_real.sql
# Ejecuta el script completo
```

O desde línea de comandos:

```bash
sqlcmd -S localhost -d evconnect -i migrations/20251119_agregar_campos_monitoreo_tiempo_real.sql
```

**Campos agregados:**
- `duracion_estimada_min` (INT) - Duración solicitada inicialmente
- `tiempo_transcurrido_min` (DECIMAL 10,2) - Tiempo real transcurrido
- `monto_por_minuto` (DECIMAL 10,2) - Tarifa aplicada en la sesión

**Índices creados:**
- `idx_sesion_estado_activo` - Optimiza búsqueda de sesiones activas
- `idx_sesion_usuario_estado` - Optimiza búsqueda por usuario
- `idx_cargador_estado` - Optimiza búsqueda de cargadores
- `idx_tarifa_vigencia` - Optimiza búsqueda de tarifas

### 2. Instalar Dependencias (si es necesario)

```bash
npm install
```

No se agregaron nuevas dependencias, todo usa las librerías existentes.

### 3. Verificar Variables de Entorno

Asegúrate de tener configuradas las variables en `.env`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx

# Base de Datos
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=evconnect

# Puerto del servidor
PORT=4000
```

### 4. Iniciar el Servidor

```bash
npm run dev
```

Deberías ver en la consola:

```
Server running on http://localhost:4000
WebSocket server initialized on /ws
[SessionMonitor] Iniciando monitoreo de sesiones activas...
[SessionMonitor] Sistema de monitoreo en tiempo real iniciado
```

---

## 🧪 Pruebas Básicas

### 1. Verificar que el servidor está funcionando

```bash
curl http://localhost:4000/health
```

### 2. Consultar tarifa de un cargador

```bash
curl -X GET http://localhost:4000/api/sessions/tarifa/1 \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id_cargador": 1,
    "tipo_carga": "rápida",
    "costo_por_minuto": 5.0,
    "estado": "disponible"
  }
}
```

### 3. Iniciar una sesión de carga

```bash
curl -X POST http://localhost:4000/api/sessions/start \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_cargador": 1,
    "duration_minutes": 30,
    "tipo_carga": "rápida"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Sesión de carga iniciada y pago retenido con éxito",
  "data": {
    "id_sesion": 123,
    "monto_retenido": 150.0,
    "monto_por_minuto": 5.0,
    "duracion_estimada_min": 30
  }
}
```

### 4. Conectar WebSocket para recibir actualizaciones

**Ejemplo en JavaScript:**

```javascript
const token = 'TU_JWT_TOKEN';
const cargadorId = 1;
const ws = new WebSocket(
  `ws://localhost:4000/ws?token=${token}&role=client&cargadorId=${cargadorId}`
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Mensaje recibido:', data.type, data);
};
```

**Mensajes que recibirás:**
- `sesion_iniciada` - Cuando inicia la carga
- `carga_en_progreso` - Cada minuto con el progreso
- `sesion_finalizada` - Cuando termina (automática o manual)

### 5. Detener la sesión manualmente

```bash
curl -X POST http://localhost:4000/api/sessions/stop/123 \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "tiempo_transcurrido_min": 20,
    "duracion_estimada_min": 30,
    "monto_cobrado": 100.0,
    "monto_retenido": 150.0,
    "ahorro": "50.00"
  }
}
```

---

## 📊 Monitoreo y Logs

### Verificar sesiones activas en la base de datos

```sql
SELECT 
    id_sesion,
    id_usuario,
    id_cargador,
    estado,
    duracion_estimada_min,
    tiempo_transcurrido_min,
    monto_por_minuto,
    monto_estimado,
    fecha_inicio
FROM sesion_carga
WHERE estado = 'activa';
```

### Ver logs del servidor

El servicio de monitoreo escribe logs cada minuto:

```
[SessionMonitor] Verificando 3 sesiones activas
[SessionMonitor] Actualización enviada - Sesión 123: 15/30 min, $75.0 MXN
[SessionMonitor] Sesión 124 ha alcanzado el tiempo límite. Finalizando...
[SessionMonitor] Pago capturado exitosamente: $150.0 MXN
```

---

## 🔧 Configuración Avanzada

### Cambiar el intervalo de monitoreo

Por defecto, el monitoreo se ejecuta cada 60 segundos. Para cambiar esto:

**Archivo:** `src/services/sessionMonitor.service.js`

```javascript
class SessionMonitorService {
    static MONITOR_INTERVAL = 30000; // Cambiar a 30 segundos
    // ...
}
```

⚠️ **Nota:** Intervalos muy cortos (< 30 segundos) pueden aumentar la carga en la base de datos.

### Configurar límites de duración

**Archivo:** `src/controllers/sesionCarga.controller.js`

```javascript
if (duration_minutes > 120) { // Cambiar límite máximo
     return res.error(422, 'La duración máxima es de 120 minutos');
}
```

---

## 🐛 Solución de Problemas

### Problema: El monitoreo no envía actualizaciones

**Posible causa:** El servicio no se inició correctamente.

**Solución:**
1. Verifica los logs al iniciar el servidor
2. Busca el mensaje: `[SessionMonitor] Sistema de monitoreo en tiempo real iniciado`
3. Si no aparece, verifica que `src/index.js` tenga:
   ```javascript
   SessionMonitorService.startMonitoring();
   ```

### Problema: WebSocket no recibe mensajes

**Posible causa:** Cliente no está suscrito al cargador correcto.

**Solución:**
1. Verifica que el `cargadorId` en la URL del WebSocket coincida con el de la sesión
2. Verifica que el token JWT sea válido
3. Verifica en los logs del servidor:
   ```
   [WS] Enviando sync_request al cargador 1 para nuevo subscriber
   ```

### Problema: Error al capturar pago en Stripe

**Posible causa:** `id_pago_transaccion` no es válido.

**Solución:**
1. Verifica que la sesión tenga un `id_pago_transaccion` (PaymentIntent ID)
2. En Stripe Dashboard, busca el PaymentIntent y verifica su estado
3. Estado debe ser `requires_capture` para poder capturarlo

### Problema: Sesión no finaliza automáticamente

**Posible causa:** El monitoreo no está corriendo o hay un error en el cálculo del tiempo.

**Solución:**
1. Verifica logs cada minuto: `[SessionMonitor] Verificando X sesiones activas`
2. Verifica que `duracion_estimada_min` esté guardado en la sesión
3. Verifica que `fecha_inicio` sea correcto
4. Ejecuta manualmente:
   ```javascript
   await SessionMonitorService.checkActiveSessions();
   ```

---

## 📚 Documentación Adicional

- **[FLUJO_SESION_CARGA_MEJORADO.md](./FLUJO_SESION_CARGA_MEJORADO.md)** - Flujo completo con ejemplos de request/response
- **[MEJORAS_Y_BUENAS_PRACTICAS.md](./MEJORAS_Y_BUENAS_PRACTICAS.md)** - Arquitectura y patrones aplicados
- **Swagger UI** - http://localhost:4000/api-docs (cuando el servidor está corriendo)

---

## ✅ Checklist de Implementación

Marca cada paso completado:

- [ ] Ejecutar migración SQL
- [ ] Verificar que los campos se agregaron correctamente
- [ ] Iniciar el servidor sin errores
- [ ] Verificar logs de SessionMonitor
- [ ] Probar endpoint de consulta de tarifa
- [ ] Probar inicio de sesión con retención de pago
- [ ] Conectar WebSocket y verificar mensajes
- [ ] Esperar 1-2 minutos y verificar mensajes de progreso
- [ ] Probar detención manual
- [ ] Verificar cobro proporcional en Stripe Dashboard
- [ ] Dejar una sesión completa (30 min) y verificar finalización automática

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs del servidor
2. Verifica la documentación en `FLUJO_SESION_CARGA_MEJORADO.md`
3. Verifica la base de datos con las queries de verificación
4. Revisa el código en los servicios modificados

---

## 🎉 ¡Listo!

El sistema de sesiones de carga mejorado está completamente implementado y listo para usar.

**Características principales:**
- ✅ Transparencia total de costos
- ✅ Monitoreo en tiempo real
- ✅ Cobro justo por tiempo usado
- ✅ Finalización automática
- ✅ Comunicación robusta con IoT
- ✅ Arquitectura escalable

**Próximos pasos recomendados:**
1. Pruebas de carga para verificar rendimiento
2. Configurar alertas para errores en Stripe
3. Implementar notificaciones push además de WebSocket
4. Agregar métricas y dashboards de monitoreo
