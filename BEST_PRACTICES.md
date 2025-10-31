# 🎯 Guía de Mejores Prácticas - EVConnect

## 📋 Tabla de Contenidos
1. [Estructura del Código](#estructura-del-código)
2. [Validación de Datos](#validación-de-datos)
3. [Manejo de Errores](#manejo-de-errores)
4. [Seguridad](#seguridad)
5. [Base de Datos](#base-de-datos)
6. [WebSocket](#websocket)
7. [Variables de Entorno](#variables-de-entorno)
8. [Testing](#testing)
9. [Despliegue](#despliegue)

---

## 📁 Estructura del Código

### Separación de Responsabilidades

```
Controllers   → Manejan requests/responses
Services      → Lógica de negocio
Models        → Definición de datos
Middlewares   → Procesamiento intermedio
Utils         → Funciones auxiliares
```

### Ejemplo de Flujo:
```
Request → Route → Middleware → Controller → Service → Model → Database
                                                              ↓
Response ← Controller ← Service ← Model ← Database ←────────┘
```

---

## ✅ Validación de Datos

### En Controladores (Actual)
```javascript
// Validación básica inline
if (!nombre || !email || !password) {
  return res.status(422).json({
    success: false,
    error: { code: "VALIDATION_ERROR", message: "Campos requeridos" }
  });
}
```

### Recomendación: Crear Validadores Reutilizables
```javascript
// src/utils/validators.js
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

module.exports = { validateEmail, validatePassword };
```

---

## ⚠️ Manejo de Errores

### Errores Personalizados
```javascript
// src/utils/errors.js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404, 'NOT_FOUND');
  }
}

module.exports = { AppError, ValidationError, NotFoundError };
```

### Middleware de Manejo de Errores Mejorado
```javascript
// src/middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  
  // Log de errores en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }
  
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = { errorHandler };
```

---

## 🔐 Seguridad

### 1. Variables de Entorno
```javascript
// Siempre validar
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined');
}

// Usar valores por defecto solo en desarrollo
const JWT_SECRET = process.env.JWT_SECRET || 
  (process.env.NODE_ENV === 'development' ? 'dev_secret' : null);
```

### 2. Rate Limiting (Recomendado)
```bash
npm install express-rate-limit
```

```javascript
// src/middlewares/rateLimit.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de requests
  message: 'Demasiadas peticiones desde esta IP'
});

module.exports = { limiter };
```

### 3. Helmet (Headers de Seguridad)
```bash
npm install helmet
```

```javascript
// src/app.js
const helmet = require('helmet');
app.use(helmet());
```

### 4. Validación de Inputs
```javascript
// Siempre sanitizar inputs
const sanitizeEmail = (email) => {
  return email.toLowerCase().trim();
};

// Evitar SQL Injection (Sequelize ya protege, pero...)
// Usar parámetros de Sequelize, no strings concatenados
const user = await User.findOne({ 
  where: { email: sanitizeEmail(email) } 
});
```

---

## 🗄️ Base de Datos

### 1. Manejo de Conexiones
```javascript
// src/db/sequelize.js
const sequelize = new Sequelize(connectionString, {
  pool: {
    max: 10,        // Máximo de conexiones
    min: 0,         // Mínimo
    acquire: 30000, // Tiempo máximo para adquirir conexión
    idle: 10000     // Tiempo antes de cerrar conexión idle
  },
  retry: {
    max: 3          // Reintentos en caso de fallo
  }
});
```

### 2. Transacciones
```javascript
// src/services/user.service.js
static async createUserWithTransaction(data) {
  const t = await sequelize.transaction();
  
  try {
    const user = await User.create(data, { transaction: t });
    // Otras operaciones...
    await t.commit();
    return user;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}
```

### 3. Índices y Optimización
```javascript
// src/models/User.js
email: {
  type: DataTypes.STRING(150),
  allowNull: false,
  unique: true,
  // Índice automático con unique: true
},
// Para búsquedas frecuentes sin unique:
indexes: [
  { fields: ['nfc_uid'] },
  { fields: ['fecha_registro'] }
]
```

---

## 🔌 WebSocket

### 1. Autenticación en WebSocket
```javascript
// src/ws/wsServer.js
const { verifyToken } = require('../utils/jwt');

wss.on('connection', (ws, req) => {
  // Extraer token de query params
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    ws.close(4001, 'No token provided');
    return;
  }
  
  try {
    const payload = verifyToken(token);
    ws.userId = payload.sub;
    console.log(`User ${ws.userId} connected`);
  } catch (error) {
    ws.close(4002, 'Invalid token');
    return;
  }
  
  // Resto del código...
});
```

### 2. Heartbeat para Detectar Conexiones Muertas
```javascript
// src/ws/wsServer.js
function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});
```

### 3. Broadcast Selectivo
```javascript
// src/ws/wsServer.js
function broadcastToUser(userId, message) {
  wss.clients.forEach((client) => {
    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

module.exports = { initWebSocketServer, broadcastToUser };
```

---

## 🔧 Variables de Entorno

### Estructura Recomendada
```env
# .env
NODE_ENV=development

# Server
PORT=4000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_POOL_MAX=10
DB_POOL_MIN=0

# JWT
JWT_SECRET=super_secret_key_here
JWT_EXPIRES=12h
JWT_REFRESH_EXPIRES=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=debug
```

### Validación de Variables
```javascript
// src/config/env.js
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET'
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Required env var ${varName} is not defined`);
  }
});

const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
    poolMax: parseInt(process.env.DB_POOL_MAX || '10'),
    poolMin: parseInt(process.env.DB_POOL_MIN || '0')
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expires: process.env.JWT_EXPIRES || '12h'
  }
};

module.exports = config;
```

---

## 🧪 Testing

### Configuración Jest (Recomendado)
```bash
npm install --save-dev jest supertest
```

```javascript
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"]
  }
}
```

### Ejemplo de Test
```javascript
// tests/user.service.test.js
const { UserService } = require('../src/services/user.service');

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        nombre: 'Test',
        email: 'test@test.com',
        password: 'password123'
      };
      
      const user = await UserService.createUser(userData);
      
      expect(user).toBeDefined();
      expect(user.email).toBe('test@test.com');
      expect(user.password_hash).toBeUndefined();
    });
  });
});
```

---

## 🚀 Despliegue

### 1. Checklist Pre-Despliegue
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] JWT_SECRET fuerte y único
- [ ] NODE_ENV=production
- [ ] CORS configurado correctamente
- [ ] Rate limiting activado
- [ ] Helmet configurado
- [ ] Logs configurados
- [ ] Health check endpoint

### 2. Health Check Endpoint
```javascript
// src/routes/health.routes.js
const router = require('express').Router();
const { sequelize } = require('../db/sequelize');

router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

module.exports = router;
```

### 3. PM2 Ecosystem
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'evconnect',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 4. Docker Production
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

WORKDIR /app

# Dependencias
COPY package*.json ./
RUN npm ci --only=production

# Código
COPY src ./src

# User no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 4000

CMD ["node", "src/index.js"]
```

---

## 📊 Logging

### Winston (Recomendado)
```bash
npm install winston
```

```javascript
// src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

---

## 🎉 Resumen

1. **Validación**: Crear utils reutilizables
2. **Errores**: Usar clases personalizadas
3. **Seguridad**: Helmet, rate-limiting, sanitización
4. **DB**: Transacciones, pool, índices
5. **WebSocket**: Autenticación, heartbeat
6. **Testing**: Jest + Supertest
7. **Despliegue**: PM2, Docker, health checks
8. **Logging**: Winston para producción

---

**Recuerda**: Código simple es mejor que código complejo. Mantén las cosas directas y legibles.
