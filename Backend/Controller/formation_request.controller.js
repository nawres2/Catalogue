import { db } from "../db.js";

// ============================================
// GET - Liste des formations en attente
// ============================================
export const getFormationsEnAttente = async (req, res) => {
  console.log('📥 GET /api/formations/attente');
  
  try {
    const query = `
      SELECT 
        f.id_formation,
        f.intitule,
        f.axe,
        f.axe_code,
        f.niveau,
        f.population,
        f.prerequis,
        f.interne_externe,
        f.id_formateur,
        f.etat,
        u.nom as nom_formateur,
        u.prenom as prenom_formateur
      FROM formation f
      LEFT JOIN users u ON f.id_formateur = u.id_user
      WHERE f.etat = 'en_attente'
      ORDER BY f.id_formation DESC
    `;
    
    const [results] = await db.query(query);
    console.log(`✅ ${results.length} formations en attente trouvées`);
    res.json(results);
  } catch (err) {
    console.error('❌ Erreur SQL:', err);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: err.message 
    });
  }
};

// ============================================
// GET - Détails complets d'une formation
// ============================================
export const getFormationDetails = async (req, res) => {
  const idFormation = req.params.id;
  
  console.log(`📥 GET /api/formations/${idFormation}/details`);
  
  try {
    // 1. Récupérer les infos de la formation
    const formationQuery = `
      SELECT 
        f.id_formation,
        f.intitule,
        f.axe,
        f.axe_code,
        f.niveau,
        f.population,
        f.prerequis,
        f.interne_externe,
        f.id_formateur,
        f.etat,
        u.nom as nom_formateur,
        u.prenom as prenom_formateur
      FROM formation f
      LEFT JOIN users u ON f.id_formateur = u.id_user
      WHERE f.id_formation = ?
    `;
    
    const [formationResults] = await db.query(formationQuery, [idFormation]);
    
    if (formationResults.length === 0) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }
    
    const formation = formationResults[0];
    
    // 2. Récupérer les objectifs
    const objectifsQuery = `
      SELECT o.id_objectif, o.libelle
      FROM objectif o
      INNER JOIN formation_objectif fo ON o.id_objectif = fo.id_objectif
      WHERE fo.id_formation = ?
    `;
    
    const [objectifsResults] = await db.query(objectifsQuery, [idFormation]);
    
    // 3. Récupérer les compétences
    const competencesQuery = `
      SELECT c.id_competence, c.libelle
      FROM competence c
      INNER JOIN formation_competence fc ON c.id_competence = fc.id_competence
      WHERE fc.id_formation = ?
    `;
    
    const [competencesResults] = await db.query(competencesQuery, [idFormation]);
    
    // 4. Ajouter les objectifs et compétences à la formation
    formation.objectifs = objectifsResults;
    formation.competences = competencesResults;
    
    console.log('✅ Détails de la formation récupérés');
    res.json(formation);
  } catch (err) {
    console.error('❌ Erreur SQL:', err);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: err.message 
    });
  }
};

// ============================================
// PUT - Valider une formation
// ============================================
export const validerFormation = async (req, res) => {
  const idFormation = req.params.id;
  
  console.log(`📥 PUT /api/formations/${idFormation}/valider`);

  try {
    const query = `
      UPDATE formation 
      SET etat = 'validee'
      WHERE id_formation = ?
    `;

    const [result] = await db.query(query, [idFormation]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    console.log('✅ Formation validée');
    res.json({ 
      success: true,
      message: 'Formation validée avec succès' 
    });
  } catch (err) {
    console.error('❌ Erreur SQL:', err);
    res.status(500).json({ 
      error: 'Erreur serveur', 
      details: err.message 
    });
  }
};

// ============================================
// PUT - Refuser une formation
// ============================================
export const refuserFormation = async (req, res) => {
  const idFormation = req.params.id;
  
  console.log(`📥 PUT /api/formations/${idFormation}/refuser`);

  try {
    const query = `
      UPDATE formation 
      SET etat = 'refusee'
      WHERE id_formation = ?
    `;

    const [result] = await db.query(query, [idFormation]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    console.log('✅ Formation refusée');
    res.json({ 
      success: true,
      message: 'Formation refusée avec succès' 
    });
  } catch (err) {
    console.error('❌ Erreur SQL:', err);
    res.status(500).json({ 
      error: 'Erreur serveur', 
      details: err.message 
    });
  }
};

// ============================================
// GET - Liste des formateurs
// ============================================
export const getFormateurs = async (req, res) => {
  console.log('📥 GET /api/formateurs');
  
  try {
    const query = `
      SELECT id_user, nom, prenom, email
      FROM users
      WHERE role = 'formateur' OR est_formateur = 1
      ORDER BY nom, prenom
    `;

    const [results] = await db.query(query);
    console.log(`✅ ${results.length} formateurs trouvés`);
    res.json(results);
  } catch (err) {
    console.error('❌ Erreur SQL:', err);
    res.status(500).json({ 
      error: 'Erreur serveur', 
      details: err.message 
    });
  }
};