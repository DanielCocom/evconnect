# 🧪 Ejemplos de Uso - API Stripe EVCONNECT

Este archivo contiene ejemplos prácticos de uso de los endpoints de Stripe.

---

## 🔐 AUTENTICACIÓN

Todos los endpoints (excepto webhooks) requieren token JWT:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 EJEMPLOS DE REQUESTS

### 1. Registrar Usuario (con Customer de Stripe automático)

**Endpoint**: `POST /api/user/register`

```json
{
  "nombre": "María",
  "apellido_paterno": "González",
  "apellido_materno": "Hernández",
  "email": "maria@evconnect.com",
  "password": "password123"
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Usuario creado correctamente",
  "data": {
    "id_usuario": 5,
    "nombre": "María",
    "apellido_paterno": "González",
    "apellido_materno": "Hernández",
    "email": "maria@evconnect.com",
    "stripe_customer_id": "cus_P8xYz123ABC",
    "tarjeta_verificada": false,
    "saldo_virtual": 0,
    "fecha_registro": "2025-11-05T10:30:00.000Z"
  }
}
```

---

### 2. Login

**Endpoint**: `POST /api/user/login`

```json
{
  "email": "maria@evconnect.com",
  "password": "password123"
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Inicio de sesión correcto",
  "data": {
    "user": {
      "id_usuario": 5,
      "nombre": "María",
      "email": "maria@evconnect.com",
      "stripe_customer_id": "cus_P8xYz123ABC"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ Guardar el token para las siguientes peticiones**

---

### 3. Crear SetupIntent (Iniciar proceso de vincular tarjeta)

**Endpoint**: `POST /api/payment-methods/setup`

**Headers**:
```
Authorization: Bearer <tu_token>
```

**Respuesta**:
```json
{
  "success": true,
  "message": "SetupIntent creado. Usa el client_secret en el frontend.",
  "data": {
    "client_secret": "seti_1OYxXxXxXxXxXxXx_secret_XxXxXxXxXxXxXx",
    "setup_intent_id": "seti_1OYxXxXxXxXxXxXx"
  }
}
```

**📱 En el Frontend (React/Vue/Angular)**:

```javascript
import { loadStripe } from '@stripe/stripe-js';

// Inicializar Stripe
const stripe = await loadStripe('pk_test_xxxxx');

// Confirmar tarjeta con el client_secret
const { error, setupIntent } = await stripe.confirmCardSetup(
  client_secret,
  {
    payment_method: {
      card: cardElement, // Stripe Card Element
      billing_details: {
        name: 'María González',
        email: 'maria@evconnect.com'
      }
    }
  }
);

if (error) {
  console.error('Error:', error.message);
} else {
  // Enviar payment_method_id al backend
  const paymentMethodId = setupIntent.payment_method;
  console.log('Payment Method ID:', paymentMethodId);
  
  // Siguiente paso: POST /api/payment-methods
}
```

**🧪 Para Testing (sin frontend)**:

Usa tarjetas de prueba de Stripe:

| Tarjeta | CVC | Fecha | Resultado |
|---------|-----|-------|-----------|
| 4242 4242 4242 4242 | 123 | 12/28 | ✅ Éxito |
| 4000 0000 0000 0002 | 123 | 12/28 | ❌ Decline |
| 4000 0025 0000 3155 | 123 | 12/28 | 🔒 Requiere 3D Secure |

Puedes simular el proceso con Stripe CLI:

```bash
stripe payment_methods create --type=card \
  --card[number]=4242424242424242 \
  --card[exp_month]=12 \
  --card[exp_year]=2028 \
  --card[cvc]=123
```

---

### 4. Agregar Método de Pago

**Endpoint**: `POST /api/payment-methods`

**Headers**:
```
Authorization: Bearer <tu_token>
```

**Body**:
```json
{
  "payment_method_id": "pm_1OYxXxXxXxXxXxXx"
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Tarjeta vinculada correctamente",
  "data": {
    "id_pago": 12,
    "tipo": "visa",
    "ultimos_digitos": "4242",
    "marca": "visa",
    "expira": "12/2028",
    "es_predeterminado": true
  }
}
```

---

### 5. Listar Métodos de Pago

**Endpoint**: `GET /api/payment-methods`

**Headers**:
```
Authorization: Bearer <tu_token>
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Métodos de pago obtenidos",
  "data": [
    {
      "id_pago": 12,
      "payment_method_id": "pm_1OYxXxXxXxXxXxXx",
      "tipo": "visa",
      "ultimos_digitos": "4242",
      "expira": "12/2028",
      "es_predeterminado": true
    },
    {
      "id_pago": 13,
      "payment_method_id": "pm_1OZaAbCdEfGhIjKl",
      "tipo": "mastercard",
      "ultimos_digitos": "5555",
      "expira": "08/2027",
      "es_predeterminado": false
    }
  ]
}
```

---

### 6. Marcar Tarjeta como Predeterminada

**Endpoint**: `PATCH /api/payment-methods/:id/default`

**Headers**:
```
Authorization: Bearer <tu_token>
```

**Ejemplo**: `PATCH /api/payment-methods/13/default`

**Respuesta**:
```json
{
  "success": true,
  "message": "Tarjeta predeterminada actualizada",
  "data": {
    "message": "Tarjeta predeterminada actualizada"
  }
}
```

---

### 7. Eliminar Método de Pago

**Endpoint**: `DELETE /api/payment-methods/:id`

**Headers**:
```
Authorization: Bearer <tu_token>
```

**Ejemplo**: `DELETE /api/payment-methods/12`

**Respuesta**:
```json
{
  "success": true,
  "message": "Tarjeta eliminada correctamente",
  "data": {
    "message": "Método de pago eliminado correctamente"
  }
}
```

**⚠️ No se puede eliminar si es la única tarjeta**:
```json
{
  "success": false,
  "message": "No puedes eliminar tu única tarjeta. Agrega otra primero.",
  "error": null
}
```

---

### 8. Iniciar Sesión de Carga

**Endpoint**: `POST /api/sesiones/iniciar` *(endpoint por crear)*

**Headers**:
```
Authorization: Bearer <tu_token>
```

**Body**:
```json
{
  "id_cargador": 5,
  "id_tarifa": 2
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Sesión iniciada correctamente",
  "data": {
    "id_sesion": 42,
    "estado": "en_progreso",
    "monto_estimado": 500.00,
    "payment_intent_id": "pi_3OYxXxXxXxXxXxXx",
    "payment_status": "requires_capture"
  }
}
```

**💡 Nota**: 
- El monto se **autoriza** pero NO se cobra aún
- El estado del PaymentIntent es `requires_capture`
- Los fondos quedan "retenidos" en la tarjeta

---

### 9. Finalizar Sesión de Carga

**Endpoint**: `POST /api/sesiones/:id/finalizar` *(endpoint por crear)*

**Headers**:
```
Authorization: Bearer <tu_token>
```

**Ejemplo**: `POST /api/sesiones/42/finalizar`

**Body**:
```json
{
  "energia_consumida_kwh": 15.5
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Sesión finalizada correctamente",
  "data": {
    "id_sesion": 42,
    "estado": "completada",
    "energia_consumida_kwh": 15.5,
    "monto_final": 77.50,
    "payment_status": "succeeded"
  }
}
```

**💡 Nota**: 
- Se **captura** el monto real basado en el consumo
- Si consumió menos del estimado, solo se cobra lo real
- El PaymentIntent pasa a `succeeded`

---

### 10. Cancelar Sesión de Carga

**Endpoint**: `POST /api/sesiones/:id/cancelar` *(endpoint por crear)*

**Headers**:
```
Authorization: Bearer <tu_token>
```

**Ejemplo**: `POST /api/sesiones/42/cancelar`

**Body**:
```json
{
  "razon": "Usuario canceló desde la app"
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Sesión cancelada",
  "data": {
    "id_sesion": 42,
    "estado": "cancelada",
    "razon": "Usuario canceló desde la app"
  }
}
```

**💡 Nota**: 
- Se **libera** la autorización del pago
- Los fondos retenidos vuelven a estar disponibles
- No se cobra nada

---

### 11. Reembolsar Sesión (Admin)

**Endpoint**: `POST /api/admin/sesiones/:id/reembolsar` *(endpoint por crear)*

**Headers**:
```
Authorization: Bearer <admin_token>
```

**Body**:
```json
{
  "monto": 50.00,
  "razon": "Falla en el cargador"
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Reembolso procesado",
  "data": {
    "id_sesion": 42,
    "estado": "reembolsada",
    "monto_reembolsado": 50.00,
    "refund_id": "re_3OYxXxXxXxXxXxXx"
  }
}
```

---

## 🔔 WEBHOOKS

### Recibir Eventos de Stripe

**Endpoint**: `POST /api/webhooks/stripe`

**Headers** (enviados por Stripe):
```
stripe-signature: t=1699...,v1=abc123...
Content-Type: application/json
```

**Body** (ejemplo de pago exitoso):
```json
{
  "id": "evt_1OYxXxXxXxXxXxXx",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3OYxXxXxXxXxXxXx",
      "amount": 7750,
      "amount_received": 7750,
      "currency": "mxn",
      "status": "succeeded",
      "metadata": {
        "user_id": "5",
        "cargador_id": "5",
        "tarifa_id": "2"
      }
    }
  }
}
```

**Respuesta**:
```json
{
  "received": true
}
```

**Eventos Manejados**:
- ✅ `payment_intent.succeeded` - Actualiza sesión a "completada"
- ❌ `payment_intent.payment_failed` - Marca como "pago_fallido"
- 🔗 `payment_method.attached` - Log de tarjeta vinculada
- 🔓 `payment_method.detached` - Log de tarjeta eliminada
- ⚠️ `charge.dispute.created` - ALERTA de disputa/chargeback

---

## 🧪 TESTING CON CURL

### Registrar Usuario
```bash
curl -X POST http://localhost:4000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test",
    "apellido_paterno": "User",
    "email": "test@test.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123"
  }'
```

### Crear SetupIntent
```bash
curl -X POST http://localhost:4000/api/payment-methods/setup \
  -H "Authorization: Bearer <tu_token>"
```

### Listar Tarjetas
```bash
curl -X GET http://localhost:4000/api/payment-methods \
  -H "Authorization: Bearer <tu_token>"
```

---

## 🧪 TESTING CON POSTMAN

1. **Importar variables de entorno**:

```json
{
  "name": "EVCONNECT Stripe",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:4000",
      "enabled": true
    },
    {
      "key": "token",
      "value": "",
      "enabled": true
    },
    {
      "key": "stripe_public_key",
      "value": "pk_test_xxxxx",
      "enabled": true
    }
  ]
}
```

2. **Crear colección con estos endpoints**:
   - POST {{base_url}}/api/user/register
   - POST {{base_url}}/api/user/login
   - POST {{base_url}}/api/payment-methods/setup
   - GET {{base_url}}/api/payment-methods
   - etc.

3. **Script para guardar token automáticamente**:

En el request de Login, pestaña "Tests":
```javascript
var jsonData = pm.response.json();
if (jsonData.data && jsonData.data.token) {
    pm.environment.set("token", jsonData.data.token);
}
```

---

## 📊 FLUJO COMPLETO EJEMPLO

```
1. Usuario registra cuenta
   POST /api/user/register
   └─> stripe_customer_id creado automáticamente

2. Usuario hace login
   POST /api/user/login
   └─> Recibe token JWT

3. Usuario vincula tarjeta
   POST /api/payment-methods/setup
   └─> Recibe client_secret
   
   [Frontend confirma con Stripe.js]
   └─> Obtiene payment_method_id
   
   POST /api/payment-methods
   └─> Guarda tarjeta en BD

4. Usuario inicia carga
   POST /api/sesiones/iniciar
   └─> Autoriza $500 MXN (estimado)
   └─> PaymentIntent: requires_capture

5. Usuario carga su vehículo
   [IoT envía lecturas en tiempo real]

6. Usuario finaliza carga
   POST /api/sesiones/42/finalizar
   └─> Consumió 15.5 kWh = $77.50 MXN
   └─> Captura $77.50 (no $500)
   └─> PaymentIntent: succeeded

7. Webhook de Stripe confirma
   POST /api/webhooks/stripe
   └─> payment_intent.succeeded
   └─> Actualiza SesionCarga a "completada"

✅ Sesión completada
✅ Usuario cobrado correctamente
✅ Registro en BD actualizado
```

---

## 🐛 MANEJO DE ERRORES

### Error: Usuario sin Stripe Customer
```json
{
  "success": false,
  "message": "Usuario sin cuenta Stripe. Contacte soporte.",
  "error": null
}
```
**Solución**: Ejecutar script de migración de usuarios.

---

### Error: Tarjeta Rechazada
```json
{
  "success": false,
  "message": "Error al autorizar pago: Your card was declined.",
  "error": null
}
```
**Solución**: Verificar fondos o usar otra tarjeta.

---

### Error: Webhook Signature Inválida
```json
{
  "error": "Webhook signature verification failed"
}
```
**Solución**: Verificar `STRIPE_WEBHOOK_SECRET` en `.env`.

---

### Error: No se puede eliminar única tarjeta
```json
{
  "success": false,
  "message": "No puedes eliminar tu única tarjeta. Agrega otra primero.",
  "error": null
}
```
**Solución**: Agregar otra tarjeta antes de eliminar.

---

## ✅ CHECKLIST DE PRUEBAS

- [ ] Registrar usuario → Verificar `stripe_customer_id`
- [ ] Login → Obtener token
- [ ] Crear SetupIntent → Obtener client_secret
- [ ] Agregar tarjeta → Verificar en Stripe Dashboard
- [ ] Listar tarjetas → Ver tarjetas guardadas
- [ ] Marcar como predeterminada → Verificar cambio
- [ ] Eliminar tarjeta → Confirmar eliminación
- [ ] Iniciar sesión de carga → Verificar autorización
- [ ] Finalizar sesión → Confirmar captura
- [ ] Cancelar sesión → Verificar liberación
- [ ] Webhook de pago exitoso → Actualiza BD
- [ ] Webhook de pago fallido → Marca error

---

**¡API de Stripe lista para usar! 🚀**
