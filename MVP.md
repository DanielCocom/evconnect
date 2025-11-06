# EVCONNECT MVP - Sistema IoT de Carga de Vehículos Eléctricos

## 📋 Descripción

Sistema de gestión de estaciones de carga con comunicación en tiempo real entre ESP32, Backend y Dashboard Web mediante WebSocket.

---

## 🏗️ Arquitectura

```
ESP32 (Cargador #1)  ←→  Backend Node.js  ←→  Dashboard Web
     WebSocket              (Puerto 8080)        (Backoffice)
         ↓                        ↓
    Hardware IoT            PostgreSQL
    - NFC PN532
    - INA219
    - Relé
    - OLED
    - Botones
```

---

## 🚀 Instalación

### 1. **Backend (Node.js)**

```bash
# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Configurar variables:
# WS_PORT=8080
# DATABASE_URL=postgresql://user:pass@localhost:5432/evconnect
# STRIPE_SECRET_KEY=sk_test_...

# Ejecutar migraciones
npm run migrate

# Cargar datos de prueba
psql -U usuario -d evconnect -f test_data.sql

# Iniciar servidor
npm run dev
```

Servidor HTTP: `http://localhost:3000`
WebSocket: `ws://localhost:8080`

### 2. **ESP32 (Arduino)**

```cpp
// Configurar en el código:
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASS = "TU_PASSWORD";
const char* WS_HOST = "192.168.1.100"; // IP de tu backend

// Librerías requeridas:
// - WebSocketsClient
// - Adafruit_INA219
// - Adafruit_PN532
// - Adafruit_SSD1306
// - ArduinoJson

// Subir código al ESP32
```

### 3. **Dashboard Web**

```bash
# Copiar dashboard.html a carpeta public/ o abrir directamente
# Editar línea 221 del HTML:
const WS_URL = 'ws://TU_IP:8080?type=dashboard';

# Abrir en navegador:
open dashboard.html
```

---

## 🔌 Conexiones Hardware ESP32

```
ESP32 PIN    →  COMPONENTE
==========================
GPIO 25      →  Relé (IN)
GPIO 2       →  LED Indicador
GPIO 26      →  Botón STOP
GPIO 27      →  Botón EMERGENCIA
GPIO 21 (SDA)→  NFC PN532 / INA219 / OLED
GPIO 22 (SCL)→  NFC PN532 / INA219 / OLED
5V           →  VCC Módulos
GND          →  GND Común
```

---

## 📡 Protocolo WebSocket

### **ESP32 → Backend**

#### 1. Lectura NFC
```json
{
  "type": "nfc_scan",
  "nfc_uid": "VIRTUAL-1-A4F2E8"
}
```

#### 2. Métricas (cada 3s)
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

#### 3. Detener carga
```json
{
  "type": "stop",
  "session_id": 123
}
```

#### 4. Emergencia
```json
{
  "type": "emergency",
  "session_id": 123
}
```

### **Backend → ESP32**

#### 1. Iniciar sesión
```json
{
  "type": "start",
  "session_id": 123,
  "user_name": "Juan Pérez"
}
```

#### 2. Detener sesión
```json
{
  "type": "stop",
  "session_id": 123
}
```

### **Backend → Dashboard**

#### 1. Estado inicial
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

#### 2. Métricas en tiempo real
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

---

## 🧪 Pruebas

### **Prueba 1: Iniciar Sesión con NFC**

1. Abrir Dashboard en navegador
2. Verificar "WebSocket: Conectado"
3. Verificar "ESP32: Conectado"
4. Acercar tarjeta NFC con UID: `VIRTUAL-1-A4F2E8`
5. ESP32 envía NFC al backend
6. Backend valida usuario "Juan Pérez"
7. ESP32 activa relé → LED azul
8. Dashboard muestra sesión activa

### **Prueba 2: Monitoreo en Tiempo Real**

1. Con sesión activa
2. ESP32 envía métricas cada 3 segundos
3. Dashboard actualiza valores en vivo:
   - Voltaje: 220V
   - Corriente: 16A
   - Potencia: 3520W
   - Energía acumulada: 2.45 kWh
   - Costo: $17.15

### **Prueba 3: Finalizar Carga**

**Opción A: Desde ESP32**
1. Presionar botón STOP físico
2. Relé se desactiva inmediatamente
3. Backend actualiza sesión como "completada"
4. Dashboard muestra resumen

**Opción B: Desde Dashboard**
1. Presionar botón "Detener Carga"
2. Backend envía comando a ESP32
3. ESP32 desactiva relé
4. Dashboard muestra resumen

### **Prueba 4: Paro de Emergencia**

1. Presionar botón EMERGENCIA físico
2. Relé se desactiva INMEDIATAMENTE
3. LED parpadea rojo
4. Backend marca sesión como "cancelada"
5. Dashboard muestra alerta roja
6. Cargador queda en estado "error"

---

## 📊 Estructura de Base de Datos

### **Tablas Principales**

- `usuario` - Usuarios de app móvil
- `cargador` - Cargadores físicos (id=1 para MVP)
- `sesion_carga` - Sesiones de carga activas/completadas
- `lectura_iot` - Métricas del INA219 en tiempo real
- `tarifa` - Tarifas por kWh
- `alerta_evento` - Alertas de emergencia

---

## 🔧 Troubleshooting

### **ESP32 no conecta a WebSocket**

```cpp
// Verificar IP del backend en código
const char* WS_HOST = "192.168.1.100";

// Verificar puerto
const int WS_PORT = 8080;

// Ver logs en Serial Monitor (115200 baud)
```

### **Dashboard no recibe métricas**

1. Abrir consola del navegador (F12)
2. Verificar conexión WebSocket
3. Cambiar URL en línea 221:
```javascript
const WS_URL = 'ws://localhost:8080?type=dashboard';
```

### **NFC no detectado**

```cpp
// Verificar conexiones I2C
// Probar con código de ejemplo de Adafruit_PN532
```

### **Relé no activa**

```cpp
// Verificar pin
#define RELAY_PIN 25

// Verificar lógica (HIGH=ON, LOW=OFF)
digitalWrite(RELAY_PIN, HIGH);
```

---

## 📝 Variables de Entorno (.env)

```env
# Servidor
PORT=3000
WS_PORT=8080
NODE_ENV=development

# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=evconnect
DB_USER=postgres
DB_PASS=password

# Stripe (opcional para MVP)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# JWT
JWT_SECRET=dev_secret_key_change_in_production

# Configuración MVP
CHARGER_ID=1
TARIFA_KWH=7.00
METRIC_INTERVAL=3000
```

---

## 📚 Endpoints REST (Opcionales)

```
GET  /health                    - Estado del servidor
GET  /api/ws/status             - Estado WebSocket
POST /api/user/register         - Registro de usuario
POST /api/user/login            - Login
GET  /api/user/profile          - Perfil usuario
```

---

## 🎯 Flujo Completo

```
1. Usuario acerca NFC → ESP32 lee UID
2. ESP32 envía WS → Backend valida usuario
3. Backend crea sesión → Envía "start" a ESP32
4. ESP32 activa relé → Inicia lecturas INA219
5. ESP32 envía métricas → Backend calcula energía/costo
6. Backend broadcast → Dashboard actualiza UI
7. Usuario presiona STOP → ESP32 desactiva relé
8. ESP32 envía "stop" → Backend cierra sesión
9. Dashboard muestra resumen final
```

---

## 📞 Soporte

Para dudas o problemas, revisar:
1. Logs del backend: `console.log`
2. Logs del ESP32: Serial Monitor
3. Consola del navegador: F12

---

## 🚀 Próximos Pasos (Post-MVP)

- [ ] Agregar autenticación JWT para ESP32
- [ ] Implementar múltiples cargadores
- [ ] Integrar pagos reales con Stripe
- [ ] App móvil para usuarios
- [ ] Notificaciones push
- [ ] Sistema de reportes
- [ ] Dashboard analytics

---

## 📄 Licencia

Proyecto académico - MVP para demostración