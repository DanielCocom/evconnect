const { EstacionService } = require("../services/estacion.service");

class EstacionController {
    /**
     * GET /api/stations
     * Obtiene la lista de estaciones disponibles con sus cargadores y tarifas.
     */
    static async getAvailableStations(req, res) {
        try {
            const result = await EstacionService.getAvailableStations();
            
            if (result.length === 0) {
                return res.ok([], "No se encontraron estaciones activas o con cargadores.", { code: "NO_STATIONS" });
            }

            return res.ok(result, "Lista de estaciones obtenida correctamente");
        } catch (err) {
            console.error('Error en EstacionController.getAvailableStations:', err);
            // Usamos el responseHandler global
            return res.error(err.status || 500, err.message || "Error al obtener estaciones");
        }
    }
    static async getStationsByFranchise(req, res) {
        try {
            const id_franquicia = req.user.franquiciaId
            if (id_franquicia === undefined || id_franquicia === null) {
                return res.error(400, 'Se requiere franquiciaId');
            }

            const result = await EstacionService.getStationsByFranchise(id_franquicia);

            if (result.length === 0) {
                return res.ok([], "No se encontraron estaciones para la franquicia.", { code: "NO_STATIONS" });
            }

            return res.ok(result, "Lista de estaciones de la franquicia obtenida correctamente");
        } catch (err) {
            console.error('Error en EstacionController.getStationsByFranchise:', err);
            return res.error(err.status || 500, err.message || "Error al obtener estaciones por franquicia");
        }
    }

    /**
     * GET /api/stations/franchise/:id
     * Obtiene las estaciones y cargadores de una franquicia específica por ID
     */
    static async getStationsByFranchiseId(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.error(400, 'ID de franquicia es requerido');
            }

            const result = await EstacionService.getStationsByFranchiseId(id);

            if (result.length === 0) {
                return res.ok([], "No se encontraron estaciones para la franquicia especificada.", { code: "NO_STATIONS" });
            }

            return res.ok(result, `Se encontraron ${result.length} estación(es) para la franquicia ${id}`);
        } catch (err) {
            console.error('Error en EstacionController.getStationsByFranchiseId:', err);
            return res.error(err.status || 500, err.message || "Error al obtener estaciones por ID de franquicia");
        }
    }
}

module.exports = { EstacionController };