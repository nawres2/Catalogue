import express from "express";
import { getFormationById, getFormationsByFormateur, getFormations ,addFormation,getFormateurs,deleteFormation,updateFormation,getObjectifs,addObjectif,getCompetences,addCompetence,addFormationFor,getPays,getOnboardingFormationsByPays} from "../Controller/formation.controller.js";
import { downloadExcel } from "../Controller/formation.controller.js";
import { verifyToken,authenticate  } from "../Middleware/authMiddleware.js";
import { db } from '../db.js';  // <-- Ajoute cette ligne


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
router.get("/download", downloadExcel);
router.post('/FormationAttent', addFormationFor);
router.get(
  '/formations/formateur',
  authenticate, 
  getFormationsByFormateur
);
router.get('/pays', getPays);
router.get('/OnBording', getOnboardingFormationsByPays);



// ✅ Remplacez cette route dans votre formation.routes.js

router.get('/formations/onboarding', async (req, res) => {
  try {
    console.log('📥 Fetching OnBoarding formations...');
    
    // Récupérer les formations OnBoarding avec les pays
    const [rows] = await db.query(`
      SELECT 
        f.*,
        GROUP_CONCAT(DISTINCT p.id_pays ORDER BY p.id_pays SEPARATOR ',') as pays_ids,
        GROUP_CONCAT(DISTINCT p.nom ORDER BY p.id_pays SEPARATOR '|||') as pays_noms
      FROM formation f
      LEFT JOIN formation_pays fp ON fp.id_formation = f.id_formation
      LEFT JOIN pays p ON p.id_pays = fp.id_pays
      WHERE f.parcours = 'OnBoarding' AND f.etat = 'validee'
      GROUP BY f.id_formation
    `);

    console.log('✅ OnBoarding formations found:', rows.length);
    
    // Enrichir chaque formation avec objectifs, compétences et pays
    const formationsEnriched = await Promise.all(
      rows.map(async (row) => {
        // Récupérer les objectifs
        const [objectifs] = await db.query(
          `SELECT o.libelle 
           FROM formation_objectif fo
           JOIN objectif o ON o.id_objectif = fo.id_objectif
           WHERE fo.id_formation = ?`,
          [row.id_formation]
        );

        // Récupérer les compétences
        const [competences] = await db.query(
          `SELECT c.libelle 
           FROM formation_competence fc
           JOIN competence c ON c.id_competence = fc.id_competence
           WHERE fc.id_formation = ?`,
          [row.id_formation]
        );

        // Transformer les pays
        let pays = [];
        if (row.pays_ids && row.pays_noms) {
          const paysIds = row.pays_ids.split(',');
          const paysNoms = row.pays_noms.split('|||');
          
          pays = paysIds.map((id, index) => ({
            id_pays: parseInt(id, 10),
            nom: paysNoms[index] || ''
          }));
        }

        // Supprimer les champs concaténés
        const { pays_ids, pays_noms, ...formation } = row;
        
        return {
          ...formation,
          objectifs: objectifs.map(o => o.libelle),
          competences: competences.map(c => c.libelle),
          pays
        };
      })
    );

    console.log('✅ Processed formations with pays:', formationsEnriched.length);
    if (formationsEnriched.length > 0) {
      console.log('📋 Exemple formation:', {
        intitule: formationsEnriched[0].intitule,
        pays: formationsEnriched[0].pays,
        objectifs_count: formationsEnriched[0].objectifs.length,
        competences_count: formationsEnriched[0].competences.length
      });
    }

    res.json(formationsEnriched);
    
  } catch (err) {
    console.error('❌ GET ALL ONBOARDING ERROR:', err);
    console.error('Error details:', err.message);
    
    res.status(500).json({ 
      error: 'Error fetching OnBoarding formations',
      details: err.message 
    });
  }
});

export default router;
