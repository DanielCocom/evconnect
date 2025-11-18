const pubsub = require('../ws/pubsub'); // Ajusta la ruta si es necesario

class IotService {
    
    // Conserva esta estructura y ajusta tu lógica si ya la tenías
    static registerCharger(id_cargador, ws) {
        pubsub.registerPublisher(id_cargador, ws);
    }

    static unregisterCharger(ws) {
        pubsub.removePublisher(ws._publisherFor);
    }
    
    static getSocketId(id_cargador) {
        return pubsub.publishers.has(String(id_cargador)); 
    }

    /**
     * Envía un comando de control (START/STOP/RESET) a un cargador específico.
     * Llamado por el servicio de Mantenimiento (WEB-7)
     */
    static sendCommand(id_cargador, command, payload = {}) {
        
        const message = {
            command: command,
            cargadorId: id_cargador,
            timestamp: new Date().toISOString(),
            ...payload
        };
        
        const sent = pubsub.sendToPublisher(id_cargador, message); // Usa el método de PubSub

        if (!sent) {
            throw { status: 404, message: `El cargador ${id_cargador} no está actualmente conectado (WebSocket).` };
        }

        console.log(`[IoT] Comando '${command}' enviado a Cargador ${id_cargador}.`);
        return true;
    }
}

module.exports = { IotService };    