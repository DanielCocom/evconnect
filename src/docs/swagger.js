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
      `,
      contact: {
        name: "EVConnect Support",
        email: "support@evconnect.com"
      },
      license: {
        name: "ISC"
      }
    },
    // Configuración dinámica de servidores según el entorno
    servers: [
      // Servidor de producción (si existe RENDER_EXTERNAL_URL o similar)
      ...(process.env.RENDER_EXTERNAL_URL ? [{
        url: process.env.RENDER_EXTERNAL_URL,
        description: "Servidor de producción (Render)"
      }] : []),
      
      // Servidor personalizado desde variable de entorno
      ...(process.env.API_URL && process.env.API_URL !== "http://localhost:4000" ? [{
        url: process.env.API_URL,
        description: "Servidor configurado"
      }] : []),
      
      // Servidor de desarrollo (siempre disponible como fallback)
      { 
        url: "http://localhost:4000",
        description: "Servidor de desarrollo local"
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