module.exports = (sequelize, DataTypes) => {
  const Cargador = sequelize.define('Cargador', {
    id_cargador: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_estacion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo_carga: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    capacidad_kw: {
      type: DataTypes.DECIMAL(10, 2)
    },
    estado: {
      type: DataTypes.STRING(50),
      defaultValue: 'disponible'
    },
    fecha_instalacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    firmware_version: {
      type: DataTypes.STRING(50)
    }
  }, {
    tableName: 'cargador',
    timestamps: false
  });

  return Cargador;
};