const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EVCONNECT API",
      version: "1.0.0",
      description: `
        API REST para la gestión de estaciones de carga de vehículos eléctricos.
        
        ## Características principales:
        - **Gestión de usuarios** (app móvil y backoffice)
        - **Autenticación JWT** con diferentes roles
        - **Dashboard de franquicia** con estadísticas en tiempo real
        - **WebSocket** para comunicación en tiempo real con estaciones IoT
        - **Base de datos PostgreSQL** con Sequelize ORM
        
        ## Autenticación:
        La mayoría de endpoints requieren autenticación JWT. Incluye el token en el header:
        \`Authorization: Bearer <tu_token>\`
        
        ## WebSocket:
        Conexión disponible en: \`ws://localhost:4000/ws\`
        - Parámetros: \`token\`, \`role\` (publisher|client), \`estacionId\`
      `,
      contact: {
        name: "EVConnect Support",
        email: "support@evconnect.com"
      },
      license: {
        name: "ISC"
      }
    },
    servers: [
      { 
        url: process.env.API_URL || "http://localhost:4000",
        description: "Servidor de desarrollo"
      }
    ],
    tags: [
      {
        name: "Usuarios",
        description: "Gestión de usuarios de la aplicación móvil"
      },
      {
        name: "Usuarios BackOffice", 
        description: "Gestión de usuarios del panel administrativo"
      },
      {
        name: "Franquicia",
        description: "Estadísticas y gestión de franquicias"
      }
    ]
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"]
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
