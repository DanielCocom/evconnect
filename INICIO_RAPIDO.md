# 🚀 Inicio Rápido - Flujo NFC

## Requisitos Previos

1. **Base de datos configurada** con las tablas:
   - `cargador`
   - `tarifa`
   - `estacion`

2. **Servidor corriendo**:
   ```bash
   npm install
   npm start
   ```

3. **Datos de prueba** (al menos un cargador con tarifa vigente)

---

## 🧪 Probar la Implementación

### Opción 1: Script Automatizado (Recomendado)

```bash
node test-nfc-flow.js
```

Este script probará:
- ✅ Endpoint REST de tarifas
- ✅ Conexión WebSocket como cliente
- ✅ Simulación de cargador IoT

### Opción 2: Pruebas Manuales

#### 1. Probar el endpoint de tarifas

**Con curl:**
```bash
curl "http://localhost:3000/api/stations/tariffs?id_cargador=1"
```

**Con Thunder Client / Postman:**
```
GET http://localhost:3000/api/stations/tariffs?id_cargador=1
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Tarifa obtenida correctamente",
  "data": {
    "cargador": {
      "id_cargador": 1,
      "id_estacion": 5,
      "tipo_carga": "rapida",
      "estado": "disponible",
      "capacidad_kw": 50.0
    },
    "tarifa": {
      "id_tarifa": 12,
      "costo_kw_h": 4.50,
      "costo_tiempo_min": 0.75,
      "fecha_inicio_vigencia": "2024-01-01",
      "fecha_fin_vigencia": null
    }
  }
}
```

#### 2. Probar WebSocket

**Instalar wscat:**
```bash
npm install -g wscat
```

**Conectar como cliente (App móvil):**
```bash
wscat -c "ws://localhost:3000/ws?cargadorId=1&role=client"
```

**Mensaje que deberías recibir:**
```json
{
  "type": "subscribed",
  "cargadorId": "1",
  "estado_cargador": "disponible",
  "tipo_carga": "rapida",
  "capacidad_kw": 50.0,
  "conectado": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Conectar como cargador IoT (en otra terminal):**
```bash
wscat -c "ws://localhost:3000/ws?cargadorId=1&role=publisher"
```

**Enviar mensaje de sincronización:**
```json
{
  "type": "sync_response",
  "cargadorId": 1,
  "estado": "disponible",
  "telemetria": {
    "voltaje_v": 220.5,
    "corriente_a": 0.0,
    "potencia_w": 0.0,
    "temperatura_c": 25.3,
    "estado_rele": false
  }
}
```

Los clientes conectados deberían recibir este mensaje en tiempo real.

---

## 📊 Crear Datos de Prueba

Si no tienes datos en la BD, ejecuta estos INSERT:

```sql
-- Insertar estación de prueba
INSERT INTO estacion (id_franquicia, nombre_estacion, direccion, ubicacion_lat, ubicacion_lon, total_cargadores, estado_operacion)
VALUES (1, 'Estación Centro', 'Calle Principal 123', 19.4326, -99.1332, 2, 'activa');

-- Insertar cargador de prueba (usar el id_estacion generado arriba)
INSERT INTO cargador (id_estacion, tipo_carga, capacidad_kw, estado, fecha_instalacion, firmware_version)
VALUES (1, 'rapida', 50.00, 'disponible', NOW(), 'v1.0.0');

-- Insertar tarifa vigente (usar el id_estacion del cargador)
INSERT INTO tarifa (id_estacion, tipo_carga, costo_kw_h, costo_tiempo_min, fecha_inicio_vigencia, fecha_fin_vigencia)
VALUES (1, 'rapida', 4.500, 0.750, '2024-01-01', NULL);
```

---

## 🔍 Verificar Logs del Servidor

Al probar, deberías ver logs como:

```
WebSocket server initialized on /ws
[WS] Enviando sync_request al cargador 1 para nuevo subscriber
[IoT] Respuesta de sincronización del cargador 1: {...}
```

---

## 📱 Integración con App Móvil

### Ejemplo de código React Native:

```javascript
// 1. Escanear NFC
import NfcManager from 'react-native-nfc-manager';

async function scanCharger() {
  await NfcManager.requestTechnology(NfcTech.Ndef);
  const tag = await NfcManager.getTag();
  const cargadorId = extractIdFromTag(tag); // Implementar según formato de NFC
  return cargadorId;
}

// 2. Obtener tarifas
async function getTariffs(cargadorId) {
  const response = await fetch(
    `https://api.evconnect.com/api/stations/tariffs?id_cargador=${cargadorId}`
  );
  const data = await response.json();
  return data.data; // { cargador, tarifa }
}

// 3. Conectar WebSocket
import WebSocket from 'react-native-websocket';

const ws = new WebSocket(
  `wss://api.evconnect.com/ws?cargadorId=${cargadorId}&role=client`
);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'subscribed') {
    console.log('Estado inicial:', message.estado_cargador);
  } else if (message.from === 'publisher') {
    console.log('Actualización del cargador:', message.payload);
  }
};
```

---

## 🛠️ Troubleshooting

### Error: "El parámetro id_cargador es requerido"
- Verifica que estés enviando `?id_cargador=X` en la URL

### Error: "Cargador no encontrado"
- Verifica que el ID del cargador exista en la tabla `cargador`
- Ejecuta: `SELECT * FROM cargador WHERE id_cargador = 1;`

### Error: "No hay tarifa vigente..."
- Verifica que exista una tarifa para ese cargador
- Verifica que `fecha_inicio_vigencia <= HOY`
- Verifica que `fecha_fin_vigencia` sea NULL o `>= HOY`
- Ejecuta:
  ```sql
  SELECT * FROM tarifa 
  WHERE id_estacion = (SELECT id_estacion FROM cargador WHERE id_cargador = 1)
    AND tipo_carga = (SELECT tipo_carga FROM cargador WHERE id_cargador = 1)
    AND fecha_inicio_vigencia <= CURDATE()
    AND (fecha_fin_vigencia IS NULL OR fecha_fin_vigencia >= CURDATE());
  ```

### WebSocket no se conecta
- Verifica que el servidor esté corriendo
- Verifica que uses `ws://` (no `http://`)
- Verifica que el parámetro `cargadorId` esté presente

### No recibo mensajes de sincronización
- El cargador IoT debe estar conectado como `role=publisher`
- Verifica los logs del servidor para ver si se envió el `sync_request`

---

## 📚 Documentación Completa

Para más detalles, consulta:
- **FLUJO_NFC_CARGA.md** - Documentación técnica completa con diagramas
- **IMPLEMENTACION_NFC_RESUMEN.md** - Resumen de cambios realizados
- **Swagger UI** - http://localhost:3000/api/docs

---

## 🎯 Siguientes Pasos

1. ✅ Probar el flujo completo con los scripts de prueba
2. ⬜ Implementar integración con Stripe para pagos
3. ⬜ Crear endpoint para iniciar sesión de carga
4. ⬜ Implementar notificaciones push
5. ⬜ Desarrollar la interfaz móvil completa

---

## 💡 Tips

- Usa el script `test-nfc-flow.js` para verificar que todo funciona
- Mantén una terminal con `npm start` corriendo mientras pruebas
- Usa `wscat` para debugging de WebSocket en desarrollo
- Revisa los logs del servidor para ver qué está pasando

---

**¿Necesitas ayuda?**
- Revisa la documentación en `FLUJO_NFC_CARGA.md`
- Verifica los logs del servidor
- Asegúrate de tener datos de prueba en la BD
