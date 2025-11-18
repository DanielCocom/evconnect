# Flujo de Carga con NFC - Documentación Técnica

## Descripción General

Este documento describe el flujo completo para iniciar una sesión de carga mediante la lectura de NFC en la aplicación móvil, desde el escaneo del tag hasta la conexión WebSocket en tiempo real.

## Arquitectura del Flujo

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   App Móvil     │      │   Backend API   │      │  Cargador IoT   │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │  1. Escanea NFC        │                        │
         │  (id_cargador)         │                        │
         │                        │                        │
         │  2. GET /api/stations/tariffs?id_cargador=123  │
         │───────────────────────>│                        │
         │                        │                        │
         │                        │  3. Consulta BD        │
         │                        │  - Cargador            │
         │                        │  - Tarifa vigente      │
         │                        │                        │
         │  4. Tarifa + Estado    │                        │
         │<───────────────────────│                        │
         │                        │                        │
         │  5. Usuario configura  │                        │
         │     límite ($30)       │                        │
         │                        │                        │
         │  6. WS Connect         │                        │
         │  ws://url/ws?cargadorId=123&role=client        │
         │<──────────────────────>│                        │
         │                        │                        │
         │                        │  7. sync_request       │
         │                        │───────────────────────>│
         │                        │                        │
         │                        │  8. sync_response      │
         │                        │<───────────────────────│
         │                        │     {estado, telemetría}
         │                        │                        │
         │  9. Broadcast estado   │                        │
         │<───────────────────────│                        │
         │                        │                        │
         │  10. UI Lista para     │                        │
         │      iniciar pago      │                        │
         │                        │                        │
```

---

## Etapas Detalladas

### Etapa 1: Lectura de NFC 📱

**Actor:** App Móvil  
**Acción:** El cliente escanea el NFC del cargador

**Detalles:**
- La aplicación móvil captura el identificador único del hardware
- Este identificador corresponde al campo `id_cargador` en la base de datos
- El NFC debe estar programado con el formato: `ev://charger/{id_cargador}`

**Implementación Móvil (Ejemplo):**
```javascript
// React Native con react-native-nfc-manager
import NfcManager, {NfcTech} from 'react-native-nfc-manager';

async function scanNFC() {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();
    
    // Parsear el URI del NFC
    const uri = parseNdefMessage(tag.ndefMessage);
    const cargadorId = extractCargadorId(uri); // Ejemplo: "ev://charger/123" -> 123
    
    return cargadorId;
  } catch (ex) {
    console.warn('Error escaneando NFC:', ex);
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}
```

---

### Etapa 2: Solicitud de Tarifas 📡

**Actor:** App Móvil  
**Acción:** Llamada al Backend para obtener tarifas

**Endpoint:** `GET /api/stations/tariffs`

**Parámetros:**
- `id_cargador` (query parameter, requerido): ID del cargador obtenido del NFC

**Request:**
```http
GET /api/stations/tariffs?id_cargador=123 HTTP/1.1
Host: api.evconnect.com
```

**Response Exitoso (200):**
```json
{
  "success": true,
  "message": "Tarifa obtenida correctamente",
  "data": {
    "cargador": {
      "id_cargador": 123,
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

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | "El parámetro id_cargador es requerido" | Falta el query parameter |
| 404 | "Cargador no encontrado" | ID no existe en BD |
| 404 | "No hay tarifa vigente..." | No hay tarifa configurada |

**Implementación Móvil:**
```javascript
async function obtenerTarifas(cargadorId) {
  try {
    const response = await fetch(
      `https://api.evconnect.com/api/stations/tariffs?id_cargador=${cargadorId}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    const data = await response.json();
    return data.data; // { cargador, tarifa }
  } catch (error) {
    console.error('Error obteniendo tarifas:', error);
    throw error;
  }
}
```

---

### Etapa 3: Resolución de Tarifa 🔍

**Actor:** Backend API  
**Acción:** Resolver la tarifa vigente para el cargador

**Lógica de Negocio:**

1. **Buscar el Cargador:**
   ```sql
   SELECT id_cargador, id_estacion, tipo_carga, estado, capacidad_kw
   FROM cargador
   WHERE id_cargador = ?
   ```

2. **Buscar la Tarifa Vigente:**
   ```sql
   SELECT id_tarifa, costo_kw_h, costo_tiempo_min, 
          fecha_inicio_vigencia, fecha_fin_vigencia
   FROM tarifa
   WHERE id_estacion = ? 
     AND tipo_carga = ?
     AND fecha_inicio_vigencia <= CURDATE()
     AND (fecha_fin_vigencia IS NULL OR fecha_fin_vigencia >= CURDATE())
   ORDER BY fecha_inicio_vigencia DESC
   LIMIT 1
   ```

3. **Validaciones:**
   - Si el cargador no existe → 404
   - Si no hay tarifa vigente → 404 con mensaje descriptivo
   - Si todo OK → 200 con datos consolidados

**Código Backend (Implementado):**
```javascript
// src/services/cargador.service.js
async function getTarifaByCargadorId(cargadorId) {
  const id = Number(cargadorId);
  if (Number.isNaN(id)) {
    throw { status: 400, message: 'ID de cargador inválido' };
  }

  // 1. Buscar el cargador
  const cargador = await Cargador.findByPk(id, {
    attributes: ['id_cargador', 'id_estacion', 'tipo_carga', 'estado', 'capacidad_kw']
  });

  if (!cargador) {
    throw { status: 404, message: 'Cargador no encontrado' };
  }

  // 2. Buscar la tarifa vigente
  const fechaActual = new Date();
  const tarifa = await Tarifa.findOne({
    where: {
      id_estacion: cargador.id_estacion,
      tipo_carga: cargador.tipo_carga,
      fecha_inicio_vigencia: { [Op.lte]: fechaActual },
      [Op.or]: [
        { fecha_fin_vigencia: null },
        { fecha_fin_vigencia: { [Op.gte]: fechaActual } }
      ]
    },
    order: [['fecha_inicio_vigencia', 'DESC']]
  });

  if (!tarifa) {
    throw { 
      status: 404, 
      message: `No hay tarifa vigente para el cargador (Estación: ${cargador.id_estacion}, Tipo: ${cargador.tipo_carga})` 
    };
  }

  return { cargador, tarifa };
}
```

---

### Etapa 4: Configuración del Límite 💰

**Actor:** App Móvil  
**Acción:** Mostrar tarifas y permitir configurar límite

**UI Recomendada:**

```
┌─────────────────────────────────────┐
│  🔌 Cargador Rápido - 50 kW         │
│  📍 Estación Centro Comercial       │
├─────────────────────────────────────┤
│  💵 TARIFAS                          │
│  • $4.50 por kW/h                   │
│  • $0.75 por minuto                 │
├─────────────────────────────────────┤
│  ⏱️ ESTIMACIÓN                       │
│  30 minutos ≈ $22.50 + energía      │
│  (Dependiendo del consumo)          │
├─────────────────────────────────────┤
│  🎯 LÍMITE DE CARGA                  │
│  ┌─────────────────────────────────┐│
│  │ Tiempo: [30] minutos           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ O Monto: [$__] pesos           ││
│  └─────────────────────────────────┘│
│                                      │
│  [ Continuar al Pago ]              │
└─────────────────────────────────────┘
```

**Implementación Móvil:**
```javascript
function ConfigurarLimite({ cargador, tarifa }) {
  const [tipoLimite, setTipoLimite] = useState('tiempo'); // 'tiempo' | 'monto'
  const [valor, setValor] = useState(30);

  const calcularEstimacion = () => {
    if (tipoLimite === 'tiempo') {
      return valor * tarifa.costo_tiempo_min;
    } else {
      return valor / tarifa.costo_tiempo_min;
    }
  };

  return (
    <View>
      <Text>Costo por minuto: ${tarifa.costo_tiempo_min}</Text>
      <Text>Costo por kW/h: ${tarifa.costo_kw_h}</Text>
      
      <Picker
        selectedValue={tipoLimite}
        onValueChange={setTipoLimite}
      >
        <Picker.Item label="Por tiempo" value="tiempo" />
        <Picker.Item label="Por monto" value="monto" />
      </Picker>

      <TextInput
        value={valor.toString()}
        onChangeText={(v) => setValor(Number(v))}
        keyboardType="numeric"
      />

      <Text>Estimación: ${calcularEstimacion().toFixed(2)}</Text>

      <Button
        title="Continuar al Pago"
        onPress={() => navegarAlPago(cargador.id_cargador, valor)}
      />
    </View>
  );
}
```

---

### Etapa 5: Inicio de Conexión WebSocket 🔌

**Actor:** App Móvil  
**Acción:** Establecer conexión WebSocket con el backend

**URL de Conexión:**
```
ws://api.evconnect.com/ws?cargadorId=123&role=client
```

**Parámetros:**
- `cargadorId` (query parameter, requerido): ID del cargador
- `role` (query parameter, opcional): Tipo de conexión (`client` por defecto, `publisher` para IoT)
- `token` (query parameter, opcional): JWT del usuario (para funcionalidades protegidas)

**Implementación Móvil:**
```javascript
import WebSocket from 'react-native-websocket';

class CargadorWebSocketService {
  constructor(cargadorId) {
    this.cargadorId = cargadorId;
    this.ws = null;
    this.listeners = [];
  }

  connect() {
    const url = `ws://api.evconnect.com/ws?cargadorId=${this.cargadorId}&role=client`;
    
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket conectado');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Mensaje recibido:', data);
      
      // Notificar a los listeners
      this.listeners.forEach(listener => listener(data));
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket desconectado');
      // Intentar reconectar después de 5 segundos
      setTimeout(() => this.connect(), 5000);
    };
  }

  onMessage(listener) {
    this.listeners.push(listener);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Uso
const wsService = new CargadorWebSocketService(123);
wsService.connect();

wsService.onMessage((data) => {
  if (data.type === 'subscribed') {
    console.log('Suscrito al cargador:', data.cargadorId);
    console.log('Estado actual:', data.estado_cargador);
    console.log('Conectado:', data.conectado);
  } else if (data.type === 'estado_cargador') {
    console.log('Cambio de estado:', data);
  } else if (data.from === 'publisher') {
    console.log('Telemetría:', data.payload);
  }
});
```

---

### Etapa 6: Registro de Suscriptor 📝

**Actor:** Backend WebSocket  
**Acción:** Registrar el socket móvil como subscriber

**Flujo Backend:**

1. **Validar parámetros:**
   ```javascript
   const cargadorId = url.searchParams.get("cargadorId");
   if (!cargadorId) {
     return ws.close(4001, "cargadorId es requerido");
   }
   ```

2. **Validar que el cargador existe:**
   ```javascript
   const cargador = await Cargador.findByPk(cargadorId);
   if (!cargador) {
     return ws.close(4005, "Cargador not found");
   }
   ```

3. **Autenticación opcional:**
   ```javascript
   const token = url.searchParams.get("token");
   if (token) {
     try {
       const payload = verifyToken(token);
       ws.userId = payload.id;
       ws.authenticated = true;
     } catch (err) {
       ws.authenticated = false;
     }
   }
   ```

4. **Registrar como subscriber:**
   ```javascript
   pubsub.addSubscriber(cargadorId, ws);
   ```

5. **Enviar confirmación:**
   ```javascript
   ws.send(JSON.stringify({ 
     type: "subscribed", 
     cargadorId,
     estado_cargador: cargador.estado,
     tipo_carga: cargador.tipo_carga,
     capacidad_kw: cargador.capacidad_kw,
     conectado: publisherConectado,
     timestamp: new Date().toISOString()
   }));
   ```

**Código Implementado:**
```javascript
// src/ws/wsServer.js
wss.on("connection", async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const cargadorId = url.searchParams.get("cargadorId");
  const role = (url.searchParams.get("role") || "client").toLowerCase();

  if (!cargadorId) {
    return ws.close(4001, "cargadorId es requerido");
  }

  const cargador = await Cargador.findByPk(cargadorId);
  if (!cargador) {
    return ws.close(4005, "Cargador not found");
  }

  if (role === "client") {
    pubsub.addSubscriber(cargadorId, ws);
    
    const pub = pubsub.publishers.get(String(cargadorId));
    const publisherConectado = pub && pub.readyState === WebSocket.OPEN;

    ws.send(JSON.stringify({ 
      type: "subscribed", 
      cargadorId,
      estado_cargador: cargador.estado,
      tipo_carga: cargador.tipo_carga,
      capacidad_kw: cargador.capacidad_kw,
      conectado: publisherConectado,
      timestamp: new Date().toISOString()
    }));

    // Solicitar sincronización si el cargador está conectado
    if (publisherConectado) {
      pub.send(JSON.stringify({ 
        type: "sync_request", 
        from: "server",
        timestamp: new Date().toISOString()
      }));
    }

    ws.on("message", (data) => messageHandler.handleClientMessage(cargadorId, ws, data));
    ws.on("close", () => pubsub.removeSubscriber(ws));
  }
});
```

---

### Etapa 7: Solicitud de Sincronización 🔄

**Actor:** Backend WebSocket  
**Acción:** Solicitar estado actual al cargador IoT

**Mensaje enviado al Publisher (Cargador):**
```json
{
  "type": "sync_request",
  "from": "server",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Lógica:**
- Solo se envía si el publisher (cargador físico) está conectado
- El cargador debe responder con un mensaje `sync_response`

**Código Backend:**
```javascript
// src/ws/wsServer.js (dentro del manejo de client)
const pub = pubsub.publishers.get(String(cargadorId));
const publisherConectado = pub && pub.readyState === WebSocket.OPEN;

if (publisherConectado) {
  console.log(`[WS] Enviando sync_request al cargador ${cargadorId}`);
  pub.send(JSON.stringify({ 
    type: "sync_request", 
    from: "server",
    timestamp: new Date().toISOString()
  }));
} else {
  console.log(`[WS] Cargador ${cargadorId} no está conectado`);
}
```

---

### Etapa 8: Reporte de Estado 📊

**Actor:** Cargador IoT (ESP32)  
**Acción:** Responder con estado operativo actual

**Mensaje esperado del Cargador:**
```json
{
  "type": "sync_response",
  "cargadorId": 123,
  "estado": "disponible",
  "telemetria": {
    "voltaje_v": 220.5,
    "corriente_a": 0.0,
    "potencia_w": 0.0,
    "temperatura_c": 25.3,
    "estado_rele": false
  },
  "timestamp": "2024-01-15T10:30:01.000Z"
}
```

**Estados Válidos:**
- `disponible`: Cargador listo para usar
- `ocupado`: Sesión de carga en progreso
- `mantenimiento`: Fuera de servicio por mantenimiento
- `fuera_servicio`: No disponible por falla
- `reservado`: Reservado para un usuario específico

**Manejo Backend:**
```javascript
// src/ws/message.handler.js
else if (msg.type === "sync_response") {
  console.log(`[IoT] Respuesta de sincronización del cargador ${cargadorId}:`, msg);

  // Actualizar estado en BD si es diferente
  const cargador = await Cargador.findByPk(cargadorId);
  if (cargador && msg.estado && msg.estado !== cargador.estado) {
    console.log(`[IoT] Actualizando estado de ${cargador.estado} a ${msg.estado}`);
    await Cargador.update(
      { estado: msg.estado },
      { where: { id_cargador: cargadorId } }
    );
  }

  msg.timestamp = msg.timestamp || new Date().toISOString();
  msg.sincronizado = true;
  
  // Continúa al broadcast...
}
```

**Implementación ESP32 (Ejemplo):**
```cpp
// Arduino/ESP32
void handleWebSocketMessage(String message) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);
  
  String type = doc["type"];
  
  if (type == "sync_request") {
    // Preparar respuesta de sincronización
    DynamicJsonDocument response(2048);
    response["type"] = "sync_response";
    response["cargadorId"] = CARGADOR_ID;
    response["estado"] = estadoActual; // "disponible", "ocupado", etc.
    
    JsonObject telemetria = response.createNestedObject("telemetria");
    telemetria["voltaje_v"] = leerVoltaje();
    telemetria["corriente_a"] = leerCorriente();
    telemetria["potencia_w"] = calcularPotencia();
    telemetria["temperatura_c"] = leerTemperatura();
    telemetria["estado_rele"] = digitalRead(PIN_RELE);
    
    response["timestamp"] = obtenerTimestamp();
    
    String output;
    serializeJson(response, output);
    webSocket.sendTXT(output);
  }
}
```

---

### Etapa 9: Broadcast Inicial 📡

**Actor:** Backend WebSocket  
**Acción:** Reenviar estado a todos los subscribers

**Mensaje enviado a Subscribers:**
```json
{
  "from": "publisher",
  "payload": {
    "type": "sync_response",
    "cargadorId": 123,
    "estado": "disponible",
    "telemetria": {
      "voltaje_v": 220.5,
      "corriente_a": 0.0,
      "potencia_w": 0.0,
      "temperatura_c": 25.3,
      "estado_rele": false
    },
    "timestamp": "2024-01-15T10:30:01.000Z",
    "sincronizado": true
  },
  "timestamp": 1705318201000
}
```

**Código Backend:**
```javascript
// src/ws/message.handler.js
// Después de procesar el mensaje del publisher

// 2. REENVIAR A SUSCRIPTORES (Apps y Backoffice)
pubsub.broadcastToSubscribers(cargadorId, {
  from: "publisher",
  payload: msg,
  timestamp: Date.now(),
});
```

**Función de Broadcast:**
```javascript
// src/ws/pubsub.js
function broadcastToSubscribers(cargadorId, message) {
  const key = String(cargadorId);
  const set = subscribers.get(key);
  if (!set) return;

  const payload = JSON.stringify(message);
  set.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
```

---

### Etapa 10: UI Lista para Iniciar ✅

**Actor:** App Móvil  
**Acción:** Mostrar estado en tiempo real y botón de pago

**UI Final:**

```
┌─────────────────────────────────────┐
│  🔌 Cargador Rápido - 50 kW         │
│  📍 Estación Centro Comercial       │
│  🟢 DISPONIBLE - Conectado          │
├─────────────────────────────────────┤
│  💵 Tu límite: 30 minutos           │
│  Costo estimado: ~$22.50            │
├─────────────────────────────────────┤
│  📊 ESTADO EN TIEMPO REAL            │
│  • Voltaje: 220.5 V                 │
│  • Temperatura: 25.3°C              │
│  • Sistema: Operativo ✓             │
├─────────────────────────────────────┤
│  [ 💳 Proceder al Pago ]            │
└─────────────────────────────────────┘
```

**Implementación Móvil:**
```javascript
function PantallaInicioSesion({ cargador, tarifa, limite }) {
  const [estado, setEstado] = useState(null);
  const [telemetria, setTelemetria] = useState(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const wsService = new CargadorWebSocketService(cargador.id_cargador);
    wsService.connect();

    wsService.onMessage((data) => {
      if (data.type === 'subscribed') {
        setEstado(data.estado_cargador);
        setConectado(data.conectado);
      } else if (data.from === 'publisher' && data.payload.type === 'sync_response') {
        setEstado(data.payload.estado);
        setTelemetria(data.payload.telemetria);
        setConectado(true);
      } else if (data.type === 'estado_cargador') {
        setConectado(data.conectado);
      }
    });

    return () => wsService.disconnect();
  }, [cargador.id_cargador]);

  const iniciarPago = () => {
    // Navegar a la pantalla de pago con:
    // - cargador.id_cargador
    // - limite (tiempo o monto)
    // - tarifa (para cálculos)
    navigation.navigate('Pago', {
      cargadorId: cargador.id_cargador,
      limite,
      tarifa,
      estado
    });
  };

  return (
    <View>
      <Text>{cargador.tipo_carga.toUpperCase()} - {cargador.capacidad_kw} kW</Text>
      
      <View style={styles.estadoBadge}>
        {conectado ? '🟢' : '🔴'}
        <Text>{estado?.toUpperCase()}</Text>
        <Text>{conectado ? 'CONECTADO' : 'DESCONECTADO'}</Text>
      </View>

      <Text>Tu límite: {limite.valor} {limite.tipo === 'tiempo' ? 'minutos' : 'pesos'}</Text>
      <Text>Costo estimado: ~${calcularEstimacion()}</Text>

      {telemetria && (
        <View>
          <Text>Voltaje: {telemetria.voltaje_v} V</Text>
          <Text>Temperatura: {telemetria.temperatura_c}°C</Text>
          <Text>Sistema: Operativo ✓</Text>
        </View>
      )}

      <Button
        title="💳 Proceder al Pago"
        onPress={iniciarPago}
        disabled={estado !== 'disponible'}
      />
    </View>
  );
}
```

---

## Mensajes WebSocket - Referencia Completa

### Mensajes del Backend al Cliente (Subscriber)

#### 1. Confirmación de Suscripción
```json
{
  "type": "subscribed",
  "cargadorId": 123,
  "estado_cargador": "disponible",
  "tipo_carga": "rapida",
  "capacidad_kw": 50.0,
  "conectado": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 2. Estado del Cargador
```json
{
  "type": "estado_cargador",
  "cargadorId": 123,
  "conectado": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 3. Broadcast de Telemetría
```json
{
  "from": "publisher",
  "payload": {
    "type": "telemetria",
    "sesionId": 456,
    "voltaje_v": 220.5,
    "corriente_a": 32.5,
    "potencia_w": 7162.5,
    "energia_acumulada_wh": 1500.0,
    "temperatura_c": 35.2,
    "estado_rele": true,
    "timestamp": "2024-01-15T10:35:00.000Z"
  },
  "timestamp": 1705318500000
}
```

#### 4. Broadcast de Sincronización
```json
{
  "from": "publisher",
  "payload": {
    "type": "sync_response",
    "cargadorId": 123,
    "estado": "disponible",
    "telemetria": { /* datos */ },
    "timestamp": "2024-01-15T10:30:01.000Z",
    "sincronizado": true
  },
  "timestamp": 1705318201000
}
```

#### 5. Error
```json
{
  "type": "error",
  "message": "Descripción del error",
  "command": "iniciar_carga"
}
```

### Mensajes del Cliente al Backend

#### 1. Iniciar Carga
```json
{
  "command": "iniciar_carga"
}
```

#### 2. Finalizar Carga
```json
{
  "command": "finalizar_carga",
  "sesionId": 456
}
```

#### 3. Solicitar Estado
```json
{
  "command": "solicitar_estado"
}
```

---

## Manejo de Errores

### Errores de Conexión WebSocket

| Código | Descripción | Solución |
|--------|-------------|----------|
| 4001 | cargadorId es requerido | Incluir parámetro en URL |
| 4005 | Cargador not found | Verificar ID del cargador |
| 1011 | Internal error | Error del servidor |

### Errores de API REST

| Código | Descripción | Solución |
|--------|-------------|----------|
| 400 | Parámetro faltante | Verificar query parameters |
| 404 | Recurso no encontrado | Verificar IDs |
| 500 | Error interno | Reintentar o contactar soporte |

### Implementación de Reintentos

```javascript
class WebSocketService {
  constructor(cargadorId, maxRetries = 5) {
    this.cargadorId = cargadorId;
    this.maxRetries = maxRetries;
    this.retryCount = 0;
    this.retryDelay = 1000; // 1 segundo inicial
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onclose = () => {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Backoff exponencial
          console.log(`Reintentando en ${delay}ms...`);
          setTimeout(() => this.connect(), delay);
        } else {
          console.error('Máximo de reintentos alcanzado');
          this.onMaxRetriesReached?.();
        }
      };

      this.ws.onopen = () => {
        this.retryCount = 0; // Resetear contador al conectar
        console.log('Conectado exitosamente');
      };

    } catch (error) {
      console.error('Error en conexión:', error);
    }
  }
}
```

---

## Testing

### Test Manual con Thunder Client / Postman

**1. Probar endpoint de tarifas:**
```
GET http://localhost:3000/api/stations/tariffs?id_cargador=1
```

**2. Probar WebSocket con wscat:**
```bash
# Instalar wscat
npm install -g wscat

# Conectar como cliente
wscat -c "ws://localhost:3000/ws?cargadorId=1&role=client"

# Conectar como publisher (cargador)
wscat -c "ws://localhost:3000/ws?cargadorId=1&role=publisher"
```

**3. Simular mensajes del cargador:**
```json
// Como publisher, enviar:
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

### Test Automatizado

```javascript
// tests/integration/flujo-nfc.test.js
describe('Flujo NFC Completo', () => {
  let cargadorId;
  let wsClient;

  beforeAll(async () => {
    // Crear cargador y tarifa de prueba
    cargadorId = await crearCargadorPrueba();
    await crearTarifaPrueba(cargadorId);
  });

  test('Debe obtener tarifa por ID de cargador', async () => {
    const response = await request(app)
      .get(`/api/stations/tariffs?id_cargador=${cargadorId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.cargador).toBeDefined();
    expect(response.body.data.tarifa).toBeDefined();
  });

  test('Debe conectar WebSocket y recibir estado inicial', (done) => {
    wsClient = new WebSocket(`ws://localhost:3000/ws?cargadorId=${cargadorId}&role=client`);

    wsClient.on('message', (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'subscribed') {
        expect(message.cargadorId).toBe(cargadorId);
        expect(message.estado_cargador).toBeDefined();
        done();
      }
    });
  });

  afterAll(() => {
    wsClient?.close();
  });
});
```

---

## Siguientes Pasos

1. **Integración con Pasarela de Pagos:**
   - Implementar retención de fondos con Stripe
   - Manejo de autorización previa
   - Captura del monto final al terminar sesión

2. **Manejo de Sesiones:**
   - Crear endpoint POST `/api/sessions/start`
   - Implementar lógica de inicio de carga
   - Validar disponibilidad del cargador

3. **Notificaciones Push:**
   - Alertar cuando el cargador esté listo
   - Notificar cambios de estado
   - Avisar cuando se alcance el límite

4. **Optimizaciones:**
   - Implementar caché de tarifas en el cliente
   - Reducir latencia de WebSocket
   - Implementar reconexión automática inteligente

---

## Resumen del Flujo

✅ **Implementado:**
1. ✅ Lectura de NFC (App móvil)
2. ✅ Endpoint GET `/api/stations/tariffs` (Backend)
3. ✅ Resolución de tarifa vigente (Backend)
4. ✅ Configuración de límite (App móvil)
5. ✅ Conexión WebSocket sin auth (Backend)
6. ✅ Registro de subscriber (Backend)
7. ✅ Envío de sync_request (Backend)
8. ✅ Manejo de sync_response (Backend)
9. ✅ Broadcast de estado (Backend)
10. ✅ UI lista para pago (App móvil)

🔄 **Pendiente:**
- Integración con Stripe
- Inicio de sesión de carga
- Gestión de límites en tiempo real
- Notificaciones push

---

## Soporte

Para dudas o problemas:
- Email: soporte@evconnect.com
- Documentación: https://docs.evconnect.com
- Issues: https://github.com/DanielCocom/evconnect/issues
