const { Estacion, Cargador } = require('../models'); // ajusta la ruta según tu proyecto

/**
 * Obtiene todos los cargadores asociados a una estación.
 * @param {number|string} estacionId - id de la estación
 * @returns {Promise<Array>} - lista de cargadores
 * @throws {Error} - si el id es inválido o la estación no existe
 */
async function getCargadoresPorEstacionId(id_estacion) {

    const id = Number(id_estacion);
    if (Number.isNaN(id)) {
        throw new Error('Id de estación inválido');
    }

    const estacion = await Estacion.findByPk(id);
    if (!estacion) {
        throw new Error('Estación no encontrada');
    }

    // Obtener cargadores asociados
    const cargadores = await Cargador.findAll({
        where: { id_estacion: id },
        order: [['id_cargador', 'ASC']], 
    });

    return cargadores;
}
/**
 * Obtiene los cargadores disponibles de una estación filtrados por tipo de carga.
 * @param {number|string} estacionId - id de la estación
 * @param {string} tipoCarga - tipo de carga ('rapida' o 'lenta')
 * @returns {Promise<Array>} - lista de cargadores disponibles del tipo especificado
 * @throws {Error} - si el id es inválido, la estación no existe o el tipo de carga es inválido
 */
async function getCargadoresDisponiblesPorTipo(id_estacion, tipoCarga) {
    const id = Number(id_estacion);
    if (Number.isNaN(id)) {
        throw new Error('Id de estación inválido');
    }

    // const tiposValidos = ['rapida', 'lenta'];
    // if (!tiposValidos.includes(tipoCarga?.toLowerCase())) {
    //     throw new Error('Tipo de carga inválido. Debe ser "rapida" o "lenta"');
    // }

    const estacion = await Estacion.findByPk(id);
    if (!estacion) {
        throw new Error('Estación no encontrada');
    }

    const cargadores = await Cargador.findAll({
        where: { 
            id_estacion: id,
            estado: 'disponible',
            tipo_carga: tipoCarga.toLowerCase()
        },
        order: [['id_cargador', 'ASC']], 
    });

    return cargadores;
}

module.exports = {
    getCargadoresPorEstacionId,
    getCargadoresDisponiblesPorTipo
};