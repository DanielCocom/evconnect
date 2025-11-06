const { SesionCarga, User, Cargador, Tarifa } = require('../models');
const { Op } = require('sequelize');

// Configuración MVP hardcodeada
const MVP_CONFIG = {
  CHARGER_ID: 1,
  TARIFA_KWH: 7.00, // $7.00 por kWh (carga rápida)
  SESSION_TIMEOUT: 7200000 // 2 horas
};

class SessionService {
  /**
   * Validar NFC y crear sesión
   */
  static async startSessionByNFC(nfcUid) {
    // 1. Buscar usuario por NFC
    const user = await User.findOne({
      where: { nfc_uid: nfcUid }
    });

    if (!user) {
      const err = new Error('NFC no registrado en el sistema');
      err.code = 'NFC_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // 2. Verificar que el cargador esté disponible
    const activeSession = await SesionCarga.findOne({
      where: {
        id_cargador: MVP_CONFIG.CHARGER_ID,
        estado: 'activa'
      }
    });

    if (activeSession) {
      const err = new Error('Cargador ocupado. Hay una sesión activa.');
      err.code = 'CHARGER_BUSY';
      err.status = 409;
      throw err;
    }

    // 3. Obtener tarifa (hardcoded para MVP, pero obtenemos de BD si existe)
    let tarifa = await Tarifa.findOne({
      where: {
        tipo_carga: 'rapida',
        fecha_inicio_vigencia: { [Op.lte]: new Date() },
        [Op.or]: [
          { fecha_fin_vigencia: null },
          { fecha_fin_vigencia: { [Op.gte]: new Date() } }
        ]
      }
    });

    // Si no hay tarifa en BD, usar hardcoded
    const tarifaKwh = tarifa ? parseFloat(tarifa.costo_kw_h) : MVP_CONFIG.TARIFA_KWH;

    // 4. Crear sesión
    const session = await SesionCarga.create({
      id_usuario: user.id_usuario,
      id_cargador: MVP_CONFIG.CHARGER_ID,
      id_tarifa: tarifa ? tarifa.id_tarifa : null,
      estado: 'activa',
      fecha_inicio: new Date(),
      energia_consumida_kwh: 0,
      monto_estimado: 0
    });

    console.log(`✓ Sesión ${session.id_sesion} iniciada para usuario ${user.nombre}`);

    return {
      session_id: session.id_sesion,
      user_id: user.id_usuario,
      user_name: `${user.nombre} ${user.apellido_paterno || ''}`.trim(),
      tarifa_kwh: tarifaKwh,
      charger_id: MVP_CONFIG.CHARGER_ID
    };
  }

  /**
   * Actualizar métricas de sesión
   */
  static async updateMetrics(sessionId, metrics) {
    const session = await SesionCarga.findByPk(sessionId);

    if (!session) {
      const err = new Error('Sesión no encontrada');
      err.status = 404;
      throw err;
    }

    if (session.estado !== 'activa') {
      const err = new Error('La sesión no está activa');
      err.status = 400;
      throw err;
    }

    // Calcular energía acumulada
    // Fórmula: energia_anterior + (potencia_watts * intervalo_segundos) / 3600000
    const energiaAnterior = parseFloat(session.energia_consumida_kwh) || 0;
    const potenciaKw = metrics.w / 1000; // Watts a kW
    const intervaloHoras = 3 / 3600; // 3 segundos a horas
    const energiaIncremental = potenciaKw * intervaloHoras;
    const energiaNueva = energiaAnterior + energiaIncremental;

    // Calcular costo
    const tarifa = await Tarifa.findByPk(session.id_tarifa);
    const tarifaKwh = tarifa ? parseFloat(tarifa.costo_kw_h) : MVP_CONFIG.TARIFA_KWH;
    const costoActual = energiaNueva * tarifaKwh;

    // Actualizar sesión
    await session.update({
      energia_consumida_kwh: energiaNueva.toFixed(3),
      monto_estimado: costoActual.toFixed(2)
    });

    // Calcular tiempo transcurrido
    const tiempoSegundos = Math.floor((Date.now() - new Date(session.fecha_inicio).getTime()) / 1000);

    return {
      session_id: sessionId,
      charger_id: MVP_CONFIG.CHARGER_ID,
      v: metrics.v,
      a: metrics.a,
      w: metrics.w,
      kwh: parseFloat(energiaNueva.toFixed(3)),
      cost: parseFloat(costoActual.toFixed(2)),
      time: tiempoSegundos
    };
  }

  /**
   * Finalizar sesión
   */
  static async endSession(sessionId, reason = 'manual') {
    const session = await SesionCarga.findByPk(sessionId, {
      include: [
        { model: User, attributes: ['nombre', 'apellido_paterno'] }
      ]
    });

    if (!session) {
      const err = new Error('Sesión no encontrada');
      err.status = 404;
      throw err;
    }

    // Calcular duración
    const duracionSegundos = Math.floor((Date.now() - new Date(session.fecha_inicio).getTime()) / 1000);

    // Actualizar sesión
    await session.update({
      estado: 'completada',
      fecha_fin: new Date(),
      monto_final: session.monto_estimado
    });

    console.log(`✓ Sesión ${sessionId} finalizada. Razón: ${reason}`);

    return {
      session_id: sessionId,
      summary: {
        duration: duracionSegundos,
        energy_kwh: parseFloat(session.energia_consumida_kwh),
        cost: parseFloat(session.monto_final),
        user_name: session.User ? `${session.User.nombre} ${session.User.apellido_paterno || ''}`.trim() : 'Usuario'
      }
    };
  }

  /**
   * Cancelar sesión (por emergencia)
   */
  static async cancelSession(sessionId) {
    const session = await SesionCarga.findByPk(sessionId);

    if (!session) {
      const err = new Error('Sesión no encontrada');
      err.status = 404;
      throw err;
    }

    await session.update({
      estado: 'cancelada',
      fecha_fin: new Date(),
      monto_final: 0 // No se cobra en emergencia
    });

    console.log(`✓ Sesión ${sessionId} cancelada por emergencia`);

    return {
      session_id: sessionId,
      status: 'cancelled'
    };
  }

  /**
   * Obtener sesión activa del cargador
   */
  static async getActiveSession() {
    const session = await SesionCarga.findOne({
      where: {
        id_cargador: MVP_CONFIG.CHARGER_ID,
        estado: 'activa'
      },
      include: [
        { model: User, attributes: ['nombre', 'apellido_paterno', 'nfc_uid'] }
      ]
    });

    if (!session) {
      return null;
    }

    const tiempoSegundos = Math.floor((Date.now() - new Date(session.fecha_inicio).getTime()) / 1000);

    return {
      session_id: session.id_sesion,
      user_name: session.User ? `${session.User.nombre} ${session.User.apellido_paterno || ''}`.trim() : 'Usuario',
      nfc_uid: session.User?.nfc_uid,
      energia_kwh: parseFloat(session.energia_consumida_kwh),
      costo: parseFloat(session.monto_estimado),
      tiempo: tiempoSegundos,
      fecha_inicio: session.fecha_inicio
    };
  }

  /**
   * Obtener estado del cargador
   */
  static async getChargerStatus() {
    const activeSession = await this.getActiveSession();

    return {
      id: MVP_CONFIG.CHARGER_ID,
      status: activeSession ? 'ocupado' : 'disponible',
      session: activeSession
    };
  }
}

module.exports = { SessionService };