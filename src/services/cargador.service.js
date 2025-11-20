const { Op } = require('sequelize');
const { Estacion, Cargador, Tarifa } = require('../models'); // ajusta la ruta según tu proyecto

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
        where: { id_estacion: id },
        order: [['id_cargador', 'ASC']], 
    });

    return cargadores;
}

/**
 * Obtiene la tarifa vigente para un cargador específico basándose en su id_estacion y tipo_carga.
 * @param {number|string} cargadorId - ID del cargador
 * @returns {Promise<Object>} - Objeto con información del cargador y su tarifa vigente
 * @throws {Error} - Si el cargador no existe o no hay tarifa vigente
 */
async function getTarifaByCargadorId(cargadorId) {
    const id = Number(cargadorId);
    if (Number.isNaN(id)) {
        throw { status: 400, message: 'ID de cargador inválido' };
    }

    // 1. Buscar el cargador y obtener id_estacion y tipo_carga
    const cargador = await Cargador.findByPk(id, {
        attributes: ['id_cargador', 'id_estacion', 'tipo_carga', 'estado', 'capacidad_kw']
    });

    if (!cargador) {
        throw { status: 404, message: 'Cargador no encontrado' };
    }

    // 2. Buscar la tarifa vigente para esa estación y tipo de carga
    const fechaActual = new Date();
    const tarifa = await Tarifa.findOne({
        where: {
            id_estacion: cargador.id_estacion,
            tipo_carga: cargador.tipo_carga,
            fecha_inicio_vigencia: {
                [Op.lte]: fechaActual
            },
            [Op.or]: [
                { fecha_fin_vigencia: null }, // Vigencia indefinida
                { fecha_fin_vigencia: { [Op.gte]: fechaActual } } // Aún vigente
            ]
        },
        order: [['fecha_inicio_vigencia', 'DESC']] // La más reciente
    });

    if (!tarifa) {
        throw { 
            status: 404, 
            message: `No hay tarifa vigente para el cargador (Estación: ${cargador.id_estacion}, Tipo: ${cargador.tipo_carga})` 
        };
    }

    // 3. Retornar la información consolidada
    return {
        cargador: {
            id_cargador: cargador.id_cargador,
            id_estacion: cargador.id_estacion,
            tipo_carga: cargador.tipo_carga,
            estado: cargador.estado,
            capacidad_kw: cargador.capacidad_kw
        },
        tarifa: {
            id_tarifa: tarifa.id_tarifa,
            costo_kw_h: tarifa.costo_kw_h,
            costo_tiempo_min: tarifa.costo_tiempo_min,
            fecha_inicio_vigencia: tarifa.fecha_inicio_vigencia,
            fecha_fin_vigencia: tarifa.fecha_fin_vigencia
        }
    };
}

module.exports = {
    getCargadoresPorEstacionId,
    getTarifaByCargadorId,
} ;