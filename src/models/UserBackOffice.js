module.exports = (sequelize, DataTypes) => {
  const UserBackOffice = sequelize.define('UserBackOffice', {
    id_admin: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_franquicia: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    rol: {
      type: DataTypes.STRING(50),
      defaultValue: 'tecnico'
    },
    password_hash: {
      type: DataTypes.TEXT,
      allowNull: false
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