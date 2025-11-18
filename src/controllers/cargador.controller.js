const { getCargadoresPorEstacionId, getTarifaByCargadorId } = require('../services/cargador.service');

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

    /**
     * Obtiene la tarifa vigente para un cargador específico.
     * Espera que el id_cargador venga como query parameter.
     * GET /api/stations/tariffs?id_cargador=123
     */
    async obtenerTarifaPorCargador(req, res, next) {
        try {
            const { id_cargador } = req.query;

            if (!id_cargador) {
                return res.status(400).json({
                    success: false,
                    message: 'El parámetro id_cargador es requerido'
                });
            }

            const resultado = await getTarifaByCargadorId(id_cargador);

            return res.status(200).json({
                success: true,
                message: 'Tarifa obtenida correctamente',
                data: resultado
            });
        } catch (error) {
            return next(error);
        }
    }
}

module.exports = new CargadorController();