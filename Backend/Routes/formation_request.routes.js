import express from "express";
import {
  getFormationsEnAttente,
  getFormationDetails,
  validerFormation,
  refuserFormation,
  getFormateurs
} from "../Controller/formation_request.controller.js";

const router = express.Router();

// ============================================
// ROUTES POUR LA VALIDATION DES FORMATIONS
// ============================================

// GET - Liste des formations en attente de validation
router.get("/formations/attente", getFormationsEnAttente);

// GET - Détails complets d'une formation (avec objectifs et compétences)
router.get("/formations/:id/details", getFormationDetails);

// PUT - Valider une formation (change l'état en 'validee')
router.put("/formations/:id/valider", validerFormation);

// PUT - Refuser une formation (change l'état en 'refusee')
router.put("/formations/:id/refuser", refuserFormation);

// GET - Liste des formateurs disponibles
router.get("/formateurs", getFormateurs);

export default router;