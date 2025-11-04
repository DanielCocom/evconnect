const { FranchiseService } = require("../services/franquicia.service");

class FranchiseController {

    static async getDashboardStats(req, res) {
        try {
            // El middleware 'authenticateToken' debe adjuntar el payload del token a req.user
            // Asumimos que req.user contiene { id, rol, franquiciaId }
            const userId = req.user?.id;
            const rol = req.user?.rol;
            const franquiciaId = req.user?.franquiciaId;

            if (!franquiciaId) {
                return res.error(401, "Usuario no está asociado a una franquicia.");
            }

            // 2. Llamar al servicio
            const stats = await FranchiseService.getDashboardStats(franquiciaId);

            // 3. Enviar respuesta exitosa
            return res.ok(stats, "Estadísticas del dashboard obtenidas");

        } catch (error) {
            // 4. Manejar errores
            return res.error(
                error.status || 500,
                error.message || "Error al obtener estadísticas"
            );
        }
    }
}

module.exports = { FranchiseController };