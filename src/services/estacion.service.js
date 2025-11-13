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
}

module.exports = { EstacionService };