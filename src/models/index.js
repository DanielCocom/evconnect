const { Sequelize } = require('sequelize');
const sequelize = require('../db/sequelize');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Importar todos los modelos
db.User = require('./User')(sequelize, Sequelize.DataTypes);
db.MetodoPago = require('./MetodoPago')(sequelize, Sequelize.DataTypes);
db.Franquicia = require('./Franquicia')(sequelize, Sequelize.DataTypes);
db.Estacion = require('./Estacion')(sequelize, Sequelize.DataTypes);
db.Cargador = require('./Cargador')(sequelize, Sequelize.DataTypes);
db.Tarifa = require('./Tarifa')(sequelize, Sequelize.DataTypes);
db.SesionCarga = require('./SesionCarga')(sequelize, Sequelize.DataTypes);
db.LecturaIot = require('./LecturaIot')(sequelize, Sequelize.DataTypes);
db.AlertaEvento = require('./AlertaEvento')(sequelize, Sequelize.DataTypes);
db.UserBackOffice = require('./UserBackOffice')(sequelize, Sequelize.DataTypes);

// --- 1. Relaciones de Usuario (App) ---
// Usuario <-> MetodoPago (Uno a Muchos)
db.User.hasMany(db.MetodoPago, { foreignKey: 'id_usuario', onDelete: 'CASCADE' });
db.MetodoPago.belongsTo(db.User, { foreignKey: 'id_usuario' });

// Usuario <-> SesionCarga (Uno a Muchos)
db.User.hasMany(db.SesionCarga, { foreignKey: 'id_usuario', onDelete: 'CASCADE' });
db.SesionCarga.belongsTo(db.User, { foreignKey: 'id_usuario' });

// --- 2. Relaciones de Franquicia (Jerarquía) ---
// Franquicia <-> Estacion (Uno a Muchos)
db.Franquicia.hasMany(db.Estacion, { foreignKey: 'id_franquicia', onDelete: 'CASCADE' });
db.Estacion.belongsTo(db.Franquicia, { foreignKey: 'id_franquicia' });

// Franquicia <-> UserBackOffice (Uno a Muchos)
db.Franquicia.hasMany(db.UserBackOffice, { foreignKey: 'id_franquicia', onDelete: 'CASCADE' });
db.UserBackOffice.belongsTo(db.Franquicia, { foreignKey: 'id_franquicia' });

// Estacion <-> Cargador (Uno a Muchos)
db.Estacion.hasMany(db.Cargador, { foreignKey: 'id_estacion', as: 'Cargadores', onDelete: 'CASCADE' });
db.Cargador.belongsTo(db.Estacion, { foreignKey: 'id_estacion' });

// Estacion <-> Tarifa (Uno a Muchos)
db.Estacion.hasMany(db.Tarifa, { foreignKey: 'id_estacion', onDelete: 'SET NULL' });
db.Tarifa.belongsTo(db.Estacion, { foreignKey: 'id_estacion' });

// Estacion <-> AlertaEvento (Uno a Muchos)
db.Estacion.hasMany(db.AlertaEvento, { foreignKey: 'id_estacion', onDelete: 'CASCADE' });
db.AlertaEvento.belongsTo(db.Estacion, { foreignKey: 'id_estacion' });

// Cargador <-> AlertaEvento (Uno a Muchos)
db.Cargador.hasMany(db.AlertaEvento, { foreignKey: 'id_cargador', onDelete: 'SET NULL' });
db.AlertaEvento.belongsTo(db.Cargador, { foreignKey: 'id_cargador' });

// --- 3. Relaciones de Operación (El Corazón) ---
// Cargador <-> SesionCarga (Uno a Muchos)
db.Cargador.hasMany(db.SesionCarga, { foreignKey: 'id_cargador', onDelete: 'CASCADE' });
db.SesionCarga.belongsTo(db.Cargador, { foreignKey: 'id_cargador' });

// Tarifa <-> SesionCarga (Uno a Muchos)
db.Tarifa.hasMany(db.SesionCarga, { foreignKey: 'id_tarifa', onDelete: 'SET NULL' });
db.SesionCarga.belongsTo(db.Tarifa, { foreignKey: 'id_tarifa' });

// MetodoPago <-> SesionCarga (Uno a Muchos)
db.MetodoPago.hasMany(db.SesionCarga, { foreignKey: 'metodo_pago_utilizado', onDelete: 'SET NULL' });
db.SesionCarga.belongsTo(db.MetodoPago, { foreignKey: 'metodo_pago_utilizado' });

// --- 4. Relaciones de IoT (Telemetría) ---
// SesionCarga <-> LecturaIot (Uno a Muchos)
db.SesionCarga.hasMany(db.LecturaIot, { foreignKey: 'id_sesion', onDelete: 'CASCADE' });
db.LecturaIot.belongsTo(db.SesionCarga, { foreignKey: 'id_sesion' });

// Cargador <-> LecturaIot (Uno a Muchos)
db.Cargador.hasMany(db.LecturaIot, { foreignKey: 'id_cargador', onDelete: 'CASCADE' });
db.LecturaIot.belongsTo(db.Cargador, { foreignKey: 'id_cargador' });


module.exports = db;