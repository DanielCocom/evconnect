module.exports = (sequelize, DataTypes) => {
  const Tarifa = sequelize.define('Tarifa', {
    id_tarifa: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_estacion: {
      type: DataTypes.INTEGER
    },
    tipo_carga: {
      type: DataTypes.STRING(50)
    },
    costo_kw_h: {
      type: DataTypes.DECIMAL(10, 3)
    },
    costo_tiempo_min: {
      type: DataTypes.DECIMAL(10, 3)
    },
    fecha_inicio_vigencia: {
      type: DataTypes.DATEONLY, // Usamos DATEONLY para 'DATE'
      allowNull: false
    },
    fecha_fin_vigencia: {
      type: DataTypes.DATEONLY
    }
  }, {
    tableName: 'tarifa',
    timestamps: false
  });

  return Tarifa;
};