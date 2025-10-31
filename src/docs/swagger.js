const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EVCONNECT API",
      version: "1.0.0"
    },
    servers: [{ 
      url: process.env.API_URL || "http://localhost:4000" 
    }]
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"]
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
