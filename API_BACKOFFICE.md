# 🏢 Documentación API BackOffice - EVConnect

## 📋 Resumen de Endpoints Implementados

Todos los endpoints requieren autenticación JWT con token de usuario backoffice (que incluye `franquiciaId` en el payload).

---

## 🔐 Autenticación

### POST /api/admin/login
**Descripción**: Login de usuario backoffice (ya existía)

**Request**:
```json
{
  "email": "admin@franquicia.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Admin User",
      "email": "admin@franquicia.com",
      "rol": "Administrador"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Usar este token en todos los endpoints siguientes:**
```
Authorization: Bearer <token>
```

---

## 📊 Dashboard

### 1. GET /api/dashboard/stats
**Descripción**: Obtiene métricas clave del dashboard

**Response**:
```json
{
  "success": true,
  "data": {
    "estacionesDisponibles": 12,
    "estacionesTotales": 20,
    "ingresosHoy": "1250.50",
    "energiaHoy": "450.75",
    "fallasActivas": 3
  }
}
```

**Métricas**:
- `estacionesDisponibles`: Cargadores con estado "disponible"
- `estacionesTotales`: Total de cargadores
- `ingresosHoy`: Suma de monto_final de sesiones finalizadas hoy
- `energiaHoy`: Suma de energia_consumida_kwh de sesiones finalizadas hoy
- `fallasActivas`: Alertas con estado "activo"

---

### 2. GET /api/dashboard/active-alerts
**Descripción**: Lista las alertas activas

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id_alerta": 1,
      "tipo_evento": "falla_cargador",
      "descripcion": "Cargador no responde",
      "nivel_gravedad": "alto",
      "fecha_evento": "2024-11-05T10:30:00.000Z",
      "estado": "activo",
      "Estacion": {
        "nombre_estacion": "Estación Centro"
      },
      "Cargador": {
        "id_cargador": 5,
        "tipo_carga": "rapida"
      }
    }
  ]
}
```

---

### 3. GET /api/dashboard/energy-chart
**Descripción**: Datos de energía para gráfica (últimas 24 horas)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "hora": "2024-11-05 10:00:00",
      "energia": "45.50"
    },
    {
      "hora": "2024-11-05 11:00:00",
      "energia": "52.30"
    }
  ]
}
```

---

## 🔌 Cargadores

### 4. GET /api/chargers
**Descripción**: Lista todos los cargadores de la franquicia

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id_cargador": 1,
      "tipo_carga": "rapida",
      "capacidad_kw": "50.00",
      "estado": "disponible",
      "fecha_instalacion": "2024-01-15T00:00:00.000Z",
      "firmware_version": "v2.1.0",
      "Estacion": {
        "nombre_estacion": "Estación Centro",
        "direccion": "Av. Principal 123"
      }
    }
  ]
}
```

**Estados posibles**: `disponible`, `ocupado`, `mantenimiento`, `fuera_de_servicio`, `reiniciando`

---

### 5. POST /api/chargers
**Descripción**: Crea un nuevo cargador

**Request**:
```json
{
  "id_estacion": 1,
  "tipo_carga": "rapida",
  "capacidad_kw": 50,
  "estado": "disponible",
  "firmware_version": "v2.1.0"
}
```

**Campos requeridos**: `id_estacion`, `tipo_carga`, `capacidad_kw`

**Response**:
```json
{
  "success": true,
  "status": 201,
  "message": "Cargador creado exitosamente",
  "data": {
    "id_cargador": 21,
    "id_estacion": 1,
    "tipo_carga": "rapida",
    "capacidad_kw": "50.00",
    "estado": "disponible",
    "firmware_version": "v2.1.0",
    "fecha_instalacion": "2024-11-05T10:30:00.000Z"
  }
}
```

---

### 6. GET /api/chargers/:id
**Descripción**: Obtiene detalles de un cargador específico

**Response**:
```json
{
  "success": true,
  "data": {
    "id_cargador": 1,
    "id_estacion": 1,
    "tipo_carga": "rapida",
    "capacidad_kw": "50.00",
    "estado": "disponible",
    "fecha_instalacion": "2024-01-15T00:00:00.000Z",
    "firmware_version": "v2.1.0",
    "Estacion": {
      "id_estacion": 1,
      "nombre_estacion": "Estación Centro",
      "direccion": "Av. Principal 123"
    }
  }
}
```

---

### 7. PUT /api/chargers/:id
**Descripción**: Actualiza un cargador

**Request**:
```json
{
  "tipo_carga": "ultra_rapida",
  "capacidad_kw": 150,
  "estado": "mantenimiento",
  "firmware_version": "v2.2.0"
}
```

**Todos los campos son opcionales** (se actualizan solo los enviados)

**Response**:
```json
{
  "success": true,
  "message": "Cargador actualizado exitosamente",
  "data": {
    "id_cargador": 1,
    "tipo_carga": "ultra_rapida",
    "capacidad_kw": "150.00",
    "estado": "mantenimiento",
    "firmware_version": "v2.2.0"
  }
}
```

---

### 8. POST /api/chargers/:id/reset
**Descripción**: Reinicia un cargador (comando manual)

**Response**:
```json
{
  "success": true,
  "message": "Cargador reiniciado exitosamente",
  "data": {
    "message": "Reinicio iniciado",
    "cargador": {
      "id_cargador": 1,
      "estado": "reiniciando"
    }
  }
}
```

**Nota**: El estado cambia a "reiniciando" y después de 5 segundos vuelve a "disponible". También registra un evento en ALERTA_EVENTO.

---

## 💲 Tarifas

### 9. GET /api/rates
**Descripción**: Lista todas las tarifas

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id_tarifa": 1,
      "tipo_carga": "rapida",
      "costo_kw_h": "0.45",
      "costo_tiempo_min": "0.10",
      "fecha_inicio_vigencia": "2024-01-01",
      "fecha_fin_vigencia": null,
      "Estacion": {
        "nombre_estacion": "Estación Centro",
        "direccion": "Av. Principal 123"
      }
    }
  ]
}
```

---

### 10. POST /api/rates
**Descripción**: Crea una nueva tarifa

**Request**:
```json
{
  "id_estacion": 1,
  "tipo_carga": "rapida",
  "costo_kw_h": 0.45,
  "costo_tiempo_min": 0.10,
  "fecha_inicio_vigencia": "2024-11-01",
  "fecha_fin_vigencia": "2025-10-31"
}
```

**Campos requeridos**: `id_estacion`, `tipo_carga`, `costo_kw_h`, `costo_tiempo_min`

**Response**:
```json
{
  "success": true,
  "status": 201,
  "message": "Tarifa creada exitosamente",
  "data": {
    "id_tarifa": 5,
    "id_estacion": 1,
    "tipo_carga": "rapida",
    "costo_kw_h": "0.45",
    "costo_tiempo_min": "0.10",
    "fecha_inicio_vigencia": "2024-11-01",
    "fecha_fin_vigencia": "2025-10-31"
  }
}
```

---

### 11. GET /api/rates/:id
**Descripción**: Obtiene detalles de una tarifa

**Response**:
```json
{
  "success": true,
  "data": {
    "id_tarifa": 1,
    "id_estacion": 1,
    "tipo_carga": "rapida",
    "costo_kw_h": "0.45",
    "costo_tiempo_min": "0.10",
    "fecha_inicio_vigencia": "2024-01-01",
    "fecha_fin_vigencia": null,
    "Estacion": {
      "id_estacion": 1,
      "nombre_estacion": "Estación Centro"
    }
  }
}
```

---

### 12. PUT /api/rates/:id
**Descripción**: Actualiza una tarifa

**Request**:
```json
{
  "costo_kw_h": 0.50,
  "costo_tiempo_min": 0.12,
  "fecha_fin_vigencia": "2025-12-31"
}
```

**Todos los campos son opcionales**

**Response**:
```json
{
  "success": true,
  "message": "Tarifa actualizada exitosamente",
  "data": {
    "id_tarifa": 1,
    "costo_kw_h": "0.50",
    "costo_tiempo_min": "0.12",
    "fecha_fin_vigencia": "2025-12-31"
  }
}
```

---

## 🏢 Estaciones

### 13. GET /api/stations
**Descripción**: Lista todas las estaciones de la franquicia

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id_estacion": 1,
      "id_franquicia": 1,
      "nombre_estacion": "Estación Centro",
      "direccion": "Av. Principal 123",
      "ubicacion_lat": "19.432608",
      "ubicacion_lon": "-99.133209",
      "total_cargadores": 5,
      "estado_operacion": "activa"
    }
  ]
}
```

---

### 14. POST /api/stations/:id/assign-rate
**Descripción**: Asigna una tarifa a una estación

**Request**:
```json
{
  "tipo_carga": "rapida",
  "costo_kw_h": 0.45,
  "costo_tiempo_min": 0.10,
  "fecha_inicio_vigencia": "2024-11-01",
  "fecha_fin_vigencia": "2025-10-31"
}
```

**Campos requeridos**: `tipo_carga`, `costo_kw_h`, `costo_tiempo_min`

**Response**:
```json
{
  "success": true,
  "status": 201,
  "message": "Tarifa asignada exitosamente",
  "data": {
    "message": "Tarifa asignada exitosamente",
    "tarifa": {
      "id_tarifa": 6,
      "id_estacion": 1,
      "tipo_carga": "rapida",
      "costo_kw_h": "0.45",
      "costo_tiempo_min": "0.10"
    }
  }
}
```

---

## 📈 Sesiones / Reportes

### 15. GET /api/sessions
**Descripción**: Lista historial de sesiones (paginado)

**Query Parameters**:
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 20)

**Ejemplo**: `/api/sessions?page=2&limit=50`

**Response**:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id_sesion": 100,
        "id_usuario": 5,
        "id_cargador": 1,
        "fecha_inicio": "2024-11-05T10:00:00.000Z",
        "fecha_fin": "2024-11-05T11:30:00.000Z",
        "estado": "finalizada",
        "energia_consumida_kwh": "35.50",
        "monto_final": "16.00",
        "Cargador": {
          "id_cargador": 1,
          "tipo_carga": "rapida",
          "Estacion": {
            "nombre_estacion": "Estación Centro",
            "direccion": "Av. Principal 123"
          }
        },
        "User": {
          "nombre": "Juan",
          "apellido_paterno": "Pérez",
          "email": "juan@example.com"
        },
        "Tarifa": {
          "tipo_carga": "rapida",
          "costo_kw_h": "0.45",
          "costo_tiempo_min": "0.10"
        }
      }
    ],
    "pagination": {
      "total": 500,
      "page": 1,
      "limit": 20,
      "totalPages": 25
    }
  }
}
```

---

### 16. GET /api/sessions/export
**Descripción**: Exporta todas las sesiones a CSV

**Response**: Archivo CSV descargable

**Headers**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename=sesiones_1699123456789.csv
```

**Columnas del CSV**:
- id_sesion
- estacion
- cargador_id
- tipo_carga
- usuario
- email
- fecha_inicio
- fecha_fin
- estado
- energia_kwh
- monto_final
- tarifa_kwh

---

## 👥 Usuarios Backoffice

### 17. GET /api/admin-users
**Descripción**: Lista usuarios operadores de la franquicia

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id_admin": 1,
      "id_franquicia": 1,
      "nombre": "Carlos Admin",
      "email": "carlos@franquicia.com",
      "rol": "Administrador",
      "activo": true
    },
    {
      "id_admin": 2,
      "id_franquicia": 1,
      "nombre": "Ana Técnico",
      "email": "ana@franquicia.com",
      "rol": "tecnico",
      "activo": true
    }
  ]
}
```

**Nota**: `password_hash` nunca se incluye en las respuestas

---

### 18. GET /api/admin-users/:id
**Descripción**: Obtiene detalles de un usuario operador

**Response**:
```json
{
  "success": true,
  "data": {
    "id_admin": 1,
    "id_franquicia": 1,
    "nombre": "Carlos Admin",
    "email": "carlos@franquicia.com",
    "rol": "Administrador",
    "activo": true
  }
}
```

---

### 19. PUT /api/admin-users/:id
**Descripción**: Actualiza un usuario operador

**Request**:
```json
{
  "nombre": "Carlos Administrador",
  "rol": "super_admin",
  "activo": false
}
```

**Todos los campos son opcionales**

**Response**:
```json
{
  "success": true,
  "message": "Usuario operador actualizado exitosamente",
  "data": {
    "id_admin": 1,
    "nombre": "Carlos Administrador",
    "email": "carlos@franquicia.com",
    "rol": "super_admin",
    "activo": false
  }
}
```

---

### 20. GET /api/admin-users/clients
**Descripción**: Lista usuarios clientes (app móvil)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id_usuario": 1,
      "nombre": "Juan",
      "apellido_paterno": "Pérez",
      "apellido_materno": "García",
      "email": "juan@example.com",
      "telefono": null,
      "nfc_uid": null,
      "saldo_virtual": "100.00",
      "fecha_registro": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

---

## 🔒 Seguridad y Validaciones

### Todos los endpoints requieren:
1. **Token JWT válido** en header `Authorization: Bearer <token>`
2. **Token debe contener `franquiciaId`** (solo usuarios backoffice)
3. **Validación de pertenencia**: Los recursos (cargadores, tarifas, estaciones) deben pertenecer a la franquicia del usuario

### Middlewares aplicados:
```javascript
authenticateToken  // Valida token y extrae userId
authenticateJWT    // Valida token y extrae payload completo (incluye franquiciaId)
```

---

## 📝 Notas Importantes

### 1. Paginación
- Los endpoints que retornan listas grandes incluyen paginación
- Por defecto: `page=1`, `limit=20`
- Máximo recomendado: `limit=100`

### 2. Fechas
- Todas las fechas están en formato ISO 8601
- Zona horaria: UTC
- Formato: `YYYY-MM-DDTHH:mm:ss.sssZ`

### 3. Decimales
- Montos: 2 decimales (ej: `"12.50"`)
- Energía: 2-3 decimales (ej: `"35.50"`)
- Coordenadas: 6 decimales (ej: `"19.432608"`)

### 4. Estados
**Cargadores**: `disponible`, `ocupado`, `mantenimiento`, `fuera_de_servicio`, `reiniciando`
**Sesiones**: `pendiente`, `en_progreso`, `finalizada`, `cancelada`
**Alertas**: `activo`, `en_revision`, `resuelto`

---

## 🎯 Flujo de Trabajo Típico

### 1. Login
```bash
POST /api/admin/login
# Guardar token
```

### 2. Ver Dashboard
```bash
GET /api/dashboard/stats
GET /api/dashboard/active-alerts
GET /api/dashboard/energy-chart
```

### 3. Gestionar Cargadores
```bash
GET /api/chargers
POST /api/chargers
GET /api/chargers/1
PUT /api/chargers/1
POST /api/chargers/1/reset
```

### 4. Gestionar Tarifas
```bash
GET /api/rates
POST /api/rates
GET /api/stations
POST /api/stations/1/assign-rate
```

### 5. Ver Reportes
```bash
GET /api/sessions?page=1&limit=50
GET /api/sessions/export
```

### 6. Administrar Usuarios
```bash
GET /api/admin-users
PUT /api/admin-users/1
GET /api/admin-users/clients
```

---

## ✅ Instalación de Dependencias

Agregar al `package.json`:
```json
"json2csv": "^6.0.0-alpha.2"
```

Instalar:
```bash
npm install
```

---

**🎉 Todos los endpoints del backoffice están implementados y listos para usar!**
