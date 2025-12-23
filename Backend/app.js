import express from "express";
import formationRoutes from "./Routes/formation.routes.js";
import authRoutes from "./Routes/auth.routes.js";
import dotenv from "dotenv";
import userRoutes from "./Routes/user.routes.js";
import formationValidationRoutes from "./Routes/formation_request.routes.js"; // ✅ NOUVEAU
import formationRequestRoutes from './Routes/formation_request.routes.js';

import cors from 'cors';

const app = express();

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(cors());
dotenv.config();

// ============ ROUTES ============
// Route de test
app.get('/api/test', (req, res) => {
  res.json({ message: 'API fonctionnelle ✅' });
});

// Routes existantes
app.use("/api/User", userRoutes);
app.use("/api", formationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', formationRequestRoutes);

// ✅ NOUVELLE ROUTE pour la validation des formations
app.use('/api', formationValidationRoutes);

// ============ GESTION DES ERREURS ============
// Gestion 404
app.use((req, res) => {
  console.log('❌ 404 - Route non trouvée:', req.method, req.url);
  res.status(404).json({ error: 'Route non trouvée: ' + req.url });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur serveur interne',
    details: err.message 
  });
});

// ============ DÉMARRAGE SERVEUR ============
app.listen(3000, () => {
  console.log('');
  console.log('=================================');
  console.log('✅ Server running on port 3000');
  console.log('📍 API: http://localhost:3000/api');
  console.log('🧪 Test: http://localhost:3000/api/test');
  console.log('📋 Formations: http://localhost:3000/api/formations/attente');
  console.log('=================================');
  console.log('');
});