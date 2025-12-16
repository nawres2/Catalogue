import { db } from "../db.js";

export const getFormationById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Formation principale
   const [formationRows] = await db.query(
  `SELECT 
      f.*, 
      CONCAT(u.prenom, ' ', u.nom) AS formateur
   FROM formation f
   LEFT JOIN users u ON f.id_formateur = u.id_user
   WHERE f.id_formation = ?`,
  [id]
);


    if (formationRows.length === 0) {
      return res.status(404).json({ message: "Formation not found" });
    }

    const formation = formationRows[0];

    // 2) Objectifs
    const [objectifRows] = await db.query(
      `SELECT o.libelle 
       FROM formation_objectif fo
       JOIN objectif o ON fo.id_objectif = o.id_objectif
       WHERE fo.id_formation = ?`,
      [id]
    );

    // 3) Compétences
    const [competenceRows] = await db.query(
      `SELECT c.libelle 
       FROM formation_competence fc
       JOIN competence c ON fc.id_competence = c.id_competence
       WHERE fc.id_formation = ?`,
      [id]
    );

    // 4) Pack final
    const response = {
      ...formation,
      objectifs: objectifRows.map(o => o.libelle),
      competences: competenceRows.map(c => c.libelle)
    };

    res.json(response);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};
export const getFormations = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        f.*, 
        CONCAT(u.prenom, ' ', u.nom) AS formateur
      FROM formation f
      LEFT JOIN users u ON f.id_formateur = u.id_user
    `);

    const formations = await Promise.all(rows.map(async (f) => {
      // Get objectifs
      const [objectifs] = await db.query(`
        SELECT o.libelle 
        FROM formation_objectif fo
        JOIN objectif o ON fo.id_objectif = o.id_objectif
        WHERE fo.id_formation = ?
      `, [f.id_formation]);

      // Get competences
      const [competences] = await db.query(`
        SELECT c.libelle 
        FROM formation_competence fc
        JOIN competence c ON fc.id_competence = c.id_competence
        WHERE fc.id_formation = ?
      `, [f.id_formation]);

      return {
        ...f,
        objectifs: objectifs.map(o => o.libelle),
        competences: competences.map(c => c.libelle)
      };
    }));

    res.json(formations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
export const addFormation = async (req, res) => {
  const {
    axe,
    type,
    intitule,
    population,
    niveau,
    prerequis,
    id_formateur,
    interne_externe,
    prestataire,
    parcours,
    duree,
    objectifs = [],
    competences = []
  } = req.body;

  try {
    // 1️⃣ Insert formation
    const [result] = await db.query(
      `INSERT INTO formation
      (axe, type, intitule, population, niveau, prerequis,
       id_formateur, interne_externe, prestataire, parcours, duree)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        axe,
        type,
        intitule,
        population,
        niveau,
        prerequis,
        id_formateur,
        interne_externe,
        prestataire,
        parcours,
        duree
      ]
    );

    const id_formation = result.insertId;

    // 2️⃣ Insert objectifs (SAFE)
    if (Array.isArray(objectifs)) {
      for (const id_objectif of objectifs) {
        if (
          !id_objectif ||
          isNaN(id_objectif)
        ) continue;

        await db.query(
          `INSERT INTO formation_objectif (id_formation, id_objectif)
           VALUES (?, ?)`,
          [id_formation, Number(id_objectif)]
        );
      }
    }

    // 3️⃣ Insert competences (SAFE)
    if (Array.isArray(competences)) {
      for (const id_competence of competences) {
        if (
          !id_competence ||
          isNaN(id_competence)
        ) continue;

        await db.query(
          `INSERT INTO formation_competence (id_formation, id_competence)
           VALUES (?, ?)`,
          [id_formation, Number(id_competence)]
        );
      }
    }

    res.status(201).json({
      message: 'Formation created',
      id_formation
    });

  } catch (error) {
    console.error('ADD FORMATION ERROR:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFormateurs = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         id_user,
         nom,
         prenom,
         email
       FROM users
       WHERE id_role = 2`
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};
export const updateFormation = async (req, res) => {
  try {
    const id = req.params.id;
    const f = req.body;

    /* ---------- Validation ---------- */
    // Validation supprimée - tous les champs sont maintenant optionnels

    // Valeur par défaut pour "type" si non fourni
    if (!f.type) {
      f.type = 'Formation';
    }

    /* ---------- Validation interne / externe ---------- */
    if (f.interne_externe === "interne") {
      if (!f.id_formateur) {
        return res.status(400).json({ error: "Formateur interne obligatoire" });
      }

      const [rows] = await db.query(
        "SELECT id_user FROM users WHERE id_user = ? AND id_role = 1",
        [f.id_formateur]
      );

      if (rows.length === 0) {
        return res.status(400).json({ error: "Formateur interne invalide" });
      }

      f.prestataire = null;
    }

    if (f.interne_externe === "externe") {
      f.id_formateur = null;
    }

    /* ---------- UPDATE formation ---------- */
    await db.query(
      `UPDATE formation SET
        axe = ?, type = ?, intitule = ?, population = ?, niveau = ?,
        prerequis = ?, id_formateur = ?, interne_externe = ?,
        parcours = ?, duree = ?, prestataire = ?
       WHERE id_formation = ?`,
      [
        f.axe,
        f.type,
        f.intitule,
        f.population || "",
        f.niveau,
        f.prerequis || "",
        f.id_formateur || null,
        f.interne_externe,
        f.parcours || "",
        f.duree || "",
        f.prestataire || "",
        id
      ]
    );

    /* ---------- Objectifs ---------- */
    await db.query("DELETE FROM formation_objectif WHERE id_formation = ?", [id]);
    const objectifs = [...new Set(f.objectifs || [])];
    for (const objId of objectifs) {
      await db.query(
        "INSERT INTO formation_objectif (id_formation, id_objectif) VALUES (?, ?)",
        [id, objId]
      );
    }

    /* ---------- Compétences ---------- */
    await db.query("DELETE FROM formation_competence WHERE id_formation = ?", [id]);
    const competences = [...new Set(f.competences || [])];
    for (const compId of competences) {
      await db.query(
        "INSERT INTO formation_competence (id_formation, id_competence) VALUES (?, ?)",
        [id, compId]
      );
    }

    res.json({ message: "Formation mise à jour avec succès" });

  } catch (err) {
    console.error("UPDATE formation error:", err);
    res.status(500).json({
      error: "Erreur lors de la mise à jour de la formation",
      details: err.message
    });
  }
};


export const deleteFormation = async (req, res) => {
  const { id } = req.params;

  try {
  
    await db.query(
      `DELETE FROM formation_objectif WHERE id_formation = ?`,
      [id]
    );
    await db.query(
      `DELETE FROM formation_competence WHERE id_formation = ?`,
      [id]
    );

    await db.query(
      `DELETE FROM formation WHERE id_formation = ?`,
      [id]
    );

    res.json({ message: "Formation deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
export const getObjectifs = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id_objectif, libelle FROM objectif'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addObjectif = async (req, res) => {
  const { libelle } = req.body;

  if (!libelle || !libelle.trim()) {
    return res.status(400).json({ message: 'Libelle required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO objectif (libelle) VALUES (?)',
      [libelle.trim()]
    );

    res.status(201).json({
      id_objectif: result.insertId,
      libelle: libelle.trim()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
export const getCompetences = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id_competence, libelle FROM competence'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addCompetence = async (req, res) => {
  const { libelle } = req.body;

  if (!libelle || !libelle.trim()) {
    return res.status(400).json({ message: 'Libelle required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO competence (libelle) VALUES (?)',
      [libelle.trim()]
    );

    res.status(201).json({
      id_competence: result.insertId,
      libelle: libelle.trim()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};