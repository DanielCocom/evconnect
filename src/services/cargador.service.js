const { Estacion, Cargador } = require('../models'); // ajusta la ruta según tu proyecto

/**
 * Obtiene todos los cargadores asociados a una estación.
 * @param {number|string} estacionId - id de la estación
 * @returns {Promise<Array>} - lista de cargadores
 * @throws {Error} - si el id es inválido o la estación no existe
 */
async function getCargadoresPorEstacionId(estacionId) {

    const id = Number(estacionId);
    if (Number.isNaN(id)) {
        throw new Error('Id de estación inválido');
    }

    const estacion = await Estacion.findByPk(id);
    if (!estacion) {
        throw new Error('Estación no encontrada');
    }

    // Obtener cargadores asociados
    const cargadores = await Cargador.findAll({
        where: { estacionId: id },
        order: [['id', 'ASC']], 
    });

    return cargadores;
}

module.exports = {
    getCargadoresPorEstacionId,
};