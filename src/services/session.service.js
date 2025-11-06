const { SesionCarga, Cargador, Estacion, User, Tarifa } = require("../models");
const { Parser } = require('json2csv');

class SessionService {
  /**
   * GET /api/sessions
   * Obtiene historial paginado de sesiones
   */
  static async getAllSessions(franquiciaId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const { count, rows } = await SesionCarga.findAndCountAll({
        include: [
          {
            model: Cargador,
            required: true,
            attributes: ['id_cargador', 'tipo_carga'],
            include: [{
              model: Estacion,
              required: true,
              where: { id_franquicia: franquiciaId },
              attributes: ['nombre_estacion', 'direccion']
            }]
          },
          {
            model: User,
            required: true,
            attributes: ['nombre', 'apellido_paterno', 'email']
          },
          {
            model: Tarifa,
            required: false,
            attributes: ['tipo_carga', 'costo_kw_h', 'costo_tiempo_min']
          }
        ],
        order: [['fecha_inicio', 'DESC']],
        limit,
        offset
      });

      return {
        sessions: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error("Error en SessionService.getAllSessions:", error);
      throw new Error("Error al obtener sesiones");
    }
  }

  /**
   * GET /api/sessions/export
   * Genera CSV con todas las sesiones
   */
  static async exportSessions(franquiciaId) {
    try {
      const sesiones = await SesionCarga.findAll({
        include: [
          {
            model: Cargador,
            required: true,
            attributes: ['id_cargador', 'tipo_carga'],
            include: [{
              model: Estacion,
              required: true,
              where: { id_franquicia: franquiciaId },
              attributes: ['nombre_estacion', 'direccion']
            }]
          },
          {
            model: User,
            required: true,
            attributes: ['nombre', 'apellido_paterno', 'email']
          },
          {
            model: Tarifa,
            required: false,
            attributes: ['tipo_carga', 'costo_kw_h']
          }
        ],
        order: [['fecha_inicio', 'DESC']]
      });

      // Formatear datos para CSV
      const dataForCSV = sesiones.map(s => ({
        id_sesion: s.id_sesion,
        estacion: s.Cargador?.Estacion?.nombre_estacion || 'N/A',
        cargador_id: s.id_cargador,
        tipo_carga: s.Cargador?.tipo_carga || 'N/A',
        usuario: `${s.User?.nombre || ''} ${s.User?.apellido_paterno || ''}`.trim() || 'N/A',
        email: s.User?.email || 'N/A',
        fecha_inicio: s.fecha_inicio,
        fecha_fin: s.fecha_fin || 'En progreso',
        estado: s.estado,
        energia_kwh: s.energia_consumida_kwh,
        monto_final: s.monto_final || s.monto_estimado || 0,
        tarifa_kwh: s.Tarifa?.costo_kw_h || 'N/A'
      }));

      // Convertir a CSV
      const fields = [
        'id_sesion', 'estacion', 'cargador_id', 'tipo_carga', 
        'usuario', 'email', 'fecha_inicio', 'fecha_fin', 
        'estado', 'energia_kwh', 'monto_final', 'tarifa_kwh'
      ];
      
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(dataForCSV);

      return csv;
    } catch (error) {
      console.error("Error en SessionService.exportSessions:", error);
      throw new Error("Error al exportar sesiones");
    }
  }
}

module.exports = { SessionService };
