const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define("User", {
    id_usuario: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    apellido_paterno: {
      type: DataTypes.STRING(100)
    },
    apellido_materno: {
      type: DataTypes.STRING(100)
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    nfc_uid: {
      type: DataTypes.STRING(50),
      unique: true
    },
    saldo_virtual: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    stripe_customer_id: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: true
    },
    tarjeta_verificada: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    fecha_registro: {
      type: DataTypes.DATE,
      field: "fecha_registro",
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: "usuario",
    timestamps: false
  });

  return User;
};
