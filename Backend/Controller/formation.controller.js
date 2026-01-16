

import { db } from "../db.js";
import { Router } from 'express';
import ExcelJS from 'exceljs';
import fetch from 'node-fetch';

const translations = {
  fr: {
    intitule: 'Intitulé',
    axe: 'Axe',
    axe_code: 'Axe Code',
    population: 'Population',
    niveau: 'Niveau',
    prerequis: 'Prérequis',
    formateur: 'Formateur',
    interne_externe: 'Interne / Externe',
    parcours: 'Parcours',
    duree: 'Durée',
    etat: 'État',
    prestataire: 'Prestataire',
    objectifs: 'Objectifs',
    competences: 'Compétences',
  },
  en: {
    intitule: 'Title',
    axe: 'Area',
    axe_code: 'Area Code',
    population: 'Population',
    niveau: 'Level',
    prerequis: 'Prerequisites',
    formateur: 'Trainer',
    interne_externe: 'Internal / External',
    parcours: 'Path',
    duree: 'Duration',
    etat: 'Status',
    prestataire: 'Provider',
    objectifs: 'Objectives',
    competences: 'Skills',
  }
};

// ✅ VERSION OPTIMISÉE - LOGS MINIMAUX
export const downloadExcel = async (req, res) => {
  try {
    const lang = req.query.lang || 'fr';
    
    console.log(`📥 Génération Excel [${lang}] - Début`);

    // Augmenter le timeout de la requête
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000);

    // Récupérer les formations
    const [formations] = await db.query(`
      SELECT f.*, CONCAT(u.prenom, ' ', u.nom) AS formateur
      FROM formation f
      LEFT JOIN users u ON f.id_formateur = u.id_user
    `);

    console.log(`   ${formations.length} formations chargées`);

    // Si français, générer directement
    if (lang !== 'en') {
      console.log(`   Génération directe (pas de traduction)`);
      return await generateExcelFile(formations, lang, res, false);
    }

    console.log(`   Démarrage traduction EN...`);

    // ✅ OPTIMISATION: Collecter et traduire en une seule passe
    const textsToTranslate = [];
    const textMapping = [];

    for (let i = 0; i < formations.length; i++) {
      const f = formations[i];
      
      // Initialiser les arrays
      formations[i].objectifsArray = [];
      formations[i].competencesArray = [];
      formations[i].objectifsTranslated = [];
      formations[i].competencesTranslated = [];
      
      // Collecter les champs simples
      if (f.intitule?.trim()) {
        textsToTranslate.push(f.intitule);
        textMapping.push({ formationIndex: i, field: 'intitule' });
      }
      
      if (f.population?.trim()) {
        textsToTranslate.push(f.population);
        textMapping.push({ formationIndex: i, field: 'population' });
      }
      
      if (f.prerequis?.trim()) {
        textsToTranslate.push(f.prerequis);
        textMapping.push({ formationIndex: i, field: 'prerequis' });
      }
      
      if (f.prestataire?.trim()) {
        textsToTranslate.push(f.prestataire);
        textMapping.push({ formationIndex: i, field: 'prestataire' });
      }

      // Objectifs
      const [objectifRows] = await db.query(`
        SELECT o.libelle
        FROM formation_objectif fo
        JOIN objectif o ON fo.id_objectif = o.id_objectif
        WHERE fo.id_formation = ?
      `, [f.id_formation]);
      
      formations[i].objectifsArray = objectifRows.map(o => o.libelle);
      objectifRows.forEach((obj, idx) => {
        if (obj.libelle?.trim()) {
          textsToTranslate.push(obj.libelle);
          textMapping.push({ formationIndex: i, field: 'objectifs', index: idx });
        }
      });

      // Compétences
      const [competenceRows] = await db.query(`
        SELECT c.libelle
        FROM formation_competence fc
        JOIN competence c ON fc.id_competence = c.id_competence
        WHERE fc.id_formation = ?
      `, [f.id_formation]);
      
      formations[i].competencesArray = competenceRows.map(c => c.libelle);
      competenceRows.forEach((comp, idx) => {
        if (comp.libelle?.trim()) {
          textsToTranslate.push(comp.libelle);
          textMapping.push({ formationIndex: i, field: 'competences', index: idx });
        }
      });
    }

    console.log(`   📦 ${textsToTranslate.length} textes à traduire`);

    if (textsToTranslate.length === 0) {
      console.log(`   ⚠️  Aucun texte, génération sans traduction`);
      return await generateExcelFile(formations, lang, res, false);
    }

    // ✅ Traduire via Flask avec timeout
    console.log(`   🌐 Appel API Flask...`);
    const translatedTexts = await translateBatchViaFlask(textsToTranslate, 'en');
    
    if (!translatedTexts || translatedTexts.length === 0) {
      console.error(`   ❌ Échec traduction, génération sans traduction`);
      return await generateExcelFile(formations, lang, res, false);
    }

    if (translatedTexts.length !== textsToTranslate.length) {
      console.error(`   ❌ Incohérence: ${textsToTranslate.length} envoyés, ${translatedTexts.length} reçus`);
      return await generateExcelFile(formations, lang, res, false);
    }

    console.log(`   ✅ Traductions reçues`);

    // ✅ Appliquer les traductions
    for (let i = 0; i < translatedTexts.length; i++) {
      const translated = translatedTexts[i];
      const mapping = textMapping[i];
      const formation = formations[mapping.formationIndex];

      if (mapping.field === 'objectifs') {
        if (!Array.isArray(formation.objectifsTranslated)) {
          formation.objectifsTranslated = [];
        }
        formation.objectifsTranslated[mapping.index] = translated;
      } 
      else if (mapping.field === 'competences') {
        if (!Array.isArray(formation.competencesTranslated)) {
          formation.competencesTranslated = [];
        }
        formation.competencesTranslated[mapping.index] = translated;
      } 
      else {
        formation[`${mapping.field}Translated`] = translated;
      }
    }

    console.log(`   🔨 Traductions appliquées`);

    // Générer l'Excel AVEC traductions
    await generateExcelFile(formations, lang, res, true);

  } catch (err) {
    console.error('❌ ERREUR:', err.message);
    
    // Vérifier si les headers ont déjà été envoyés
    if (!res.headersSent) {
      res.status(500).json({ 
        message: "Erreur génération Excel", 
        error: err.message 
      });
    }
  }
};

// ✅ VERSION OPTIMISÉE - LOGS MINIMAUX
async function generateExcelFile(formations, lang, res, isTranslated) {
  console.log(`📄 Génération fichier Excel (${lang}, translated: ${isTranslated})`);

  const workbook = new ExcelJS.Workbook();
  const t = translations[lang];
  
  const sheetName = lang === 'en' ? 'Trainings' : 'Formations';
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = [
    { header: t.intitule, key: 'intitule', width: 30 },
    { header: t.axe, key: 'axe', width: 15 },
    { header: t.axe_code, key: 'axe_code', width: 12 },
    { header: t.population, key: 'population', width: 25 },
    { header: t.niveau, key: 'niveau', width: 12 },
    { header: t.prerequis, key: 'prerequis', width: 40 },
    { header: t.formateur, key: 'formateur', width: 20 },
    { header: t.interne_externe, key: 'interne_externe', width: 18 },
    { header: t.parcours, key: 'parcours', width: 15 },
    { header: t.duree, key: 'duree', width: 12 },
    { header: t.etat, key: 'etat', width: 12 },
    { header: t.prestataire, key: 'prestataire', width: 35 },
    { header: t.objectifs, key: 'objectifs', width: 50 },
    { header: t.competences, key: 'competences', width: 50 },
  ];

  // Style header
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  const wrapTextColumns = ['intitule', 'prerequis', 'objectifs', 'competences', 'prestataire'];

  // ✅ Ajouter les lignes
  for (const f of formations) {
    let intitule, population, prerequis, prestataire, objectifs, competences;

    if (isTranslated) {
      intitule = f.intituleTranslated || f.intitule || '';
      population = f.populationTranslated || f.population || '';
      prerequis = f.prerequisTranslated || f.prerequis || '';
      prestataire = f.prestataireTranslated || f.prestataire || '';
      
      objectifs = (f.objectifsTranslated?.length > 0)
        ? f.objectifsTranslated.filter(o => o).join('\n')
        : ((f.objectifsArray || []).filter(o => o).join('\n'));
      
      competences = (f.competencesTranslated?.length > 0)
        ? f.competencesTranslated.filter(c => c).join('\n')
        : ((f.competencesArray || []).filter(c => c).join('\n'));
    } else {
      intitule = f.intitule || '';
      population = f.population || '';
      prerequis = f.prerequis || '';
      prestataire = f.prestataire || '';
      objectifs = (f.objectifsArray || []).filter(o => o).join('\n');
      competences = (f.competencesArray || []).filter(c => c).join('\n');
    }

    const niveau = lang === 'en' ? translateFixedValue(f.niveau) : (f.niveau || '');
    const interneExterne = lang === 'en' ? translateFixedValue(f.interne_externe) : (f.interne_externe || '');
    const etat = lang === 'en' ? translateFixedValue(f.statut || f.etat || '') : (f.statut || f.etat || '');

    const row = sheet.addRow({
      intitule,
      axe: f.axe || '',
      axe_code: f.axe_code || '',
      population,
      niveau,
      prerequis,
      formateur: f.formateur || '',
      interne_externe: interneExterne,
      parcours: f.parcours || '',
      duree: f.duree || '',
      etat,
      prestataire,
      objectifs,
      competences
    });

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = sheet.getColumn(colNumber).key;
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (wrapTextColumns.includes(key)) {
        cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  }

  console.log(`   ✅ ${formations.length} lignes ajoutées`);

  const filename = lang === 'en' ? 'trainings.xlsx' : 'formations.xlsx';

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  await workbook.xlsx.write(res);
  res.end();

  console.log(`✅ Fichier "${filename}" envoyé\n`);
}

function translateFixedValue(value) {
  if (!value) return '';
  const fixedTranslations = {
    'débutant': 'Beginner',
    'intermédiaire': 'Intermediate',
    'avancé': 'Advanced',
    'senior': 'Senior',
    'expert': 'Expert',
    'interne': 'Internal',
    'externe': 'External',
    'en_attente': 'Pending',
    'validee': 'Validated',
    'refusee': 'Rejected'
  };
  return fixedTranslations[value.toLowerCase()] || value;
}

// ✅ FONCTION OPTIMISÉE AVEC TIMEOUT
async function translateBatchViaFlask(texts, targetLang) {
  try {
    console.log(`   📡 Appel Flask (${texts.length} textes)...`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

    const response = await fetch('http://localhost:5001/translate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: texts,
        source: 'fr',
        target: targetLang
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ❌ Erreur HTTP ${response.status}: ${errorText}`);
      return texts; // Fallback
    }

    const data = await response.json();
    console.log(`   ✅ ${data.translations?.length || 0} traductions reçues`);
    
    return data.translations || texts;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`   ❌ Timeout de traduction (>2min)`);
    } else {
      console.error(`   ❌ Erreur Flask: ${error.message}`);
    }
    return texts; // Fallback: retourner originaux
  }
}

// ✅ Aussi mettre à jour la fonction translateBatch (pour downloadExcelTranslated)
async function translateBatch(texts, targetLang) {
  try {
    // 🔥 CHANGEMENT CRITIQUE: Port 5001
    const response = await fetch('http://localhost:5001/translate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: texts,
        source: 'fr',
        target: targetLang
      })
    });

    const data = await response.json();
    return data.translations || texts;
  } catch (error) {
    console.error('❌ Erreur traduction batch:', error);
    return texts; // Fallback: retourner les textes originaux
  }
}

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
      WHERE f.etat = 'validee'  /* ✅ AJOUT: Filtrer uniquement les formations validées */
      ORDER BY f.id_formation DESC
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

    // 2️⃣ Insert formation with etat = 'validee'
    const [result] = await db.query(
      `INSERT INTO formation 
      (axe, axe_code, intitule, population, niveau, prerequis, id_formateur, interne_externe, parcours, duree, prestataire, etat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.axe, axe_code,f.intitule, f.population, f.niveau,
        f.prerequis, f.id_formateur, f.interne_externe, f.parcours, f.duree, f.prestataire, 'validee'
      ]
    );

    const idFormation = result.insertId;

    // 3️⃣ Insert objectifs (IDs only)
    if (Array.isArray(f.objectifs) && f.objectifs.length > 0) {
      for (let objId of f.objectifs) {
        const id = Number(objId);
        if (!isNaN(id)) {
          await db.query(
            `INSERT INTO formation_objectif (id_formation, id_objectif) VALUES (?, ?)`,
            [idFormation, id]
          );
        }
      }
    }

    // 4️⃣ Insert competences (IDs only)
    if (Array.isArray(f.competences) && f.competences.length > 0) {
      for (let compId of f.competences) {
        const id = Number(compId);
        if (!isNaN(id)) {
          await db.query(
            `INSERT INTO formation_competence (id_formation, id_competence) VALUES (?, ?)`,
            [idFormation, id]
          );
        }
      }
    }

    // 5️⃣ Insert pays (IDs only)
    if (Array.isArray(f.pays) && f.pays.length > 0) {
      for (let paysId of f.pays) {
        const id = Number(paysId);
        if (!isNaN(id)) {
          await db.query(
            `INSERT INTO formation_pays (id_formation, id_pays) VALUES (?, ?)`,
            [idFormation, id]
          );
        }
      }
    }

    // 6️⃣ Return success
    res.status(201).json({ id_formation: idFormation, axe_code, etat: 'validee' });

  } catch (err) {
    console.error('ADD FORMATION ERROR:', err);
    res.status(500).json({ error: "Erreur lors de l'ajout de la formation" });
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
      (axe, axe_code, intitule, population, niveau, prerequis, id_formateur, interne_externe, parcours, duree, prestataire, etat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.axe,
        axe_code,
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
       WHERE id_role = 1`
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

    /* ---------- Defaults ---------- */

    /* ---------- Interne / Externe logic ---------- */
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
        axe = ?, intitule = ?, population = ?, niveau = ?,
        prerequis = ?, id_formateur = ?, interne_externe = ?,
        parcours = ?, duree = ?, prestataire = ?
       WHERE id_formation = ?`,
      [
        f.axe,
        f.intitule,
        f.population || "",
        f.niveau,
        f.prerequis || "",
        f.id_formateur || null,
        f.interne_externe,
        f.parcours || "",
        f.duree || "",
        f.prestataire || null,
        id
      ]
    );

    /* ---------- Objectifs ---------- */
    await db.query(
      "DELETE FROM formation_objectif WHERE id_formation = ?",
      [id]
    );

    if (Array.isArray(f.objectifs)) {
      const objectifs = [...new Set(f.objectifs.map(Number))].filter(n => !isNaN(n));
      for (const objId of objectifs) {
        await db.query(
          "INSERT INTO formation_objectif (id_formation, id_objectif) VALUES (?, ?)",
          [id, objId]
        );
      }
    }

    /* ---------- Compétences ---------- */
    await db.query(
      "DELETE FROM formation_competence WHERE id_formation = ?",
      [id]
    );

    if (Array.isArray(f.competences)) {
      const competences = [...new Set(f.competences.map(Number))].filter(n => !isNaN(n));
      for (const compId of competences) {
        await db.query(
          "INSERT INTO formation_competence (id_formation, id_competence) VALUES (?, ?)",
          [id, compId]
        );
      }
    }

    /* ---------- Pays ---------- */
    await db.query(
      "DELETE FROM formation_pays WHERE id_formation = ?",
      [id]
    );

    if (Array.isArray(f.pays)) {
      const pays = [...new Set(f.pays.map(Number))].filter(n => !isNaN(n));
      for (const paysId of pays) {
        await db.query(
          "INSERT INTO formation_pays (id_formation, id_pays) VALUES (?, ?)",
          [id, paysId]
        );
      }
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
    /* ---------- Delete relations first ---------- */
    await db.query(
      `DELETE FROM formation_objectif WHERE id_formation = ?`,
      [id]
    );

    await db.query(
      `DELETE FROM formation_competence WHERE id_formation = ?`,
      [id]
    );

    await db.query(
      `DELETE FROM formation_pays WHERE id_formation = ?`,
      [id]
    );

    /* ---------- Delete formation ---------- */
    await db.query(
      `DELETE FROM formation WHERE id_formation = ?`,
      [id]
    );

    res.json({ message: "Formation deleted successfully" });

  } catch (error) {
    console.error("DELETE formation error:", error);
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
export const getPays = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id_pays, nom
      FROM pays
      ORDER BY nom ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
export const getOnboardingFormationsByPays = async (req, res) => {
  try {
    const { pays } = req.query;

    if (!pays) {
      return res.status(400).json({ error: "Pays requis" });
    }

    const paysIds = pays
      .split(',')
      .map(id => parseInt(id, 10))
      .filter(Boolean);

    if (paysIds.length === 0) {
      return res.status(400).json({ error: "Pays invalide" });
    }

    const placeholders = paysIds.map(() => '?').join(',');

    const [rows] = await db.query(
      `
      SELECT DISTINCT f.*
      FROM formation f
      JOIN formation_pays fp ON fp.id_formation = f.id_formation
      WHERE f.parcours = 'OnBoarding'
        AND f.etat = 'validee'
        AND fp.id_pays IN (${placeholders})
      `,
      paysIds
    );

    res.json(rows);

  } catch (err) {
    console.error("GET ONBOARDING BY PAYS ERROR:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des formations OnBoarding"
    });
  }
};