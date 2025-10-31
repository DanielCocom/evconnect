# EVConnect

Proyecto refactorizado a JavaScript puro (sin TypeScript).

## 📁 Estructura del Proyecto

```
evconnect/
├── src/
│   ├── index.js              # Punto de entrada
│   ├── app.js                # Configuración Express
│   ├── config/               # Configuraciones (vacío)
│   ├── controllers/          # Controladores
│   │   └── user.controller.js
│   ├── db/                   # Base de datos
│   │   └── sequelize.js
│   ├── docs/                 # Documentación Swagger
│   │   └── swagger.js
│   ├── middlewares/          # Middlewares
│   │   └── authJwt.js
│   ├── models/               # Modelos Sequelize
│   │   └── User.js
│   ├── routes/               # Rutas
│   │   └── user.routes.js
│   ├── services/             # Lógica de negocio
│   │   └── user.service.js
│   ├── utils/                # Utilidades
│   │   ├── hash.js
│   │   └── jwt.js
│   └── ws/                   # WebSocket
│       └── wsServer.js
├── package.json
└── .env.example
```

## 🚀 Instalación

```bash
npm install
```

## 🔧 Configuración

Crea un archivo `.env` basado en `.env.example`:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES=12h
PORT=4000
NODE_ENV=development
```

## ▶️ Ejecución

### Modo desarrollo
```bash
npm run dev
```

### Modo producción
```bash
npm start
```

## 📡 API Endpoints

### Usuarios

- `POST /api/user/register` - Registrar nuevo usuario
- `POST /api/user/login` - Iniciar sesión
- `GET /api/user/me` - Obtener perfil (requiere autenticación)

### Documentación

- `GET /api/docs` - Swagger UI

### WebSocket

- `ws://localhost:4000/ws` - Conexión WebSocket

## 📦 Dependencias Principales

- **express** - Framework web
- **sequelize** - ORM para PostgreSQL
- **jsonwebtoken** - Autenticación JWT
- **bcryptjs** - Hash de contraseñas
- **ws** - WebSocket server
- **swagger-jsdoc** - Documentación API
- **cors** - CORS middleware
- **dotenv** - Variables de entorno

## 🔄 Cambios en la Refactorización

### Eliminado
- ❌ TypeScript y todas las dependencias de tipos (@types/*)
- ❌ `ts-node-dev`, `typescript`
- ❌ `sequelize-typescript` (reemplazado por Sequelize estándar)
- ❌ `zod` (validaciones ahora son más simples)
- ❌ Carpeta `types/`
- ❌ Carpeta `dtos/`
- ❌ Middleware `validateDto`
- ❌ `tsconfig.json`

### Optimizado
- ✅ Código simplificado sin anotaciones de tipo
- ✅ Validaciones inline en controladores
- ✅ Uso de CommonJS (require/module.exports)
- ✅ Scripts optimizados en package.json
- ✅ Menos dependencias = instalación más rápida
- ✅ Estructura de carpetas mantenida

### Mejoras
- Node.js nativo con flag `--watch` para desarrollo
- Código más legible y directo
- Menor complejidad en el proyecto
- Menor uso de memoria

## 📝 Ejemplo de Uso

### Registro de usuario
```bash
curl -X POST http://localhost:4000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido_paterno": "Pérez",
    "email": "juan@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "password123"
  }'
```

### Obtener perfil
```bash
curl -X GET http://localhost:4000/api/user/me \
  -H "Authorization: Bearer <token>"
```

## 🛠️ Desarrollo

El proyecto ahora usa Node.js puro sin necesidad de compilación. Los cambios se reflejan automáticamente en modo desarrollo gracias al flag `--watch`.

## 📄 Licencia

ISC
