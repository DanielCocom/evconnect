/**
 * Genera un UID único para la Tarjeta Virtual NFC del usuario.
 * Para simplificar, usamos la implementación de UUID. En un entorno real,
 * se debería verificar si el UID ya existe en la base de datos (aunque la columna es UNIQUE).
 * @returns {string} UID alfanumérico único.
 */
function generateNfcUid() {
    // Usamos UUID v4 (generado por crypto) y removemos los guiones para hacerlo más "tag-like"
    const uid = crypto.randomUUID().replace(/-/g, '').toUpperCase();
    
    // Opcional: Podrías prefijarlo, por ejemplo: return 'EV_' + uid.substring(0, 16);
    return uid; 
}

// Nota: En un proyecto real, se debería usar un generador de secuencias más corto o verificar colisiones.
// Para este proyecto escolar, asumiremos que crypto.randomUUID() es suficiente.

module.exports = { generateNfcUid };