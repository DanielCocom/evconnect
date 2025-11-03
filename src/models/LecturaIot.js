module.exports = (sequelize, DataTypes) => {
  const LecturaIot = sequelize.define('LecturaIot', {
    id_lectura: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_sesion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_cargador: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    voltaje_v: {
      type: DataTypes.DECIMAL(10, 3)
    },
    corriente_a: {
      type: DataTypes.DECIMAL(10, 3)
    },
    potencia_w: {
      type: DataTypes.DECIMAL(10, 3)
    },
    energia_acumulada_wh: {
      type: DataTypes.DECIMAL(12, 3)
    },
    temperatura_c: {
      type: DataTypes.DECIMAL(5, 2)
    },
    estado_rele: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'lectura_iot',
    timestamps: false
  });

  return LecturaIot;
};