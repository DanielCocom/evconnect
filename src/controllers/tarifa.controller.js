const { TarifaService } = require("../services/tarifa.service");

class TarifaController {
    
    // POST /api/admin/tarifas
    static async createTarifa(req, res) {
        try {
            const { id_estacion, tipo_carga, costo_kw_h, costo_tiempo_min, fecha_inicio_vigencia, fecha_fin_vigencia } = req.body;

            if (!id_estacion || !tipo_carga || !fecha_inicio_vigencia) {
                return res.error(422, 'Campos requeridos faltantes: id_estacion, tipo_carga, fecha_inicio_vigencia.');
            }
            if (!costo_kw_h && !costo_tiempo_min) {
                return res.error(422, 'Se requiere al menos un costo (costo_kw_h o costo_tiempo_min).');
            }

            const data = {
                id_estacion: Number(id_estacion),
                tipo_carga,
                costo_kw_h: costo_kw_h ? Number(costo_kw_h) : null,
                costo_tiempo_min: costo_tiempo_min ? Number(costo_tiempo_min) : null,
                fecha_inicio_vigencia: new Date(fecha_inicio_vigencia),
                fecha_fin_vigencia: fecha_fin_vigencia ? new Date(fecha_fin_vigencia) : null
            };

            const tarifa = await TarifaService.create(data);
            return res.created(tarifa, 'Tarifa creada con éxito.');
        } catch (err) {
            console.error('Error en TarifaController.createTarifa:', err);
            return res.error(err.status || 500, err.message || 'Error al crear la tarifa.');
        }
    }

    // GET /api/admin/tarifas?id_estacion=X&tipo_carga=Y
    static async getAllTarifas(req, res) {
        try {
            const { id_estacion, tipo_carga } = req.query;
            
            const filter = {};
            if (id_estacion) filter.id_estacion = Number(id_estacion);
            if (tipo_carga) filter.tipo_carga = tipo_carga;

            const tarifas = await TarifaService.getAll(filter);
            return res.ok(tarifas, 'Listado de tarifas.');
        } catch (err) {
            console.error('Error en TarifaController.getAllTarifas:', err);
            return res.error(err.status || 500, err.message || 'Error al obtener las tarifas.');
        }
    }

    // GET /api/admin/tarifas/:id
    static async getTarifaById(req, res) {
        try {
            const id = Number(req.params.id);
            const tarifa = await TarifaService.getById(id);
            return res.ok(tarifa, 'Detalle de la tarifa.');
        } catch (err) {
            console.error('Error en TarifaController.getTarifaById:', err);
            return res.error(err.status || 500, err.message || 'Error al obtener la tarifa.');
        }
    }

    // PUT /api/admin/tarifas/:id
    static async updateTarifa(req, res) {
        try {
            const id = Number(req.params.id);
            const data = req.body;
            
            // Convertir a número si existen
            if (data.id_estacion) data.id_estacion = Number(data.id_estacion);
            if (data.costo_kw_h) data.costo_kw_h = Number(data.costo_kw_h);
            if (data.costo_tiempo_min) data.costo_tiempo_min = Number(data.costo_tiempo_min);
            
            // Convertir a Date si existen
            if (data.fecha_inicio_vigencia) data.fecha_inicio_vigencia = new Date(data.fecha_inicio_vigencia);
            if (data.fecha_fin_vigencia === '') data.fecha_fin_vigencia = null; // Permite pasar una cadena vacía para establecer NULL
            else if (data.fecha_fin_vigencia) data.fecha_fin_vigencia = new Date(data.fecha_fin_vigencia);

            const updatedTarifa = await TarifaService.update(id, data);
            return res.ok(updatedTarifa, 'Tarifa actualizada con éxito.');
        } catch (err) {
            console.error('Error en TarifaController.updateTarifa:', err);
            return res.error(err.status || 500, err.message || 'Error al actualizar la tarifa.');
        }
    }

    // DELETE /api/admin/tarifas/:id
    static async deleteTarifa(req, res) {
        try {
            const id = Number(req.params.id);
            const result = await TarifaService.delete(id);
            return res.ok(result, result.message);
        } catch (err) {
            console.error('Error en TarifaController.deleteTarifa:', err);
            return res.error(err.status || 500, err.message || 'Error al eliminar la tarifa.');
        }
    }
}

module.exports = { TarifaController };