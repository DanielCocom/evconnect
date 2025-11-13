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
}

module.exports = { EstacionController };