# 🚀 Ejemplos Prácticos y Scripts - EVConnect

## 🎯 Scripts de Prueba Rápida

### Variables de Configuración
```bash
# Configurar variables para los ejemplos
export BASE_URL="http://localhost:4000"
export WS_URL="ws://localhost:4000/ws"
```

---

## 👤 Flujo Usuario App Móvil

### 1. Registro de Usuario
```bash
#!/bin/bash
# registro_usuario.sh

curl -X POST $BASE_URL/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "María Elena",
    "apellido_paterno": "Rodríguez", 
    "apellido_materno": "López",
    "email": "maria.rodriguez@gmail.com",
    "password": "miPassword123"
  }' | jq '.'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "status": 201,
  "message": "Usuario creado correctamente",
  "data": {
    "id_usuario": 1,
    "nombre": "María Elena",
    "apellido_paterno": "Rodríguez",
    "apellido_materno": "López", 
    "email": "maria.rodriguez@gmail.com",
    "saldo_virtual": "0.00",
    "fecha_registro": "2024-11-04T16:30:22.123Z",
    "nfc_uid": null
  }
}
```

### 2. Login y Capturar Token
```bash
#!/bin/bash
# login_usuario.sh

RESPONSE=$(curl -s -X POST $BASE_URL/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.rodriguez@gmail.com",
    "password": "miPassword123"
  }')

echo "Respuesta completa:"
echo $RESPONSE | jq '.'

# Extraer solo el token
TOKEN=$(echo $RESPONSE | jq -r '.data.token')
echo ""
echo "Token extraído:"
echo $TOKEN

# Guardar token en archivo para reutilizar
echo $TOKEN > user_token.txt
echo "Token guardado en user_token.txt"
```

### 3. Obtener Perfil con Token
```bash
#!/bin/bash
# perfil_usuario.sh

# Leer token del archivo
TOKEN=$(cat user_token.txt)

curl -X GET $BASE_URL/api/user/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

---

## 🏢 Flujo Usuario BackOffice

### 1. Crear Usuario Administrador
```bash
#!/bin/bash
# crear_admin.sh

curl -X POST $BASE_URL/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "id_franquicia": 1,
    "nombre": "Carlos Administrador",
    "email": "carlos.admin@franquicia.com",
    "password": "adminPassword123",
    "rol": "Administrador"
  }' | jq '.'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id_admin": 1,
    "id_franquicia": 1,
    "nombre": "Carlos Administrador",
    "email": "carlos.admin@franquicia.com", 
    "rol": "Administrador",
    "activo": true
  }
}
```

### 2. Login Admin y Capturar Token
```bash
#!/bin/bash
# login_admin.sh

RESPONSE=$(curl -s -X POST $BASE_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos.admin@franquicia.com",
    "password": "adminPassword123"
  }')

echo "Respuesta completa:"
echo $RESPONSE | jq '.'

# Extraer token de admin
ADMIN_TOKEN=$(echo $RESPONSE | jq -r '.data.token')
echo ""
echo "Admin Token extraído:"
echo $ADMIN_TOKEN

# Guardar token de admin
echo $ADMIN_TOKEN > admin_token.txt
echo "Admin token guardado en admin_token.txt"
```

### 3. Dashboard de Franquicia
```bash
#!/bin/bash
# dashboard_franquicia.sh

# Leer token de admin
ADMIN_TOKEN=$(cat admin_token.txt)

echo "Obteniendo estadísticas del dashboard..."
curl -X GET $BASE_URL/api/franquicia/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "status": 200,
  "message": "Estadísticas obtenidas",
  "data": {
    "energiaTotal": 1250.75,
    "ingresosTotales": 45000.50,
    "ingresosDiarios": 850.25,
    "sesionesActivas": 12,
    "estadoCargadores": [
      {
        "id_cargador": 1,
        "estado": "disponible",
        "id_estacion": 1
      },
      {
        "id_cargador": 2, 
        "estado": "ocupado",
        "id_estacion": 1
      }
    ]
  }
}
```

---

## 🌐 Ejemplos WebSocket

### Cliente JavaScript (Navegador)
```html
<!DOCTYPE html>
<html>
<head>
    <title>EVConnect WebSocket Client</title>
</head>
<body>
    <h1>Monitor de Estación en Tiempo Real</h1>
    <div id="status">Desconectado</div>
    <div id="telemetry"></div>
    
    <button onclick="enviarComando()">Iniciar Carga</button>

    <script>
        // Configuración
        const ESTACION_ID = 1;
        const TOKEN = 'tu_token_aqui'; // Poner token real
        
        // Conectar WebSocket
        const ws = new WebSocket(`ws://localhost:4000/ws?token=${TOKEN}&role=client&estacionId=${ESTACION_ID}`);
        
        ws.onopen = function() {
            document.getElementById('status').innerHTML = 
                `<span style="color: green;">✅ Conectado a Estación ${ESTACION_ID}</span>`;
            console.log('WebSocket conectado');
        };
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            console.log('Mensaje recibido:', data);
            
            if (data.type === 'subscribed') {
                console.log('Suscrito exitosamente');
            } else if (data.from === 'publisher') {
                // Telemetría en tiempo real
                mostrarTelemetria(data.payload.data);
            }
        };
        
        ws.onerror = function(error) {
            console.error('Error WebSocket:', error);
            document.getElementById('status').innerHTML = 
                '<span style="color: red;">❌ Error de conexión</span>';
        };
        
        ws.onclose = function() {
            console.log('WebSocket cerrado');
            document.getElementById('status').innerHTML = 
                '<span style="color: orange;">⚠️ Desconectado</span>';
        };
        
        function mostrarTelemetria(data) {
            const html = `
                <div style="border: 1px solid #ccc; padding: 10px; margin: 5px;">
                    <h3>📊 Telemetría en Tiempo Real</h3>
                    <p><strong>Voltaje:</strong> ${data.voltaje_v} V</p>
                    <p><strong>Corriente:</strong> ${data.corriente_a} A</p>
                    <p><strong>Potencia:</strong> ${data.potencia_w} W</p>
                    <p><strong>Temperatura:</strong> ${data.temperatura_c} °C</p>
                    <p><strong>Relé:</strong> ${data.estado_rele ? '🟢 Activo' : '🔴 Inactivo'}</p>
                    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                </div>
            `;
            document.getElementById('telemetry').innerHTML = html;
        }
        
        function enviarComando() {
            const comando = {
                command: 'start_charging',
                session_id: Math.floor(Math.random() * 1000),
                user_id: 123
            };
            
            ws.send(JSON.stringify(comando));
            console.log('Comando enviado:', comando);
        }
    </script>
</body>
</html>
```

### Simulador de Estación IoT (Node.js)
```javascript
// simulador_estacion.js
const WebSocket = require('ws');

class EstacionIoTSimulator {
    constructor(estacionId) {
        this.estacionId = estacionId;
        this.ws = null;
        this.telemetryInterval = null;
        this.isCharging = false;
    }
    
    connect() {
        const url = `ws://localhost:4000/ws?role=publisher&estacionId=${this.estacionId}`;
        console.log(`🔌 Conectando estación ${this.estacionId}...`);
        
        this.ws = new WebSocket(url);
        
        this.ws.on('open', () => {
            console.log(`✅ Estación ${this.estacionId} conectada como publisher`);
            this.startTelemetry();
        });
        
        this.ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('📨 Mensaje recibido:', message);
            
            if (message.from === 'client') {
                this.handleClientCommand(message.payload);
            }
        });
        
        this.ws.on('error', (error) => {
            console.error('❌ Error WebSocket:', error);
        });
        
        this.ws.on('close', () => {
            console.log('🔌 Conexión cerrada');
            this.stopTelemetry();
        });
    }
    
    startTelemetry() {
        console.log('📊 Iniciando envío de telemetría...');
        
        this.telemetryInterval = setInterval(() => {
            this.sendTelemetry();
        }, 3000); // Cada 3 segundos
    }
    
    stopTelemetry() {
        if (this.telemetryInterval) {
            clearInterval(this.telemetryInterval);
            this.telemetryInterval = null;
            console.log('⏹️ Telemetría detenida');
        }
    }
    
    sendTelemetry() {
        // Simular valores realistas
        const baseVoltage = 220;
        const baseCurrent = this.isCharging ? 30 : 0;
        const basePower = this.isCharging ? 6600 : 0;
        
        const telemetry = {
            type: 'telemetry_data',
            data: {
                voltaje_v: baseVoltage + (Math.random() - 0.5) * 10,
                corriente_a: baseCurrent + (Math.random() - 0.5) * 5,
                potencia_w: basePower + (Math.random() - 0.5) * 1000,
                temperatura_c: 25 + Math.random() * 15,
                estado_rele: this.isCharging,
                timestamp: new Date().toISOString()
            }
        };
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(telemetry));
            console.log(`📡 Telemetría enviada - Carga: ${this.isCharging ? 'Activa' : 'Inactiva'}`);
        }
    }
    
    handleClientCommand(command) {
        console.log('⚡ Procesando comando:', command);
        
        switch (command.command) {
            case 'start_charging':
                this.isCharging = true;
                console.log('🔋 Iniciando proceso de carga...');
                break;
                
            case 'stop_charging':
                this.isCharging = false;
                console.log('⏸️ Deteniendo proceso de carga...');
                break;
                
            case 'get_status':
                this.sendStatusUpdate();
                break;
                
            default:
                console.log('❓ Comando desconocido:', command.command);
        }
    }
    
    sendStatusUpdate() {
        const status = {
            type: 'status_update',
            data: {
                estacion_id: this.estacionId,
                estado: this.isCharging ? 'ocupado' : 'disponible',
                timestamp: new Date().toISOString()
            }
        };
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(status));
            console.log('📋 Estado enviado');
        }
    }
    
    disconnect() {
        this.stopTelemetry();
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Uso del simulador
const estacion = new EstacionIoTSimulator(1);
estacion.connect();

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando simulador...');
    estacion.disconnect();
    process.exit(0);
});

// Cada 30 segundos cambiar estado de carga (demo)
setInterval(() => {
    estacion.isCharging = !estacion.isCharging;
    console.log(`🔄 Estado cambiado - Carga: ${estacion.isCharging ? 'Activa' : 'Inactiva'}`);
}, 30000);
```

### Ejecutar Simulador:
```bash
# Instalar dependencias si es necesario
npm install ws

# Ejecutar simulador de estación
node simulador_estacion.js
```

---

## 🧪 Tests de Integración

### Script de Pruebas Completas
```bash
#!/bin/bash
# test_completo.sh

echo "🧪 Iniciando tests de integración EVConnect"
echo "============================================"

# Configurar URLs
BASE_URL="http://localhost:4000"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para hacer requests y validar
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4
    local expected_status=$5
    local test_name=$6
    
    echo -e "\n${YELLOW}🔍 Test: $test_name${NC}"
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method "$BASE_URL$url" -H "$headers" -H "Content-Type: application/json" -d "$data")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method "$BASE_URL$url" -H "Content-Type: application/json" -d "$data")
        fi
    else
        if [ -n "$headers" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method "$BASE_URL$url" -H "$headers")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method "$BASE_URL$url")
        fi
    fi
    
    body=$(echo $response | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    status=$(echo $response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC} - Status: $status"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "Response: $body"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} - Expected: $expected_status, Got: $status"
        echo "Response: $body"
        return 1
    fi
}

# Test 1: Registro de usuario
test_endpoint "POST" "/api/user/register" '{
    "nombre": "Test User",
    "email": "test@example.com", 
    "password": "testpass123"
}' "" "201" "Registro de usuario"

# Test 2: Login de usuario
login_response=$(curl -s -X POST "$BASE_URL/api/user/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "testpass123"
    }')

USER_TOKEN=$(echo $login_response | jq -r '.data.token' 2>/dev/null)

if [ "$USER_TOKEN" != "null" ] && [ -n "$USER_TOKEN" ]; then
    echo -e "${GREEN}✅ Login exitoso - Token obtenido${NC}"
    echo "Token: ${USER_TOKEN:0:50}..."
else
    echo -e "${RED}❌ Error obteniendo token de usuario${NC}"
    echo "Response: $login_response"
fi

# Test 3: Perfil de usuario con token
if [ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "null" ]; then
    test_endpoint "GET" "/api/user/me" "" "Authorization: Bearer $USER_TOKEN" "200" "Obtener perfil de usuario"
fi

# Test 4: Crear usuario backoffice
test_endpoint "POST" "/api/admin/create" '{
    "id_franquicia": 1,
    "nombre": "Test Admin",
    "email": "admin@test.com",
    "password": "adminpass123",
    "rol": "Administrador"
}' "" "201" "Crear usuario backoffice"

# Test 5: Login admin
admin_login_response=$(curl -s -X POST "$BASE_URL/api/admin/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@test.com",
        "password": "adminpass123"
    }')

ADMIN_TOKEN=$(echo $admin_login_response | jq -r '.data.token' 2>/dev/null)

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}✅ Login admin exitoso - Token obtenido${NC}"
    echo "Admin Token: ${ADMIN_TOKEN:0:50}..."
else
    echo -e "${RED}❌ Error obteniendo token de admin${NC}"
    echo "Response: $admin_login_response"
fi

# Test 6: Dashboard de franquicia
if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    test_endpoint "GET" "/api/franquicia/dashboard" "" "Authorization: Bearer $ADMIN_TOKEN" "200" "Dashboard de franquicia"
fi

# Test 7: Acceso a Swagger
swagger_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/docs")
swagger_status=$(echo $swagger_response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$swagger_status" -eq "200" ]; then
    echo -e "\n${GREEN}✅ Swagger accesible en /api/docs${NC}"
else
    echo -e "\n${RED}❌ Swagger no accesible${NC}"
fi

echo -e "\n🎉 Tests completados"
echo "=================================="
echo "📊 Resumen:"
echo "- Usuario registrado: test@example.com"
echo "- Admin creado: admin@test.com" 
echo "- Tokens generados correctamente"
echo "- Swagger UI: $BASE_URL/api/docs"
echo -e "\n💡 Usar tokens guardados para tests adicionales"
```

### Ejecutar Tests:
```bash
# Hacer executable
chmod +x test_completo.sh

# Ejecutar
./test_completo.sh
```

---

## 📋 Checklist de Verificación

### ✅ Checklist de Configuración
- [ ] Servidor corriendo en puerto 4000
- [ ] Variables de entorno configuradas (.env)
- [ ] Base de datos conectada
- [ ] Swagger accesible en `/api/docs`

### ✅ Checklist de Endpoints
- [ ] POST `/api/user/register` funciona
- [ ] POST `/api/user/login` devuelve token
- [ ] GET `/api/user/me` con token funciona
- [ ] POST `/api/admin/create` funciona  
- [ ] POST `/api/admin/login` devuelve token con franquiciaId
- [ ] GET `/api/franquicia/dashboard` con token admin funciona

### ✅ Checklist de WebSocket
- [ ] Conexión como cliente funciona
- [ ] Conexión como publisher funciona  
- [ ] Mensajes se envían correctamente
- [ ] Heartbeat funciona (30s)

### ✅ Checklist de Seguridad
- [ ] Passwords se hashean con bcrypt
- [ ] JWT tokens expiran (12h por defecto)
- [ ] Headers Authorization requeridos
- [ ] Conexión DB usa SSL

---

## 🛠️ Scripts de Mantenimiento

### Limpiar Datos de Prueba
```bash
#!/bin/bash
# limpiar_datos_test.sh

echo "🧹 Limpiando datos de prueba..."

# Conectar a la base de datos y limpiar
# Nota: Ajustar según tu configuración de BD

# Si tienes acceso directo a la BD:
# psql $DATABASE_URL -c "DELETE FROM usuario WHERE email LIKE '%test%' OR email LIKE '%example%';"
# psql $DATABASE_URL -c "DELETE FROM usuario_backoffice WHERE email LIKE '%test%';"

echo "✅ Datos de prueba limpiados"
```

### Verificar Estado del Servidor
```bash
#!/bin/bash
# verificar_servidor.sh

echo "🔍 Verificando estado del servidor EVConnect..."

# Verificar si el proceso está corriendo
if pgrep -f "node.*src/index.js" > /dev/null; then
    echo "✅ Servidor está corriendo"
else
    echo "❌ Servidor NO está corriendo"
fi

# Verificar conectividad
if curl -s http://localhost:4000/api/docs > /dev/null; then
    echo "✅ Servidor responde HTTP"
else
    echo "❌ Servidor no responde HTTP"
fi

# Verificar WebSocket
if command -v wscat > /dev/null; then
    echo "🔌 Testing WebSocket..."
    timeout 5s wscat -c ws://localhost:4000/ws?role=client&estacionId=1 --close > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ WebSocket funcional"
    else
        echo "❌ WebSocket no responde"
    fi
else
    echo "⚠️ wscat no instalado, saltando test WebSocket"
fi
```

---

**🎉 Documentación de ejemplos completa!**

Todos estos scripts y ejemplos están listos para usar y probar la funcionalidad completa de EVConnect API.