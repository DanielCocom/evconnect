const { Op } = require('sequelize');
const { Estacion, Cargador, Tarifa } = require('../models');

class EstacionService {
    /**
     * Busca todas las estaciones activas y consolida la información de sus cargadores
     * y las tarifas vigentes.
     * @returns {Promise<Array>} Lista de estaciones con sus cargadores.
     */
    static async getAvailableStations() {
        const today = new Date();

        // 1. Obtener todas las estaciones activas
        const estaciones = await Estacion.findAll({
            where: { estado_operacion: 'activa' },
            // Incluir todos los cargadores que pertenecen a estas estaciones
            include: [{
                model: Cargador,
                as: 'Cargadores',
                where: { estado: { [Op.in]: ['disponible', 'ocupado', 'mantenimiento'] } } // Filtra estados relevantes
            }]
        });

        // 2. Obtener todas las tarifas vigentes para la fecha de hoy
        // Se puede optimizar esta consulta si solo se necesitan tarifas de las estaciones encontradas
        const tarifasVigentes = await Tarifa.findAll({
            where: {
                fecha_inicio_vigencia: { [Op.lte]: today }, // Vigente desde o antes de hoy
                [Op.or]: [
                    { fecha_fin_vigencia: { [Op.gte]: today } }, // Vigente hasta o después de hoy
                    { fecha_fin_vigencia: null } // O sin fecha de fin
                ]
            }
        });

        // 3. Mapear y consolidar los datos
        const consolidated = estaciones.map(estacion => {
            const estacionJson = estacion.toJSON();
            estacionJson.cargadores = estacionJson.Cargadores.map(cargador => {
                // Encontrar la tarifa de cobro por tiempo (minuto) para este tipo de cargador
                const tarifa = tarifasVigentes.find(t => 
                    t.id_estacion === estacion.id_estacion && 
                    t.tipo_carga === cargador.tipo_carga
                );
                
                return {
                    id_cargador: cargador.id_cargador,
                    tipo_carga: cargador.tipo_carga, // 'rapida' o 'lenta'
                    capacidad_kw: cargador.capacidad_kw,
                    estado: cargador.estado, // 'disponible', 'ocupado', 'mantenimiento'
                    
                    // CRÍTICO: Devolver la tarifa por minuto
                    costo_tiempo_min: tarifa ? tarifa.costo_tiempo_min : null 
                };
            });

            // Eliminar la relación de Sequelize cruda
            delete estacionJson.Cargadores; 
            
            // Determinar el estado general de la estación para el mapa:
            const totalDisponibles = estacionJson.cargadores.filter(c => c.estado === 'disponible').length;
            estacionJson.disponibilidad_general = totalDisponibles > 0 ? 'Disponible' : (estacionJson.total_cargadores === 0 ? 'Sin Cargadores' : 'Ocupada');

            return estacionJson;
        });

        return consolidated;
    }
    static async getStationsByFranchise(id_franquicia) {
        if (id_franquicia === undefined || id_franquicia === null) {
            throw new Error('Se requiere id_franquicia');
        }

        // Obtener estaciones asociadas a la franquicia, incluyendo cargadores (si existen)
        const estaciones = await Estacion.findAll({
            where: { id_franquicia },
            include: [{
                model: Cargador,
                as: 'Cargadores',
                required: false
            }]
        });

        // Normalizar respuesta a JSON y renombrar la relación para uso externo
        return estaciones.map(est => {
            const estacionJson = est.toJSON();
            estacionJson.cargadores = estacionJson.Cargadores || [];
            delete estacionJson.Cargadores;
            return estacionJson;
        });
    }

    /**
     * Obtiene todas las estaciones y cargadores de una franquicia específica por ID.
     * @param {number} id_franquicia - ID de la franquicia
     * @returns {Promise<Array>} Lista de estaciones con sus cargadores
     */
    static async getStationsByFranchiseId(id_franquicia) {
        if (!id_franquicia || isNaN(parseInt(id_franquicia))) {
            throw new Error('ID de franquicia inválido');
        }

        const id_franquicia_num = parseInt(id_franquicia);

        // Obtener estaciones asociadas a la franquicia, incluyendo cargadores
        const estaciones = await Estacion.findAll({
            where: { id_franquicia: id_franquicia_num },
            include: [{
                model: Cargador,
                as: 'Cargadores',
                where: { estado: { [Op.in]: ['disponible', 'ocupado', 'mantenimiento', 'fuera_servicio'] } },
                required: false // Incluir estaciones aunque no tengan cargadores
            }]
        });

        if (estaciones.length === 0) {
            // Verificar si la franquicia existe pero no tiene estaciones
            const { Franquicia } = require('../models');
            const franquicia = await Franquicia.findByPk(id_franquicia_num);
            if (!franquicia) {
                throw { status: 404, message: 'Franquicia no encontrada' };
            }
        }

        // Mapear y consolidar los datos
        return estaciones.map(estacion => {
            const estacionJson = estacion.toJSON();
            
            // Procesar cargadores
            estacionJson.cargadores = estacionJson.Cargadores ? estacionJson.Cargadores.map(cargador => ({
                id_cargador: cargador.id_cargador,
                numero_serie: cargador.numero_serie,
                tipo_carga: cargador.tipo_carga,
                capacidad_kw: cargador.capacidad_kw,
                estado: cargador.estado,
                id_estacion: cargador.id_estacion
            })) : [];

            // Eliminar la relación de Sequelize
            delete estacionJson.Cargadores;

            return estacionJson;
        });
    }
}

module.exports = { EstacionService };