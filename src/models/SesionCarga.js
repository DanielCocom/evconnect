module.exports = (sequelize, DataTypes) => {
  const SesionCarga = sequelize.define('SesionCarga', {
    id_sesion: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_cargador: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_tarifa: {
      type: DataTypes.INTEGER
    },
    metodo_pago_utilizado: {
      type: DataTypes.INTEGER
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    fecha_fin: {
      type: DataTypes.DATE
    },
    estado: {
      type: DataTypes.STRING(50),
      defaultValue: 'pendiente'
    },
    energia_consumida_kwh: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0
    },
    monto_estimado: {
      type: DataTypes.DECIMAL(10, 2)
    },
    monto_final: {
      type: DataTypes.DECIMAL(10, 2)
    },
    id_pago_transaccion: {
      type: DataTypes.STRING(100)
    },
    // Nuevos campos para seguimiento en tiempo real
    duracion_estimada_min: {
      type: DataTypes.INTEGER,
      comment: 'Duración en minutos que el usuario solicitó inicialmente'
    },
    tiempo_transcurrido_min: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Tiempo real transcurrido en minutos'
    },
    monto_por_minuto: {
      type: DataTypes.DECIMAL(10, 2),
      comment: 'Tarifa por minuto aplicada en esta sesión'
    }
  }, {
    tableName: 'sesion_carga',
    timestamps: false
  });

  return SesionCarga;
};