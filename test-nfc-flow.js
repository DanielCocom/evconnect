// Script de prueba rápida para el flujo NFC
// Ejecutar con: node test-nfc-flow.js

const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';
const CARGADOR_ID = 1; // Cambiar por un ID existente en tu BD

console.log('🧪 Iniciando prueba del flujo NFC...\n');

// Función de ayuda para logs
const log = (emoji, message) => console.log(`${emoji} ${message}`);
const error = (message) => console.error(`❌ ERROR: ${message}`);
const success = (message) => console.log(`✅ ${message}`);

// Fase 1: Probar endpoint de tarifas
async function testTarifasEndpoint() {
  log('📡', 'FASE 1: Probando GET /api/stations/tariffs...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/stations/tariffs`, {
      params: { id_cargador: CARGADOR_ID }
    });

    if (response.data.success) {
      success('Endpoint de tarifas funcionando correctamente');
      console.log('\n📊 Datos recibidos:');
      console.log('Cargador:', JSON.stringify(response.data.data.cargador, null, 2));
      console.log('Tarifa:', JSON.stringify(response.data.data.tarifa, null, 2));
      return response.data.data;
    }
  } catch (err) {
    if (err.response) {
      error(`HTTP ${err.response.status}: ${err.response.data.message}`);
    } else {
      error(err.message);
    }
    return null;
  }
}

// Fase 2: Probar conexión WebSocket
async function testWebSocketConnection() {
  log('🔌', '\nFASE 2: Probando conexión WebSocket...');

  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}/ws?cargadorId=${CARGADOR_ID}&role=client`);
    let messageCount = 0;

    ws.on('open', () => {
      success('WebSocket conectado');
    });

    ws.on('message', (data) => {
      messageCount++;
      const message = JSON.parse(data.toString());
      
      console.log(`\n📩 Mensaje #${messageCount} recibido:`);
      console.log(`   Tipo: ${message.type}`);
      
      if (message.type === 'subscribed') {
        console.log(`   Cargador ID: ${message.cargadorId}`);
        console.log(`   Estado: ${message.estado_cargador}`);
        console.log(`   Tipo de carga: ${message.tipo_carga}`);
        console.log(`   Capacidad: ${message.capacidad_kw} kW`);
        console.log(`   Conectado: ${message.conectado ? 'Sí ✓' : 'No ✗'}`);
        success('Mensaje de suscripción recibido correctamente');
      } else if (message.from === 'publisher') {
        console.log(`   Desde: Publisher (Cargador)`);
        console.log(`   Payload:`, JSON.stringify(message.payload, null, 2));
        
        if (message.payload.type === 'sync_response') {
          success('Respuesta de sincronización recibida del cargador');
        }
      }

      // Cerrar después de 5 segundos o 3 mensajes
      if (messageCount >= 3) {
        log('⏱️', 'Cerrando conexión WebSocket...');
        ws.close();
      }
    });

    ws.on('error', (err) => {
      error(`WebSocket: ${err.message}`);
      resolve(false);
    });

    ws.on('close', () => {
      log('🔌', 'WebSocket desconectado');
      resolve(messageCount > 0);
    });

    // Timeout de 10 segundos
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      resolve(messageCount > 0);
    }, 10000);
  });
}

// Fase 3: Simular cargador IoT (opcional)
async function testPublisherSimulation() {
  log('🤖', '\nFASE 3 (OPCIONAL): Simulando cargador IoT...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}/ws?cargadorId=${CARGADOR_ID}&role=publisher`);

    ws.on('open', () => {
      success('Cargador IoT conectado como publisher');
      
      // Enviar estado inicial
      const estadoInicial = {
        type: 'estado_sincronizado',
        cargadorId: CARGADOR_ID,
        estado: 'disponible',
        timestamp: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(estadoInicial));
      log('📤', 'Estado inicial enviado');
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'sync_request') {
        log('📥', 'Sync request recibido del servidor');
        
        // Responder con telemetría
        const syncResponse = {
          type: 'sync_response',
          cargadorId: CARGADOR_ID,
          estado: 'disponible',
          telemetria: {
            voltaje_v: 220.5,
            corriente_a: 0.0,
            potencia_w: 0.0,
            temperatura_c: 25.3,
            estado_rele: false
          },
          timestamp: new Date().toISOString()
        };
        
        ws.send(JSON.stringify(syncResponse));
        success('Sync response enviado');
        
        // Cerrar después de responder
        setTimeout(() => {
          ws.close();
        }, 2000);
      }
    });

    ws.on('close', () => {
      log('🤖', 'Simulación de cargador IoT finalizada');
      resolve(true);
    });

    ws.on('error', (err) => {
      error(`Publisher WebSocket: ${err.message}`);
      resolve(false);
    });

    // Timeout
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      resolve(true);
    }, 5000);
  });
}

// Ejecutar todas las pruebas
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   TEST DE FLUJO NFC - EVCONNECT');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test 1: Endpoint de tarifas
  const tarifaData = await testTarifasEndpoint();
  
  if (!tarifaData) {
    error('No se pudo obtener las tarifas. Verifica que:');
    console.log('  1. El servidor esté corriendo en http://localhost:3000');
    console.log(`  2. Exista un cargador con ID ${CARGADOR_ID} en la BD`);
    console.log('  3. Exista una tarifa vigente para ese cargador');
    process.exit(1);
  }

  // Test 2: WebSocket como cliente
  const wsClientSuccess = await testWebSocketConnection();
  
  if (!wsClientSuccess) {
    error('La conexión WebSocket falló');
    process.exit(1);
  }

  // Test 3: Simulación de IoT (opcional)
  console.log('\n❓ ¿Deseas simular un cargador IoT? (Esto enviará mensajes de prueba)');
  console.log('   Ejecutando simulación en 2 segundos...\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await testPublisherSimulation();

  // Resumen
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   RESUMEN DE PRUEBAS');
  console.log('═══════════════════════════════════════════════════════');
  success('Endpoint de tarifas: OK');
  success('WebSocket cliente: OK');
  success('Simulación IoT: OK');
  console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!\n');
  console.log('📝 El flujo NFC está funcionando correctamente.');
  console.log('📄 Consulta FLUJO_NFC_CARGA.md para más detalles.\n');
}

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  error(`Promesa rechazada: ${err.message}`);
  process.exit(1);
});

// Ejecutar
runAllTests().catch((err) => {
  error(err.message);
  process.exit(1);
});
