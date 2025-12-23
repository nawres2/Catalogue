import { db } from "../db.js";
import { Router } from 'express';
import ExcelJS from "exceljs";

export const downloadExcel = async (req, res) => {
  try {
    const [formations] = await db.query(`
      SELECT f.*, CONCAT(u.prenom, ' ', u.nom) AS formateur
      FROM formation f
      LEFT JOIN users u ON f.id_formateur = u.id_user
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Formations");

    sheet.columns = [
      { header: 'Intitulé', key: 'intitule', width: 25 },
      { header: 'Axe', key: 'axe', width: 15 },
      { header: 'Axe Code', key: 'axe_code', width: 12 },
      { header: 'Population', key: 'population', width: 15 },
      { header: 'Niveau', key: 'niveau', width: 12 },
      { header: 'Prérequis', key: 'prerequis', width: 25 },
      { header: 'Formateur', key: 'formateur', width: 20 },
      { header: 'Interne / Externe', key: 'interne_externe', width: 15 },
      { header: 'Parcours', key: 'parcours', width: 15 },
      { header: 'Durée', key: 'duree', width: 10 },
      { header: 'État', key: 'etat', width: 12 },
      { header: 'Prestataire', key: 'prestataire', width: 20 },
      { header: 'Objectifs', key: 'objectifs', width: 50 },
      { header: 'Compétences', key: 'competences', width: 50 },
    ];

    // Style pour l'en-tête
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Colonnes qui nécessitent un retour à la ligne automatique
    const wrapTextColumns = ['intitule', 'prerequis', 'objectifs', 'competences', 'prestataire'];

    for (const f of formations) {
      const [objectifRows] = await db.query(`
        SELECT o.libelle
        FROM formation_objectif fo
        JOIN objectif o ON fo.id_objectif = o.id_objectif
        WHERE fo.id_formation = ?
      `, [f.id_formation]);
      const objectifs = objectifRows.map(o => o.libelle).join('\n');

      const [competenceRows] = await db.query(`
        SELECT c.libelle
        FROM formation_competence fc
        JOIN competence c ON fc.id_competence = c.id_competence
        WHERE fc.id_formation = ?
      `, [f.id_formation]);
      const competences = competenceRows.map(c => c.libelle).join('\n');

      const row = sheet.addRow({
        intitule: f.intitule,
        axe: f.axe,
        axe_code: f.axe_code || '',
        population: f.population,
        niveau: f.niveau,
        prerequis: f.prerequis,
        formateur: f.formateur,
        interne_externe: f.interne_externe,
        parcours: f.parcours,
        duree: f.duree,
        etat: f.statut || f.etat || '',
        prestataire: f.prestataire || '',
        objectifs,
        competences
      });

      // Appliquer le style pour chaque cellule
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const key = sheet.getColumn(colNumber).key;

        if (wrapTextColumns.includes(key)) {
          // Colonnes longues : retour à la ligne, alignement en haut et à gauche
          cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
        } else {
          // Autres colonnes : centré
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=formations.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur génération Excel" });
  }
};

export const getFormationById = async (req, res) => {
  try {
    const { id } = req.params;

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

    const [objectifRows] = await db.query(
      `SELECT o.libelle 
       FROM formation_objectif fo
       JOIN objectif o ON fo.id_objectif = o.id_objectif
       WHERE fo.id_formation = ?`,
      [id]
    );

    const [competenceRows] = await db.query(
      `SELECT c.libelle 
       FROM formation_competence fc
       JOIN competence c ON fc.id_competence = c.id_competence
       WHERE fc.id_formation = ?`,
      [id]
    );

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
export const addFormationFor = async (req, res) => {
  try {
    const f = req.body;

    // 1️⃣ Generate axe_code
    const prefix = f.axe.substring(0, 4).toUpperCase();
    const pattern = `${prefix}#`;
    const [existing] = await db.query(
      `SELECT axe_code FROM formation WHERE axe_code LIKE ? ORDER BY id_formation DESC LIMIT 1`,
      [`${pattern}%`]
    );

    let nextNumber = 1;
    if (existing.length > 0) {
      const lastNumber = parseInt(existing[0].axe_code.split('#')[1], 10);
      nextNumber = lastNumber + 1;
    }

    const axe_code = `${pattern}${nextNumber}`;

    // 2️⃣ Insert formation with 'en_attente' etat
    const [result] = await db.query(
      `INSERT INTO formation 
      (axe, axe_code, type, intitule, population, niveau, prerequis, id_formateur, interne_externe, parcours, duree, prestataire, etat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.axe,
        axe_code,
        f.type || 'Formation',
        f.intitule,
        f.population,
        f.niveau,
        f.prerequis,
        f.id_formateur || null,
        f.interne_externe || 'interne',
        f.parcours,
        f.duree,
        f.prestataire || null,
        'en_attente'
      ]
    );

    const idFormation = result.insertId;

    // 3️⃣ Handle objectifs (create if not exist)
    if (Array.isArray(f.objectifs)) {
      for (const libelle of f.objectifs) {
        if (!libelle || !libelle.trim()) continue;

        const [existingObj] = await db.query(
          `SELECT id_objectif FROM objectif WHERE libelle = ?`,
          [libelle.trim()]
        );

        let id_objectif;
        if (existingObj.length > 0) {
          id_objectif = existingObj[0].id_objectif;
        } else {
          const [newObj] = await db.query(
            `INSERT INTO objectif (libelle) VALUES (?)`,
            [libelle.trim()]
          );
          id_objectif = newObj.insertId;
        }

        await db.query(
          `INSERT INTO formation_objectif (id_formation, id_objectif) VALUES (?, ?)`,
          [idFormation, id_objectif]
        );
      }
    }

    // 4️⃣ Handle competences (create if not exist)
    if (Array.isArray(f.competences)) {
      for (const libelle of f.competences) {
        if (!libelle || !libelle.trim()) continue;

        const [existingComp] = await db.query(
          `SELECT id_competence FROM competence WHERE libelle = ?`,
          [libelle.trim()]
        );

        let id_competence;
        if (existingComp.length > 0) {
          id_competence = existingComp[0].id_competence;
        } else {
          const [newComp] = await db.query(
            `INSERT INTO competence (libelle) VALUES (?)`,
            [libelle.trim()]
          );
          id_competence = newComp.insertId;
        }

        await db.query(
          `INSERT INTO formation_competence (id_formation, id_competence) VALUES (?, ?)`,
          [idFormation, id_competence]
        );
      }
    }

    res.status(201).json({ 
      id_formation: idFormation, 
      axe_code, 
      etat: 'en_attente' 
    });

  } catch (err) {
    console.error('ADD FORMATION ERROR:', err);
    res.status(500).json({ error: "Erreur lors de l'ajout de la formation" });
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

export const getFormationsByFormateur = async (req, res) => {
  try {
    const idFormateur = req.user?.id; // logged-in formateur
    const { etat } = req.query;       // "en_attente" | "validee" | "refusee"

    // Validate formateur ID
    if (!idFormateur) {
      return res.status(401).json({ message: 'Formateur non authentifié' });
    }

    // Validate 'etat'
    const allowedEtats = ['en_attente', 'validee', 'refusee'];
    if (!etat || !allowedEtats.includes(etat)) {
      return res.status(400).json({ message: 'Etat invalide ou manquant' });
    }

    // Debug: log incoming request
    console.log('Fetching formations for formateur:', idFormateur, 'etat:', etat);

    // Fetch formations
    const [rows] = await db.query(
      `
      SELECT 
        f.*,
        CONCAT(u.prenom, ' ', u.nom) AS formateur
      FROM formation f
      LEFT JOIN users u ON u.id_user = f.id_formateur
      WHERE f.id_formateur = ?
        AND f.etat = ?
      ORDER BY f.id_formation DESC
      `,
      [idFormateur, etat]
    );

    // Debug: log number of rows found
    console.log('Formations found:', rows.length);

    // Fetch objectifs and competences for each formation
    const formations = await Promise.all(
      rows.map(async (f) => {
        const [objectifs] = await db.query(
          `SELECT o.libelle
           FROM formation_objectif fo
           JOIN objectif o ON o.id_objectif = fo.id_objectif
           WHERE fo.id_formation = ?`,
          [f.id_formation]
        );

        const [competences] = await db.query(
          `SELECT c.libelle
           FROM formation_competence fc
           JOIN competence c ON c.id_competence = fc.id_competence
           WHERE fc.id_formation = ?`,
          [f.id_formation]
        );

        return {
          ...f,
          objectifs: objectifs.map(o => o.libelle),
          competences: competences.map(c => c.libelle)
        };
      })
    );

    return res.json(formations);

  } catch (err) {
    console.error('Erreur serveur:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};
