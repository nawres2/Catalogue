import express from 'express';
import {
  getAllOnboardingSessions,
  getOnboardingDetails,
  createOnboardingSession,
  updateOnboardingSession,
  deleteOnboardingSession,
  getOnboardingSessionsP,
  clearTranslationCache,
  getCacheStats
} from '../Controller/onboardingControlleur.js';
 
const router = express.Router();

// ⚠️ ORDRE CRITIQUE : Routes spécifiques AVANT les routes avec :id

// 1️⃣ Routes administratives et utilitaires
router.get('/sessions', getAllOnboardingSessions);           // Liste admin (toutes sessions)
router.post('/sessions', createOnboardingSession);           // Créer une session
router.get('/sessionsPay', getOnboardingSessionsP);          // Catalogue public (avec ?lang=)

// 2️⃣ Routes de cache (debug/monitoring)
router.delete('/cache/clear', clearTranslationCache);        // Vider le cache
router.get('/cache/stats', getCacheStats);                   // Stats du cache

// 3️⃣ Routes avec paramètres dynamiques :id (TOUJOURS EN DERNIER)
router.get('/:id/details', getOnboardingDetails);            // Détails d'une session (avec ?lang=)
router.put('/:id', updateOnboardingSession);                 // Modifier une session
router.delete('/:id', deleteOnboardingSession);              // Supprimer une session

export default router;