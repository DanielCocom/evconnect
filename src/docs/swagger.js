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
        - **Pagos con Stripe** - Autorización y captura de pagos por sesión de carga
        - **Métodos de pago** - Gestión de tarjetas con Stripe
        - **Dashboard de franquicia** con estadísticas en tiempo real
        - **WebSocket** para comunicación en tiempo real con estaciones IoT
        - **Base de datos PostgreSQL** con Sequelize ORM
        
        ## Autenticación:
        La mayoría de endpoints requieren autenticación JWT. Incluye el token en el header:
        \`Authorization: Bearer <tu_token>\`
        
        ## Flujo de Pagos con Stripe:
        1. **Registro**: Al crear cuenta, se genera automáticamente un Customer en Stripe
        2. **Vincular tarjeta**: 
           - POST /api/payment-methods/setup → Obtener client_secret
           - Frontend confirma con Stripe.js → Obtener payment_method_id
           - POST /api/payment-methods → Guardar tarjeta
        3. **Sesión de carga**: 
           - Se autoriza monto estimado (NO se cobra aún)
           - Al finalizar, se captura el monto real consumido
           - Webhook de Stripe actualiza el estado final
        
        ## Tarjetas de Prueba (Stripe):
        - Éxito: 4242 4242 4242 4242
        - Decline: 4000 0000 0000 0002
        - Requiere autenticación: 4000 0025 0000 3155
        
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
      },
      {
        name: "Métodos de Pago",
        description: "Gestión de métodos de pago con Stripe - Vincular, listar y eliminar tarjetas"
      }
    ]
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"]
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
