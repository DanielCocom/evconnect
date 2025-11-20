# Flujo de Sesión de Carga con Monitoreo en Tiempo Real

## 📋 Descripción General

Este documento describe el flujo completo de una sesión de carga con las nuevas funcionalidades implementadas:
- **Consulta de tarifas** antes de iniciar
- **Monitoreo en tiempo real** vía WebSocket cada minuto
- **Cobro proporcional** por tiempo real utilizado
- **Finalización automática** cuando termina el tiempo
- **Detención manual** con ajuste de cobro

---

## 🔄 Flujo Completo

### **1. Consulta de Tarifa (Paso Inicial)**

**Endpoint:** `GET /api/sessions/tarifa/:id_cargador`

El usuario móvil escanea el código NFC del cargador y obtiene la información de tarifa.

**Request:**
```http
GET /api/sessions/tarifa/123
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Información de tarifa del cargador",
  "data": {
    "id_cargador": 123,
    "tipo_carga": "rápida",
    "capacidad_kw": 50,
    "estado": "disponible",
    "id_tarifa": 45,
    "costo_por_minuto": 5.0,
    "mensaje": "Cargador disponible. Tarifa: $5.0 MXN por minuto."
  }
}
```

**Validaciones:**
- ✅ Cargador existe
- ✅ Estado = 'disponible'
- ✅ Tarifa vigente configurada

---

### **2. Iniciar Sesión de Carga**

**Endpoint:** `POST /api/sessions/start`

El usuario selecciona la duración deseada (ej: 30 minutos) y confirma el inicio.

**Request:**
```json
{
  "id_cargador": 123,
  "duration_minutes": 30,
  "tipo_carga": "rápida"
}
```

**Proceso Backend:**
1. ✅ Valida usuario y método de pago
2. 💳 **Retiene** $150 MXN en Stripe (30 min × $5)
3. 🔒 Marca cargador como 'ocupado'
4. 📝 Crea sesión en estado 'activa'
5. 🚀 Envía comando `START` al IoT
6. 📡 Notifica al usuario vía WebSocket

**Response:**
```json
{
  "success": true,
  "message": "Sesión de carga iniciada y pago retenido con éxito",
  "data": {
    "id_sesion": 789,
    "id_cargador": 123,
    "monto_retenido": 150.0,
    "monto_por_minuto": 5.0,
    "duracion_estimada_min": 30,
    "fecha_inicio": "2025-11-19T10:00:00Z",
    "mensaje": "Sesión iniciada. Conecta tu vehículo al cargador."
  }
}
```

**Mensaje WebSocket al Usuario:**
```json
{
  "type": "sesion_iniciada",
  "id_sesion": 789,
  "id_cargador": 123,
  "duracion_estimada_min": 30,
  "monto_retenido": 150.0,
  "monto_por_minuto": 5.0,
  "fecha_inicio": "2025-11-19T10:00:00Z",
  "timestamp": "2025-11-19T10:00:00Z"
}
```

**Comando al IoT:**
```json
{
  "command": "START",
  "cargadorId": 123,
  "duration": 30,
  "sesionId": 789,
  "userId": 456,
  "timestamp": "2025-11-19T10:00:00Z"
}
```

---

### **3. Monitoreo en Tiempo Real (Cada 60 segundos)**

El servicio `SessionMonitorService` envía actualizaciones automáticamente cada minuto.

**Mensajes WebSocket al Usuario:**

**Minuto 1:**
```json
{
  "type": "carga_en_progreso",
  "id_sesion": 789,
  "id_cargador": 123,
  "tiempo_transcurrido_min": 1,
  "tiempo_restante_min": 29,
  "duracion_estimada_min": 30,
  "monto_por_minuto": 5.0,
  "monto_acumulado": 5.0,
  "porcentaje_completado": 3,
  "timestamp": "2025-11-19T10:01:00Z"
}
```

**Minuto 15:**
```json
{
  "type": "carga_en_progreso",
  "id_sesion": 789,
  "id_cargador": 123,
  "tiempo_transcurrido_min": 15,
  "tiempo_restante_min": 15,
  "duracion_estimada_min": 30,
  "monto_por_minuto": 5.0,
  "monto_acumulado": 75.0,
  "porcentaje_completado": 50,
  "timestamp": "2025-11-19T10:15:00Z"
}
```

---

### **4A. Finalización Automática (Tiempo Completo)**

Cuando el tiempo se agota (30 minutos), el sistema finaliza automáticamente:

**Proceso Automático:**
1. 💳 **Captura** $150 MXN en Stripe
2. 🛑 Envía comando `STOP` al IoT
3. 🔓 Marca cargador como 'disponible'
4. ✅ Actualiza sesión a 'finalizada'
5. 📡 Notifica al usuario

**Mensaje WebSocket Final:**
```json
{
  "type": "sesion_finalizada",
  "razon": "tiempo_completado",
  "id_sesion": 789,
  "id_cargador": 123,
  "tiempo_transcurrido_min": 30,
  "duracion_estimada_min": 30,
  "monto_cobrado": 150.0,
  "energia_consumida_kwh": 15.5,
  "fecha_inicio": "2025-11-19T10:00:00Z",
  "fecha_fin": "2025-11-19T10:30:00Z",
  "stripe_status": "succeeded",
  "timestamp": "2025-11-19T10:30:00Z"
}
```

---

### **4B. Detención Manual (Usuario Detiene Antes)**

**Endpoint:** `POST /api/sessions/stop/:id`

El usuario decide detener la carga después de 20 minutos (en lugar de 30).

**Request:**
```http
POST /api/sessions/stop/789
Authorization: Bearer <jwt_token>
```

**Proceso Backend:**
1. ⏱️ Calcula tiempo real: 20 minutos
2. 💰 Calcula monto proporcional: $100 (20 × $5)
3. 💳 **Captura** solo $100 MXN (no $150)
4. 🛑 Envía comando `STOP` al IoT
5. 🔓 Marca cargador como 'disponible'
6. ✅ Actualiza sesión a 'finalizada'

**Response HTTP:**
```json
{
  "success": true,
  "message": "Sesión de carga finalizada y cobro completado",
  "data": {
    "id_sesion": 789,
    "id_cargador": 123,
    "tiempo_transcurrido_min": 20,
    "duracion_estimada_min": 30,
    "monto_cobrado": 100.0,
    "monto_retenido": 150.0,
    "ahorro": "50.00",
    "stripe_status": "succeeded",
    "mensaje": "Cobro completado por 20 minutos: $100.0 MXN"
  }
}
```

**Mensaje WebSocket:**
```json
{
  "type": "sesion_finalizada",
  "razon": "detencion_manual",
  "id_sesion": 789,
  "id_cargador": 123,
  "tiempo_transcurrido_min": 20,
  "duracion_estimada_min": 30,
  "monto_cobrado": 100.0,
  "monto_retenido": 150.0,
  "ahorro": "50.00",
  "energia_consumida_kwh": 10.3,
  "fecha_inicio": "2025-11-19T10:00:00Z",
  "fecha_fin": "2025-11-19T10:20:00Z",
  "stripe_status": "succeeded",
  "timestamp": "2025-11-19T10:20:00Z"
}
```

---

## 📊 Base de Datos

### Campos Agregados al Modelo `SesionCarga`

```javascript
{
  // ... campos existentes ...
  
  // NUEVOS CAMPOS
  duracion_estimada_min: INTEGER,      // 30
  tiempo_transcurrido_min: DECIMAL,    // 20.00
  monto_por_minuto: DECIMAL            // 5.00
}
```

---

## 🔌 Comunicación con IoT

### Comandos Enviados al Cargador

**1. START (Iniciar Carga)**
```json
{
  "command": "START",
  "cargadorId": 123,
  "duration": 30,
  "sesionId": 789,
  "userId": 456,
  "timestamp": "2025-11-19T10:00:00Z"
}
```

**2. STOP (Detener Carga)**
```json
{
  "command": "STOP",
  "cargadorId": 123,
  "sesionId": 789,
  "razon": "detencion_manual", // o "tiempo_completado"
  "timestamp": "2025-11-19T10:20:00Z"
}
```

### Confirmaciones del IoT

El cargador debe responder confirmando la ejecución:

```json
{
  "type": "confirmacion_comando",
  "comando": "START", // o "STOP"
  "sesionId": 789,
  "estado": "ejecutado",
  "timestamp": "2025-11-19T10:00:05Z"
}
```

---

## 💳 Flujo de Pagos con Stripe

### Paso 1: Retención (Authorization)
```javascript
// Al iniciar sesión
const paymentIntent = await stripe.paymentIntents.create({
  amount: 15000, // $150.00 en centavos
  currency: 'mxn',
  customer: 'cus_xxxx',
  payment_method: 'pm_xxxx',
  capture_method: 'manual', // ⚠️ CRÍTICO: No cobrar aún
  confirm: true
});
// Estado: 'requires_capture'
```

### Paso 2A: Captura Total (Tiempo completo)
```javascript
// Después de 30 minutos
await stripe.paymentIntents.capture('pi_xxxx', {
  amount_to_capture: 15000 // Capturar todo
});
```

### Paso 2B: Captura Parcial (Detención manual)
```javascript
// Después de 20 minutos
await stripe.paymentIntents.capture('pi_xxxx', {
  amount_to_capture: 10000 // Solo $100
});
// Los $50 restantes se liberan automáticamente
```

---

## 📱 Integración WebSocket en App Móvil

### Conexión al WebSocket

```javascript
const ws = new WebSocket(
  `ws://localhost:4000/ws?token=${jwtToken}&role=client&cargadorId=123`
);

ws.onopen = () => {
  console.log('Conectado al cargador 123');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'sesion_iniciada':
      console.log('Sesión iniciada:', data);
      break;
      
    case 'carga_en_progreso':
      // Actualizar UI cada minuto
      updateProgress(
        data.tiempo_transcurrido_min,
        data.tiempo_restante_min,
        data.monto_acumulado,
        data.porcentaje_completado
      );
      break;
      
    case 'sesion_finalizada':
      console.log('Sesión finalizada:', data.razon);
      showSummary(data);
      ws.close();
      break;
      
    case 'comando_confirmado':
      console.log('IoT confirmó:', data.comando);
      break;
  }
};
```

---

## ⚙️ Configuración del Servicio de Monitoreo

El servicio `SessionMonitorService` se inicia automáticamente al arrancar el servidor:

```javascript
// src/index.js
const { SessionMonitorService } = require('./services/sessionMonitor.service');

server.listen(PORT, () => {
  SessionMonitorService.startMonitoring();
  console.log('Sistema de monitoreo iniciado');
});
```

**Características:**
- ⏰ Ejecuta cada 60 segundos
- 🔍 Verifica todas las sesiones activas
- 📊 Calcula progreso y montos en tiempo real
- 📡 Envía actualizaciones vía WebSocket
- ⚡ Finaliza automáticamente cuando termina el tiempo

---

## 🎯 Validaciones Implementadas

### En `startChargeSession`:
- ✅ Usuario existe y tiene tarjeta registrada
- ✅ No tiene otra sesión activa
- ✅ Cargador existe y está disponible
- ✅ Tarifa vigente configurada
- ✅ Duración entre 1 y 120 minutos
- ✅ Pago autorizado en Stripe
- ✅ IoT responde al comando START

### En `completeChargeSession` (detención manual):
- ✅ Sesión existe y está activa
- ✅ Sesión pertenece al usuario
- ✅ Tiempo transcurrido > 0
- ✅ Cobro proporcional correcto
- ✅ Stripe captura exitosa

---

## 🚀 Mejoras Implementadas

### 1. **Transparencia Total**
- Usuario ve el costo en tiempo real
- Notificaciones minuto a minuto
- Historial completo de la sesión

### 2. **Cobro Justo**
- Solo paga por el tiempo usado
- No penalización por detener antes
- Retención vs. Cobro claramente diferenciados

### 3. **Comunicación IoT Robusta**
- Comandos START/STOP explícitos
- Confirmaciones del dispositivo
- Manejo de errores y timeouts

### 4. **Arquitectura Escalable**
- Monitoreo centralizado para múltiples sesiones
- WebSocket pub/sub eficiente
- Separación de responsabilidades

---

## 📝 Notas de Migración de Base de Datos

**Ejecutar en SQL:**

```sql
ALTER TABLE sesion_carga 
ADD COLUMN duracion_estimada_min INT COMMENT 'Duración en minutos solicitada inicialmente',
ADD COLUMN tiempo_transcurrido_min DECIMAL(10,2) DEFAULT 0 COMMENT 'Tiempo real transcurrido',
ADD COLUMN monto_por_minuto DECIMAL(10,2) COMMENT 'Tarifa por minuto aplicada';
```

---

## 🔍 Ejemplo Completo de Caso de Uso

**Escenario:** Usuario carga su vehículo durante 20 de 30 minutos solicitados.

| Tiempo | Acción | Monto Retenido | Monto Cobrado |
|--------|--------|----------------|---------------|
| 10:00 | Usuario inicia (30 min) | $150 | $0 |
| 10:01 | Actualización WS | $150 | $5 (acum.) |
| 10:10 | Actualización WS | $150 | $50 (acum.) |
| 10:20 | Usuario detiene | $150 | **$100 capturado** |
| 10:20 | Finalización | $0 liberado | $100 final |

**Resultado:** Usuario pagó $100 en lugar de $150 (ahorro de $50).

---

## 📞 Soporte

Para dudas sobre la implementación, revisar:
- `src/services/sesionCarga.service.js`
- `src/services/sessionMonitor.service.js`
- `src/ws/message.handler.js`
- `src/controllers/sesionCarga.controller.js`
