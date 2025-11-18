const { getCargadoresPorEstacionId } = require('../services/cargador.service');

class CargadorController {
    /**
     * Maneja petición para obtener los cargadores de una estación.
     * Espera que el id de la estación venga en req.params.estacionId o req.params.id.
     */
    async obtenerPorEstacion(req, res, next) {
        try {
            const estacionId = req.params.estacionId || req.params.id;
            const cargadores = await getCargadoresPorEstacionId(estacionId);
            return res.status(200).json(cargadores);
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = new CargadorController();