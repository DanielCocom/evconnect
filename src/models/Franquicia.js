module.exports = (sequelize, DataTypes) => {
  const Franquicia = sequelize.define('Franquicia', {
    id_franquicia: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre_comercial: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    rfc: {
      type: DataTypes.STRING(20)
    },
    direccion: {
      type: DataTypes.TEXT
    },
    plan_contratado: {
      type: DataTypes.STRING(100)
    },
    estado_operacion: {
      type: DataTypes.STRING(50),
      defaultValue: 'activo'
    },
    fecha_alta: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'franquicia',
    timestamps: false
  });

  return Franquicia;
};