# 📚 Documentación Completa API EVConnect

## 🔗 Tabla de Contenidos
1. [Configuración Inicial](#configuración-inicial)
2. [Arquitectura y Flujo General](#arquitectura-y-flujo-general)
3. [Autenticación JWT](#autenticación-jwt)
4. [Endpoints de Usuarios](#endpoints-de-usuarios)
5. [Endpoints BackOffice](#endpoints-backoffice)
6. [Endpoints Franquicia](#endpoints-franquicia)
7. [WebSocket](#websocket)
8. [Base de Datos](#base-de-datos)
9. [Ejemplos Prácticos](#ejemplos-prácticos)
10. [Troubleshooting](#troubleshooting)

---

## 🛠️ Configuración Inicial

### Variables de Entorno (.env)
```env
# Configuración del Servidor
PORT=4000
NODE_ENV=development

# Base de Datos PostgreSQL
DATABASE_URL=postgresql://usuario:password@host:puerto/database?sslmode=require

# JWT - Seguridad
JWT_SECRET=tu_jwt_secret_super_seguro_cambiar_en_produccion
JWT_EXPIRES=12h

# API Base URL (para Swagger)
API_URL=http://localhost:4000
```

### Instalación y Ejecución
```bash
# Clonar e instalar
git clone <repository>
cd evconnect
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus datos

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start
```

### URLs de Acceso
- **API Base**: `http://localhost:4000`
- **Swagger Docs**: `http://localhost:4000/api/docs`
- **WebSocket**: `ws://localhost:4000/ws`

---

## 🏗️ Arquitectura y Flujo General

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Cliente Web   │    │  App Móvil   │    │ Estación IoT    │
│   (BackOffice)  │    │  (Usuario)   │    │  (Publisher)    │
└─────────┬───────┘    └──────┬───────┘    └─────────┬───────┘
          │                   │                      │
          │ HTTP REST API     │ HTTP REST API        │ WebSocket
          │                   │                      │
          └───────────────────┼──────────────────────┼──────────
                              │                      │
                    ┌─────────▼──────────────────────▼─────────┐
                    │           EVConnect API Server          │
                    │  ┌─────────────┐  ┌─────────────────┐   │
                    │  │   Express   │  │   WebSocket     │   │
                    │  │   Routes    │  │   Server        │   │
                    │  └─────────────┘  └─────────────────┘   │
                    │  ┌─────────────┐  ┌─────────────────┐   │
                    │  │ Controllers │  │   Middlewares   │   │
                    │  └─────────────┘  └─────────────────┘   │
                    │  ┌─────────────┐  ┌─────────────────┐   │
                    │  │  Services   │  │     Models      │   │
                    │  └─────────────┘  └─────────────────┘   │
                    └──────────────────┬──────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  PostgreSQL DB  │
                              │   (Sequelize)   │
                              └─────────────────┘
```

### Estructura MVC
```
Request → Route → Middleware → Controller → Service → Model → Database
                                ↓
Response ← Controller ← Service ← Model ← Database ← ← ← ← ← ←
```

---

## 🔐 Autenticación JWT

### Tipos de Usuario
1. **Usuario App** - Usuarios finales de la aplicación móvil
2. **Usuario BackOffice** - Administradores de franquicia

### Estructura del Token JWT

#### Para Usuario App:
```json
{
  "sub": "123",          // ID del usuario (payload.sub)
  "iat": 1699123456,     // Issued at
  "exp": 1699166656      // Expiration (12h por defecto)
}
```

#### Para Usuario BackOffice:
```json
{
  "id": 456,             // ID del admin
  "rol": "Administrador",// Rol del usuario
  "franquiciaId": 789,   // ID de franquicia asociada
  "sub": "456",          // ID del admin (subject)
  "iat": 1699123456,     // Issued at
  "exp": 1699166656      // Expiration
}
```

### Middlewares de Autenticación

#### 1. `authenticateToken`
- **Uso**: Validación básica de token
- **Extrae**: `req.userId` del `payload.sub`
- **Headers requeridos**: `Authorization: Bearer <token>`

#### 2. `authenticateJWT` 
- **Uso**: Validación completa del payload
- **Extrae**: `req.user` con todo el payload
- **Usado en**: Endpoints que necesitan datos adicionales (franquiciaId, rol)

---

## 👤 Endpoints de Usuarios

### Base URL: `/api/user`

### 1. **POST /api/user/register**
**Descripción**: Registra un nuevo usuario de la app móvil

**Request Body**:
```json
{
  "nombre": "Juan",                    // ✅ Requerido
  "apellido_paterno": "Pérez",        // ❌ Opcional
  "apellido_materno": "García",       // ❌ Opcional
  "email": "juan@example.com",        // ✅ Requerido, único
  "password": "password123"           // ✅ Requerido, min 8 caracteres
}
```

**Response Success (201)**:
```json
{
  "success": true,
  "status": 201,
  "message": "Usuario creado correctamente",
  "data": {
    "id_usuario": 123,
    "nombre": "Juan",
    "apellido_paterno": "Pérez",
    "apellido_materno": "García",
    "email": "juan@example.com",
    "saldo_virtual": "0.00",
    "fecha_registro": "2024-11-04T10:30:00.000Z",
    "nfc_uid": null
    // ⚠️ password_hash NO se incluye
  }
}
```

**Response Error (422 - Validación)**:
```json
{
  "success": false,
  "status": 422,
  "message": "Campos requeridos: nombre, email, password"
}
```

**Response Error (409 - Email duplicado)**:
```json
{
  "success": false,
  "status": 409,
  "message": "El correo ya está registrado"
}
```

---

### 2. **POST /api/user/login**
**Descripción**: Autentica usuario y devuelve JWT token

**Request Body**:
```json
{
  "email": "juan@example.com",        // ✅ Requerido
  "password": "password123"           // ✅ Requerido, min 8 caracteres
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "status": 200,
  "message": "Inicio de sesión correcto",
  "data": {
    "user": {
      "id_usuario": 123,
      "nombre": "Juan",
      "apellido_paterno": "Pérez",
      "apellido_materno": "García",
      "email": "juan@example.com",
      "saldo_virtual": "0.00",
      "fecha_registro": "2024-11-04T10:30:00.000Z",
      "nfc_uid": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // ✅ JWT Token
  }
}
```

**Response Error (401 - Credenciales inválidas)**:
```json
{
  "success": false,
  "status": 401,
  "message": "Credenciales inválidas"
}
```

---

### 3. **GET /api/user/me**
**Descripción**: Obtiene perfil del usuario autenticado

**Headers requeridos**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Success (200)**:
```json
{
  "success": true,
  "status": 200,
  "message": "Perfil de usuario",
  "data": {
    "id_usuario": 123,
    "nombre": "Juan",
    "apellido_paterno": "Pérez",
    "apellido_materno": "García",
    "email": "juan@example.com",
    "saldo_virtual": "0.00",
    "fecha_registro": "2024-11-04T10:30:00.000Z",
    "nfc_uid": null
  }
}
```

**Response Error (401 - Sin token)**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token no provisto"
  }
}
```

**Response Error (403 - Token inválido)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token inválido o expirado"
  }
}
```

---

## 🏢 Endpoints BackOffice

### Base URL: `/api/admin`

### 1. **POST /api/admin/create**
**Descripción**: Crea usuario administrativo para panel backoffice

**Request Body**:
```json
{
  "id_franquicia": 1,                 // ✅ Requerido, ID de franquicia existente
  "nombre": "Ana Martínez",           // ✅ Requerido
  "email": "ana@franquicia.com",      // ✅ Requerido, único
  "password": "admin123456",          // ✅ Requerido, min 8 caracteres
  "rol": "Administrador"              // ❌ Opcional, default: "tecnico"
}
```

**Response Success (201)**:
```json
{
  "success": true,
  "data": {
    "id_admin": 456,
    "id_franquicia": 1,
    "nombre": "Ana Martínez", 
    "email": "ana@franquicia.com",
    "rol": "Administrador",
    "activo": true
    // ⚠️ password_hash NO se incluye
  }
}
```

**Response Error (422)**:
```json
{
  "success": false,
  "status": 422,
  "message": "Campos requeridos; id_franquicia, nombre, password, email"
}
```

---

### 2. **POST /api/admin/login**
**Descripción**: Autentica usuario backoffice con token especial

**Request Body**:
```json
{
  "email": "ana@franquicia.com",      // ✅ Requerido
  "password": "admin123456"           // ✅ Requerido, min 8 caracteres
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "status": 200,
  "message": "Inicio de sesión correcto",
  "data": {
    "user": {
      "id": 456,
      "nombre": "Ana Martínez",
      "email": "ana@franquicia.com",
      "rol": "Administrador"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // ✅ JWT con franquiciaId
  }
}
```

**Response Error (401 - Usuario inactivo)**:
```json
{
  "success": false,
  "status": 401,
  "message": "El usuario no esta activo"
}
```

---

## 🏪 Endpoints Franquicia

### Base URL: `/api/franquicia`

### 1. **GET /api/franquicia/dashboard**
**Descripción**: Estadísticas completas del dashboard de franquicia

**Autenticación**: Requiere token de usuario backoffice con `franquiciaId`

**Headers requeridos**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Middlewares aplicados**:
- `authenticateToken` - Valida token
- `authenticateJWT` - Extrae payload completo

**Response Success (200)**:
```json
{
  "success": true,
  "status": 200,
  "message": "Estadísticas obtenidas",
  "data": {
    "energiaTotal": 1250.75,           // kWh total consumido (sesiones finalizadas)
    "ingresosTotales": 45000.50,       // $ total acumulado (sesiones finalizadas)
    "ingresosDiarios": 850.25,         // $ del día actual (sesiones finalizadas hoy)
    "sesionesActivas": 12,             // Número de sesiones "en_progreso"
    "estadoCargadores": [              // Array con estado de cada cargador
      {
        "id_cargador": 1,
        "estado": "disponible",        // disponible|ocupado|mantenimiento|fuera_de_servicio
        "id_estacion": 1
      },
      {
        "id_cargador": 2,
        "estado": "ocupado",
        "id_estacion": 1
      }
      // ... más cargadores
    ]
  }
}
```

**Response Error (401 - Sin franquicia)**:
```json
{
  "success": false,
  "status": 401,
  "message": "Usuario no está asociado a una franquicia."
}
```

### Lógica de Cálculo de Estadísticas:

1. **Energía Total**: `SUM(energia_consumida_kwh)` de `sesion_carga` con `estado = "finalizada"`
2. **Ingresos Totales**: `SUM(monto_final)` de `sesion_carga` con `estado = "finalizada"`
3. **Ingresos Diarios**: Igual que totales pero con `fecha_fin` del día actual
4. **Sesiones Activas**: `COUNT(*)` de `sesion_carga` con `estado = "en_progreso"`
5. **Estado Cargadores**: Consulta directa a tabla `cargador` filtrada por `franquiciaId`

---

## 🌐 WebSocket

### Conexión Base
```
ws://localhost:4000/ws
```

### Parámetros de Conexión (Query String)
```
ws://localhost:4000/ws?token=<jwt>&role=<publisher|client>&estacionId=<id>
```

| Parámetro | Requerido | Descripción |
|-----------|-----------|-------------|
| `token` | ❌ Opcional* | JWT token de autenticación |
| `role` | ✅ Requerido | `publisher` (estación IoT) o `client` (app web) |
| `estacionId` | ✅ Requerido | ID de la estación para pub/sub |

*Nota: Token opcional pero recomendado para producción*

### Roles de WebSocket

#### 1. **Publisher (Estación IoT)**
- **Propósito**: Estación de carga envía datos de telemetría
- **Conexión**: `ws://localhost:4000/ws?role=publisher&estacionId=123`
- **Validaciones**: Verifica que la estación existe en BD

**Mensajes que envía (Publisher → Server)**:
```json
{
  "type": "telemetry_data",
  "data": {
    "voltaje_v": 220.5,
    "corriente_a": 32.1,
    "potencia_w": 7000.0,
    "temperatura_c": 28.5,
    "estado_rele": true,
    "timestamp": "2024-11-04T15:30:00Z"
  }
}
```

**Mensajes que recibe (Server → Publisher)**:
```json
{
  "from": "client",
  "payload": {
    "command": "start_charging",
    "session_id": 789
  }
}
```

#### 2. **Client/Subscriber (App Web)**
- **Propósito**: Recibe datos en tiempo real de una estación específica
- **Conexión**: `ws://localhost:4000/ws?role=client&estacionId=123`

**Mensajes que recibe (Server → Client)**:
```json
{
  "from": "publisher",
  "payload": {
    "type": "telemetry_data",
    "data": {
      "voltaje_v": 220.5,
      "corriente_a": 32.1,
      "potencia_w": 7000.0,
      "temperatura_c": 28.5,
      "estado_rele": true
    }
  },
  "timestamp": 1699123456789
}
```

**Mensajes que envía (Client → Server)**:
```json
{
  "command": "start_charging",
  "session_id": 789,
  "user_id": 123
}
```

### Flujo de Comunicación WebSocket

```
Estación IoT (Publisher)  ←→  EVConnect Server  ←→  App Web (Client)
                             
    Telemetry Data  ────────→     Broadcast    ────────→  Real-time UI
    Commands       ←────────      Relay       ←────────   User Actions
```

### Estados de Conexión WebSocket

| Estado | Descripción |
|--------|-------------|
| `connecting` | Estableciendo conexión |
| `connected` | Conexión exitosa, enviando confirmación |
| `subscribed` | Cliente suscrito a estación específica |
| `error` | Error en conexión o autenticación |
| `closed` | Conexión cerrada |

### Heartbeat/Ping-Pong
- **Intervalo**: Cada 30 segundos
- **Propósito**: Detectar conexiones muertas
- **Implementación**: Automática (servidor envía ping, cliente responde pong)

---

## 🗄️ Base de Datos

### Conexión PostgreSQL
```javascript
// Configuración en src/db/sequelize.js
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions: {
    ssl: { 
      require: true, 
      rejectUnauthorized: false 
    }
  },
  pool: {
    max: 5,      // Máximo de conexiones
    min: 0,      // Mínimo de conexiones  
    acquire: 30000, // Timeout para adquirir conexión
    idle: 10000     // Tiempo antes de cerrar conexión idle
  }
});
```

### Modelos Principales

#### 1. **Usuario (usuario)**
```sql
CREATE TABLE usuario (
  id_usuario SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  nfc_uid VARCHAR(50) UNIQUE,
  saldo_virtual DECIMAL(10,2) DEFAULT 0,
  fecha_registro TIMESTAMP DEFAULT NOW()
);
```

#### 2. **Usuario BackOffice (usuario_backoffice)**
```sql
CREATE TABLE usuario_backoffice (
  id_admin SERIAL PRIMARY KEY,
  id_franquicia INTEGER NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  rol VARCHAR(50) DEFAULT 'tecnico',
  password_hash TEXT NOT NULL,
  activo BOOLEAN DEFAULT true
);
```

#### 3. **Franquicia (franquicia)**
```sql
CREATE TABLE franquicia (
  id_franquicia SERIAL PRIMARY KEY,
  nombre_comercial VARCHAR(150) NOT NULL,
  rfc VARCHAR(20),
  direccion TEXT,
  plan_contratado VARCHAR(100),
  estado_operacion VARCHAR(50) DEFAULT 'activo',
  fecha_alta TIMESTAMP DEFAULT NOW()
);
```

#### 4. **Estación (estacion)**
```sql
CREATE TABLE estacion (
  id_estacion SERIAL PRIMARY KEY,
  id_franquicia INTEGER NOT NULL REFERENCES franquicia(id_franquicia),
  nombre_estacion VARCHAR(150) NOT NULL,
  direccion TEXT,
  ubicacion_lat DECIMAL(10,6),
  ubicacion_lon DECIMAL(10,6),
  total_cargadores INTEGER DEFAULT 0,
  estado_operacion VARCHAR(50) DEFAULT 'activa'
);
```

#### 5. **Cargador (cargador)**
```sql
CREATE TABLE cargador (
  id_cargador SERIAL PRIMARY KEY,
  id_estacion INTEGER NOT NULL REFERENCES estacion(id_estacion),
  tipo_carga VARCHAR(50) NOT NULL,
  capacidad_kw DECIMAL(10,2),
  estado VARCHAR(50) DEFAULT 'disponible',
  fecha_instalacion TIMESTAMP DEFAULT NOW(),
  firmware_version VARCHAR(50)
);
```

#### 6. **Sesión de Carga (sesion_carga)**
```sql
CREATE TABLE sesion_carga (
  id_sesion SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
  id_cargador INTEGER NOT NULL REFERENCES cargador(id_cargador),
  id_tarifa INTEGER REFERENCES tarifa(id_tarifa),
  metodo_pago_utilizado INTEGER REFERENCES metodo_pago(id_pago),
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  estado VARCHAR(50) DEFAULT 'pendiente',
  energia_consumida_kwh DECIMAL(10,3) DEFAULT 0,
  monto_estimado DECIMAL(10,2),
  monto_final DECIMAL(10,2),
  id_pago_transaccion VARCHAR(100)
);
```

### Relaciones Principales
```
Franquicia (1) ──┬── (N) Estacion ──── (N) Cargador ──── (N) SesionCarga ──── (1) Usuario
                 │                                                           
                 └── (N) UserBackOffice
                 
SesionCarga ──── (N) LecturaIot (telemetría en tiempo real)
Estacion ──── (N) AlertaEvento
```

---

## 🧪 Ejemplos Prácticos

### Flujo Completo: Usuario App

#### 1. **Registro de Usuario**
```bash
curl -X POST http://localhost:4000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "María",
    "apellido_paterno": "González",
    "email": "maria@example.com",
    "password": "mipassword123"
  }'
```

#### 2. **Login y Obtener Token**
```bash
curl -X POST http://localhost:4000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@example.com",
    "password": "mipassword123"
  }'

# Respuesta contiene el token:
# {"data": {"token": "eyJhbGciOiJIUzI1NiIs..."}}
```

#### 3. **Usar Token para Acceder al Perfil**
```bash
# Copiar token de la respuesta anterior
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:4000/api/user/me \
  -H "Authorization: Bearer $TOKEN"
```

### Flujo Completo: Usuario BackOffice

#### 1. **Crear Usuario Admin**
```bash
curl -X POST http://localhost:4000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "id_franquicia": 1,
    "nombre": "Carlos Administrador",
    "email": "carlos@franquicia.com",
    "password": "admin123456",
    "rol": "Administrador"
  }'
```

#### 2. **Login Admin**
```bash
curl -X POST http://localhost:4000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@franquicia.com",
    "password": "admin123456"
  }'

# Respuesta contiene token con franquiciaId:
# {"data": {"token": "eyJhbGciOiJIUzI1NiIs...", "user": {...}}}
```

#### 3. **Acceder a Dashboard de Franquicia**
```bash
# Usar token de admin (contiene franquiciaId)
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:4000/api/franquicia/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Flujo WebSocket: Cliente JavaScript

```javascript
// Cliente web que se conecta para recibir telemetría
const token = "eyJhbGciOiJIUzI1NiIs..."; // Token del login
const estacionId = 123;

const ws = new WebSocket(`ws://localhost:4000/ws?token=${token}&role=client&estacionId=${estacionId}`);

ws.onopen = function() {
  console.log('Conectado a la estación:', estacionId);
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Datos recibidos:', data);
  
  if (data.from === 'publisher') {
    // Datos de telemetría de la estación
    updateUI(data.payload.data);
  }
};

// Enviar comando a la estación
function startCharging(sessionId) {
  const command = {
    command: 'start_charging',
    session_id: sessionId
  };
  ws.send(JSON.stringify(command));
}
```

### Flujo WebSocket: Estación IoT (Simulación)

```javascript
// Simulador de estación IoT
const estacionId = 123;

const ws = new WebSocket(`ws://localhost:4000/ws?role=publisher&estacionId=${estacionId}`);

ws.onopen = function() {
  console.log('Estación conectada como publisher');
  
  // Enviar telemetría cada 5 segundos
  setInterval(sendTelemetry, 5000);
};

function sendTelemetry() {
  const telemetry = {
    type: 'telemetry_data',
    data: {
      voltaje_v: 220 + Math.random() * 10,
      corriente_a: 30 + Math.random() * 5,
      potencia_w: 6500 + Math.random() * 1000,
      temperatura_c: 25 + Math.random() * 10,
      estado_rele: true,
      timestamp: new Date().toISOString()
    }
  };
  
  ws.send(JSON.stringify(telemetry));
}

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.from === 'client') {
    // Comando recibido del cliente web
    console.log('Comando recibido:', data.payload);
    handleCommand(data.payload);
  }
};
```

---

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. **Error: "Token no provisto"**
**Causa**: Falta header Authorization
**Solución**:
```bash
# ❌ Incorrecto
curl -X GET http://localhost:4000/api/user/me

# ✅ Correcto
curl -X GET http://localhost:4000/api/user/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

#### 2. **Error: "Usuario no está asociado a una franquicia"**
**Causa**: Usando token de usuario normal en endpoint de franquicia
**Solución**: Usar token de usuario backoffice que contenga `franquiciaId`

#### 3. **Error: "DATABASE_URL no está definida"**
**Causa**: Variable de entorno faltante
**Solución**:
```bash
# Verificar archivo .env
cat .env | grep DATABASE_URL

# Debe contener:
DATABASE_URL=postgresql://user:pass@host:port/database
```

#### 4. **WebSocket: "publisher requires estacionId"**
**Causa**: Parámetro estacionId faltante en la conexión
**Solución**:
```javascript
// ❌ Incorrecto
const ws = new WebSocket('ws://localhost:4000/ws?role=publisher');

// ✅ Correcto
const ws = new WebSocket('ws://localhost:4000/ws?role=publisher&estacionId=123');
```

#### 5. **Error: "Cannot read properties of undefined"**
**Causa**: Problemas de importación en modelos
**Verificar**: Que los imports usen `require("../models")` no `require("../db/sequelize")`

### Logs de Debugging

#### Habilitar logs SQL en desarrollo:
```javascript
// src/db/sequelize.js
logging: process.env.NODE_ENV === "development" ? console.log : false
```

#### Ver logs de WebSocket:
```javascript
// En src/ws/wsServer.js ya incluye console.log para debugging
console.log("WebSocket server initialized on /ws");
```

### Verificación de Salud del Sistema

#### Health Check (crear endpoint):
```javascript
// src/routes/health.routes.js
router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});
```

### Comandos de Verificación

```bash
# Verificar que el servidor esté corriendo
curl http://localhost:4000/api/user/login

# Verificar conexión WebSocket
wscat -c ws://localhost:4000/ws?role=client&estacionId=1

# Ver logs en tiempo real
npm run dev

# Verificar variables de entorno
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? 'DB OK' : 'DB Missing')"
```

---

## 📊 Resumen de URLs y Endpoints

### HTTP REST API
| Método | Endpoint | Autenticación | Propósito |
|--------|----------|---------------|-----------|
| POST | `/api/user/register` | ❌ No | Registro usuario app |
| POST | `/api/user/login` | ❌ No | Login usuario app |
| GET | `/api/user/me` | ✅ Token usuario | Perfil usuario |
| POST | `/api/admin/create` | ❌ No | Crear admin backoffice |
| POST | `/api/admin/login` | ❌ No | Login admin backoffice |
| GET | `/api/franquicia/dashboard` | ✅ Token admin | Dashboard franquicia |

### WebSocket
| URL | Parámetros | Propósito |
|-----|------------|-----------|
| `ws://localhost:4000/ws` | `role=publisher&estacionId=X` | Estación IoT |
| `ws://localhost:4000/ws` | `role=client&estacionId=X` | Cliente web |

### Documentación
| URL | Descripción |
|-----|-------------|
| `http://localhost:4000/api/docs` | Swagger UI interactiva |
| `http://localhost:4000/api/docs.json` | Spec OpenAPI JSON |

---

**🎉 ¡Documentación completa lista!**
Esta documentación cubre todos los aspectos del API EVConnect, desde configuración básica hasta troubleshooting avanzado.