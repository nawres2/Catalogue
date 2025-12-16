import express from "express";
import { getFormationById,getFormations ,addFormation,getFormateurs,deleteFormation,updateFormation,getObjectifs,addObjectif,getCompetences,addCompetence} from "../Controller/formation.controller.js";

const router = express.Router();
 
router.get('/formations', getFormations);

router.get("/formation/:id", getFormationById);

router.post('/formation', addFormation);
router.get('/formateurs', getFormateurs);
router.put("/formations/:id", updateFormation);
router.delete("/formations/:id", deleteFormation);
router.get('/objectifs', getObjectifs);
router.post('/objectif', addObjectif);
router.get('/competences', getCompetences);
router.post('/competence', addCompetence);
export default router;
