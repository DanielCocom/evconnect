import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EVCONNECT API",
      version: "1.0.0"
    },
    servers: [{ url: process.env.API_URL || "http://localhost:4000" }]
  },
  apis: ["./src/routes/*.ts", "./src/models/*.ts"] // documentar con JSDoc en rutas
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
