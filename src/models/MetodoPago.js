module.exports = (sequelize, DataTypes) => {
  const MetodoPago = sequelize.define('MetodoPago', {
    id_pago: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    token_referencia: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    es_predeterminado: { // AGREGAR ESTE CAMPO
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    fecha_registro: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'metodo_pago',
    timestamps: false
  });

  return MetodoPago;
};