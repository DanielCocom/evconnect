const { Op } = require('sequelize');
const { Tarifa } = require('../models'); // Asegúrate de que tu modelo 'Tarifa' esté correctamente importado

class TarifaService {

    /**
     * Valida si la nueva tarifa se superpone con alguna tarifa existente para la misma estación y tipo de carga.
     * @param {number} id_estacion - ID de la estación.
     * @param {string} tipo_carga - Tipo de carga ('rápida', 'lenta', etc.).
     * @param {string} fecha_inicio_vigencia - Fecha de inicio de la nueva tarifa.
     * @param {string | null} fecha_fin_vigencia - Fecha de fin de la nueva tarifa (puede ser null).
     * @param {number | null} excludeId - ID de la tarifa a excluir de la validación (para actualizaciones).
     */
    static async checkOverlap(id_estacion, tipo_carga, fecha_inicio_vigencia, fecha_fin_vigencia, excludeId = null) {
        
        const newStart = new Date(fecha_inicio_vigencia);
        const newEnd = fecha_fin_vigencia ? new Date(fecha_fin_vigencia) : null;

        let whereCondition = {
            id_estacion,
            tipo_carga,
            // 1. La tarifa existente debe tener vigencia definida.
            fecha_inicio_vigencia: { [Op.not]: null } 
        };

        // Excluir la tarifa actual si estamos actualizando
        if (excludeId) {
            whereCondition.id_tarifa = { [Op.not]: excludeId };
        }

        // --- Lógica de Superposición (Overlap) ---

        // La superposición ocurre si:
        // A) La nueva tarifa empieza ANTES de que termine una vieja Y termina DESPUÉS de que empieza esa vieja.
        // O más sencillo: si las fechas NO están completamente fuera del rango de la otra.
        
        // 1. Tarifa existente sin fecha de fin (Vigencia infinita)
        // Si existe una tarifa sin fecha de fin (NULL), cualquier fecha nueva se superpone,
        // a menos que la nueva tarifa termine antes de que empiece la existente (imposible si la vieja está activa).
        const existingNoEnd = await Tarifa.findOne({
            where: {
                ...whereCondition,
                fecha_fin_vigencia: null,
                fecha_inicio_vigencia: { [Op.lte]: newStart } // La existente empezó antes o igual
            }
        });
        if (existingNoEnd) {
            throw { status: 409, message: `La tarifa se superpone con la Tarifa #${existingNoEnd.id_tarifa} (vigencia indefinida desde ${existingNoEnd.fecha_inicio_vigencia.toISOString().split('T')[0]}).` };
        }

        // 2. Tarifa existente con fecha de fin definida
        const existingWithEnd = await Tarifa.findOne({
            where: {
                ...whereCondition,
                fecha_fin_vigencia: { [Op.not]: null },
                [Op.or]: [
                    // Caso A: La nueva tarifa empieza mientras una vieja está activa
                    {
                        fecha_inicio_vigencia: { [Op.lte]: newStart },
                        fecha_fin_vigencia: { [Op.gte]: newStart }
                    },
                    // Caso B: La nueva tarifa termina mientras una vieja está activa
                    ...(newEnd ? [{
                        fecha_inicio_vigencia: { [Op.lte]: newEnd },
                        fecha_fin_vigencia: { [Op.gte]: newEnd }
                    }] : []),
                    // Caso C: La nueva tarifa envuelve completamente a una vieja
                    {
                        fecha_inicio_vigencia: { [Op.gte]: newStart },
                        ...(newEnd ? { fecha_fin_vigencia: { [Op.lte]: newEnd } } : {})
                    }
                ]
            }
        });

        if (existingWithEnd) {
             throw { status: 409, message: `La tarifa se superpone con la Tarifa #${existingWithEnd.id_tarifa} (vigente de ${existingWithEnd.fecha_inicio_vigencia.toISOString().split('T')[0]} a ${existingWithEnd.fecha_fin_vigencia.toISOString().split('T')[0]}).` };
        }
    }

    // --- Métodos CRUD ---

    static async create(data) {
        // Valida la superposición ANTES de crear
        await this.checkOverlap(data.id_estacion, data.tipo_carga, data.fecha_inicio_vigencia, data.fecha_fin_vigencia);

        return await Tarifa.create(data);
    }

    static async getAll(filter = {}) {
        const { id_estacion, tipo_carga } = filter;
        let where = {};
        
        if (id_estacion) {
            where.id_estacion = id_estacion;
        }
        if (tipo_carga) {
            where.tipo_carga = tipo_carga;
        }

        return await Tarifa.findAll({ 
            where,
            order: [['id_estacion', 'ASC'], ['fecha_inicio_vigencia', 'DESC']]
        });
    }

    static async getById(id) {
        const tarifa = await Tarifa.findByPk(id);
        if (!tarifa) {
            throw { status: 404, message: 'Tarifa no encontrada.' };
        }
        return tarifa;
    }

    static async update(id, data) {
        const tarifa = await this.getById(id);

        // Valida la superposición ANTES de actualizar, excluyendo la tarifa actual
        await this.checkOverlap(
            data.id_estacion || tarifa.id_estacion, 
            data.tipo_carga || tarifa.tipo_carga, 
            data.fecha_inicio_vigencia || tarifa.fecha_inicio_vigencia, 
            data.fecha_fin_vigencia === undefined ? tarifa.fecha_fin_vigencia : data.fecha_fin_vigencia, // Manejar null explícito
            id
        );

        await tarifa.update(data);
        return tarifa;
    }

    static async delete(id) {
        const tarifa = await this.getById(id);
        await tarifa.destroy();
        return { message: 'Tarifa eliminada con éxito.' };
    }
}

module.exports = { TarifaService };