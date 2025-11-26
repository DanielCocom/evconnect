const { getCargadoresPorEstacionId, getTarifaByCargadorId, getCargadoresDisponiblesPorTipo } = require('../services/cargador.service');

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