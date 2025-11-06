// Re-export del clientManager para permitir require('./clients')
// Archivo añadido para compatibilidad con importaciones desde ../ws
const clientManager = require('./clientManager');

module.exports = clientManager;
