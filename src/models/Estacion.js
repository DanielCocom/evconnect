module.exports = (sequelize, DataTypes) => {
  const Estacion = sequelize.define('Estacion', {
    id_estacion: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_franquicia: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nombre_estacion: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    direccion: {
      type: DataTypes.TEXT
    },
    ubicacion_lat: {
      type: DataTypes.DECIMAL(10, 6)
    },
    ubicacion_lon: {
      type: DataTypes.DECIMAL(10, 6)
    },
    total_cargadores: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    estado_operacion: {
      type: DataTypes.STRING(50),
      defaultValue: 'activa'
    }
  }, {
    tableName: 'estacion',
    timestamps: false
  });

  return Estacion;
};