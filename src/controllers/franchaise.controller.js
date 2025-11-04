const { FranchiseService } = require("../services/franquicia.service");

class FranchiseController {

    static async getDashboardStats(req, res) {
        try {
            
            const franquiciaId = req.user?.franquiciaId;
            if (!franquiciaId) {
                return res.error(401, "Usuario no está asociado a una franquicia.");
            }

            const stats = await FranchiseService.getDashboardStats(franquiciaId);
            return res.ok(stats, "Estadísticas obtenidas");

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