const { Op } = require('sequelize');
const { SesionCarga, Cargador, Estacion, User } = require('../models'); 

class ReporteService {
    
    /**
     * Obtiene el historial de sesiones de carga filtrado por el ID de la Franquicia.
     * Incluye información del usuario móvil, cargador y estación.
     * @param {number} id_franquicia - ID de la franquicia del usuario autenticado.
     * @param {object} filters - Filtros opcionales (estado, fecha_inicio, fecha_fin).
     * @returns {Promise<Array<Object>>}
     */
    static async getChargeSessionsByFranchise(id_franquicia, filters = {}) {
        const { estado, fecha_inicio, fecha_fin } = filters;
        
        let whereCondition = {};
        
        // --- 1. Aplicar Filtros de Estado y Fechas ---
        if (estado) {
            whereCondition.estado = estado;
        }

        if (fecha_inicio || fecha_fin) {
            whereCondition.fecha_inicio = {};
            if (fecha_inicio) {
                // Sesiones que iniciaron después o el mismo día del filtro de inicio
                whereCondition.fecha_inicio[Op.gte] = new Date(fecha_inicio);
            }
            if (fecha_fin) {
                // Sesiones que iniciaron antes o el mismo día del filtro de fin
                const endOfDay = new Date(fecha_fin);
                endOfDay.setHours(23, 59, 59, 999); // Incluir todo el día final
                whereCondition.fecha_inicio[Op.lte] = endOfDay;
            }
        }

        // --- 2. Realizar la Consulta con Joins y Filtro de Seguridad ---
        // Se hace un JOIN (include) con Cargador, Estacion y User.
        return await SesionCarga.findAll({
            where: whereCondition,
            include: [
                {
                    model: Cargador,
                    attributes: ['id_cargador', 'id_estacion', 'estado', 'tipo_carga'],
                    as: 'Cargador',
                    required: true, // Asegura que solo se devuelvan sesiones con cargador
                    include: [
                        {
                            model: Estacion,
                            attributes: ['nombre_estacion'],
                            as: 'Estacion',
                            where: { id_franquicia: id_franquicia }, // <-- FILTRO CLAVE DE SEGURIDAD
                            required: true // Necesitamos que la estación pertenezca a la franquicia
                        }
                    ]
                },
                {
                    model: User,
                    attributes: ['id_usuario', 'nombre', 'apellido_materno','apellido_paterno', 'email'] // Solo datos relevantes del cliente
                }
            ],
            attributes: ['id_sesion', 'id_cargador', 'id_tarifa', 'metodo_pago_utilizado', 'fecha_inicio', 
                'fecha_fin', 'estado', 'energia_consumida_kwh', 'monto_estimado', 'monto_final'],
            order: [['fecha_inicio', 'DESC']] // Últimas sesiones primero
        
        });
    }
    /**
     * Obtiene el detalle de una sesión de carga específica, aplicando el filtro de seguridad por Franquicia.
     * @param {number} id_sesion - ID de la sesión a buscar.
     * @param {number} id_franquicia - ID de la franquicia del usuario autenticado (para seguridad).
     * @returns {Promise<Object>}
     */
    static async getChargeSessionDetail(id_sesion, id_franquicia) {
        
        const session = await SesionCarga.findByPk(id_sesion, {
            include: [
                {
                    model: Cargador,
                    as: 'Cargador',
                    required: true,
                    include: [
                        {
                            model: Estacion,
                            as: 'Estacion',
                            // FILTRO DE SEGURIDAD CLAVE: La estación debe pertenecer a la franquicia
                            where: { id_franquicia: id_franquicia },
                            required: true
                        }
                    ]
                },
                {
                    model: User,
                    attributes: ['id_usuario', 'nombre', 'apellido_aterno','apellido:_materno', 'email'] // Datos del cliente
                }
            ]
        });

        if (!session) {
       
            throw { status: 404, message: 'Sesión de carga no encontrada o acceso denegado.' };
        }

        return session;
    }


}

module.exports = { ReporteService };