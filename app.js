const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const authRoutes = require('./src/routes/authRoutes');

dotenv.config();

const app = express();

// 🔒 Configuración de CORS
app.use(cors({
  origin: ["http://localhost:8085", "https://lifepill.duckdns.org", "*"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 📦 Middleware
app.use(bodyParser.json());

// 📘 Configuración Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "LifePill Auth API",
      version: "1.0.0",
      description: "Documentación del servicio de autenticación de LifePill",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://lifepill.duckdns.org:8085"
          : "http://localhost:8085",
      },
    ],
  },
  apis: ["./src/routes/authRoutes.js"], // solo el módulo de autenticación
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// 🧠 Rutas
app.get('/', (req, res) => {
  res.send('Auth Service - LifePill');
});

app.use('/api/auth', authRoutes);

// 🚀 Conexión y ejecución
(async () => {
  try {
    console.log("🔗 Intentando conectar a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ Conectado a MongoDB Atlas");

    app.listen(8085, () => {
      console.log('🚀 Auth Service corriendo en puerto 8085');
      console.log('📄 Swagger docs en http://localhost:8085/api/docs');
    });

  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err.message);
  }
})();
