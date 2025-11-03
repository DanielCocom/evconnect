const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const UserBackOffice = sequelize.define("usuario_backoffice", {
    id_admin: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_franquicia: {
      type: DataTypes.INTEGER,
      ForeignKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
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
    rol: {
      type: DataTypes.STRING(50),
      default: null
    },
    activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
  }, {
    tableName: "usuario_backoffice",
    timestamps: false
  });

  return UserBackOffice;
};
