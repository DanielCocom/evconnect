module.exports = (sequelize, DataTypes) => {
  const AlertaEvento = sequelize.define('AlertaEvento', {
    id_alerta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_estacion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_cargador: {
      type: DataTypes.INTEGER
    },
    tipo_evento: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT
    },
    nivel_gravedad: {
      type: DataTypes.STRING(20),
      defaultValue: 'bajo'
    },
    fecha_evento: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    estado: {
      type: DataTypes.STRING(50),
      defaultValue: 'pendiente'
    }
  }, {
    tableName: 'alerta_evento',
    timestamps: false
  });

  return AlertaEvento;
};