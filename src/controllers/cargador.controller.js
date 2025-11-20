const { getCargadoresPorEstacionId, getCargadoresDisponiblesPorTipo } = require('../services/cargador.service');

class CargadorController {
    /**
     * Maneja petición para obtener los cargadores de una estación.
     * Espera que el id de la estación venga en req.params.estacionId o req.params.id.
     */
    async obtenerPorEstacion(req, res, next) {
        try {
            const estacionId = req.params.estacionId || req.params.id;
            const cargadores = await getCargadoresPorEstacionId(estacionId);
            return res.ok(cargadores, 'Cargadores obtenidos exitosamente');
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Maneja petición para obtener los cargadores disponibles de una estación por tipo de carga.
     * Espera que el id de la estación venga en req.params.estacionId o req.params.id.
     * Espera que el tipo de carga venga en req.query.tipoCarga.
     */
    async obtenerDisponiblesPorTipo(req, res, next) {
        try {
            const estacionId = req.params.estacionId || req.params.id;
            const tipoCarga = req.query.tipoCarga;
            const cargadores = await getCargadoresDisponiblesPorTipo(estacionId, tipoCarga);
            
            if (!cargadores || cargadores.length === 0) {
                return res.error(404, 'No hay cargadores disponibles');
            }
            
            return res.ok(cargadores, 'Cargadores disponibles obtenidos exitosamente');
        } catch (error) {
            return next(error);
        }
    }
}


module.exports = new CargadorController();