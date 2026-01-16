import { db } from "../db.js";
import axios from 'axios';

// ✅ Configuration
const TRANSLATION_API = 'http://localhost:5001/translate-batch';
const translationCache = new Map();

/**
 * 🚀 TRADUCTION BATCH OPTIMISÉE avec cache
 */
const translateTexts = async (texts, targetLang = 'en') => {
  if (!texts || texts.length === 0 || targetLang === 'fr') {
    return texts;
  }

  try {
    // Séparer cache et non-cache
    const results = new Array(texts.length);
    const toTranslate = [];
    const toTranslateIndices = [];
    
    texts.forEach((text, index) => {
      if (!text || text.trim() === '') {
        results[index] = text || '';
        return;
      }
      
      const cacheKey = `${text}_${targetLang}`;
      if (translationCache.has(cacheKey)) {
        results[index] = translationCache.get(cacheKey);
      } else {
        toTranslate.push(text);
        toTranslateIndices.push(index);
      }
    });
    
    console.log(`   💾 Cache hits: ${texts.length - toTranslate.length}/${texts.length}`);
    
    if (toTranslate.length === 0) {
      return results;
    }
    
    // Traduire via API batch
    const response = await axios.post(TRANSLATION_API, {
      texts: toTranslate,
      source: 'fr',
      target: targetLang
    });
    
    const translations = response.data.translations || toTranslate;
    
    // Remplir les résultats et mettre en cache
    toTranslateIndices.forEach((originalIndex, i) => {
      const translated = translations[i];
      results[originalIndex] = translated;
      
      const cacheKey = `${toTranslate[i]}_${targetLang}`;
      translationCache.set(cacheKey, translated);
    });
    
    return results;
    
  } catch (err) {
    console.error('❌ Translation error:', err.message);
    return texts; // Fallback
  }
};

/**
 * 📋 Liste toutes les sessions (pour gestion admin)
 */
export const getAllOnboardingSessions = async (req, res) => {
  console.log('📥 GET /api/onboarding/sessions - Liste administrative');
  
  try {
    const query = `
      SELECT 
        os.id_session,
        os.intitule,
        os.pays,
        os.planificateur,
        os.date_debut,
        os.date_fin,
        os.duree,
        os.population,
        os.prerequis,
        os.etat,
        os.created_at,
        COUNT(DISTINCT oj.id_jour) as nombre_jours,
        COUNT(DISTINCT oa.id_activite) as nombre_activites
      FROM onboarding_session os
      LEFT JOIN onboarding_jour oj ON oj.id_session = os.id_session
      LEFT JOIN onboarding_activite oa ON oa.id_jour = oj.id_jour
      GROUP BY os.id_session, os.intitule, os.pays, os.planificateur, 
               os.date_debut, os.date_fin, os.duree, os.population, 
               os.prerequis, os.etat, os.created_at
      ORDER BY os.created_at DESC
    `;
    
    const [sessions] = await db.query(query);
    console.log(`✅ ${sessions.length} session(s) récupérée(s)`);
    
    res.json(sessions);
    
  } catch (err) {
    console.error('❌ Erreur SQL:', err);
    res.status(500).json({
      error: 'Erreur serveur',
      details: err.message
    });
  }
};
// onboardingController.js - CORRECTION COMPLÈTE de getOnboardingSessionsP

export const getOnboardingSessionsP = async (req, res) => {
  try {
    const targetLang = req.query.lang || 'fr';
    
    console.log(`\n📥 GET /api/onboarding/sessionsPay?lang=${targetLang}`);
    
    const query = `
      SELECT
        os.id_session,
        os.intitule,
        os.pays,
        os.date_debut,
        os.date_fin,
        os.duree,
        os.population,
        os.prerequis,
        os.etat,
        os.planificateur,
        os.created_at,
        
        oo.id_objectif,
        oo.libelle AS objectif_libelle,
        oo.ordre AS objectif_ordre,
        
        oj.id_jour,
        oj.numero_jour,
        oj.titre AS jour_titre,
        oj.date_jour,
        
        oa.id_activite,
        oa.heure_debut,
        oa.heure_fin,
        oa.titre AS activite_titre,
        oa.description AS activite_description,
        oa.lieu,
        oa.animateur,
        oa.type_activite,
        oa.ordre AS activite_ordre
        
      FROM onboarding_session os
      LEFT JOIN onboarding_objectif oo ON oo.id_session = os.id_session
      LEFT JOIN onboarding_jour oj ON oj.id_session = os.id_session
      LEFT JOIN onboarding_activite oa ON oa.id_jour = oj.id_jour
      
      WHERE os.etat = 'validee'
      ORDER BY os.id_session, oj.numero_jour, oa.ordre, oo.ordre
    `;
 
    const [rows] = await db.query(query);
    console.log(`✅ ${rows.length} lignes récupérées`);
 
    if (rows.length === 0) {
      return res.json([{ name: 'OnBoarding', count: 0, pays: [] }]);
    }
 
    // 🏗️ Construire la structure
    const sessionsMap = new Map();
 
    rows.forEach(row => {
      const sessionId = row.id_session;
      
      if (!sessionsMap.has(sessionId)) {
        sessionsMap.set(sessionId, {
          id_formation: sessionId,
          intitule: row.intitule || '',
          pays: row.pays || '', // 🔥 GARDER LE STRING SIMPLE
          date_debut: row.date_debut ? new Date(row.date_debut).toISOString().split('T')[0] : null,
          date_fin: row.date_fin ? new Date(row.date_fin).toISOString().split('T')[0] : null,
          duree: row.duree || '',
          population: row.population || '',
          prerequis: row.prerequis || '',
          etat: row.etat || 'validee',
          planificateur: row.planificateur || '',
          interne_externe: 'interne',
          parcours: 'OnBoarding',
          axe: 'Onboarding',
          type: 'Onboarding',
          objectifs: [],
          jours: new Map()
        });
      }
 
      const session = sessionsMap.get(sessionId);
 
      // Objectifs
      if (row.objectif_libelle && row.id_objectif) {
        const objectifExists = session.objectifs.some(obj => obj.id_objectif === row.id_objectif);
        if (!objectifExists) {
          session.objectifs.push({
            id_objectif: row.id_objectif,
            libelle: row.objectif_libelle,
            ordre: row.objectif_ordre
          });
        }
      }
 
      // Jours et activités
      if (row.id_jour) {
        if (!session.jours.has(row.id_jour)) {
          session.jours.set(row.id_jour, {
            id_jour: row.id_jour,
            numero_jour: row.numero_jour,
            titre: row.jour_titre || '',
            date_jour: row.date_jour ? new Date(row.date_jour).toISOString().split('T')[0] : null,
            activites: []
          });
        }
 
        const jour = session.jours.get(row.id_jour);
        
        if (row.id_activite) {
          const activiteExists = jour.activites.some(act => act.id_activite === row.id_activite);
          if (!activiteExists) {
            jour.activites.push({
              id_activite: row.id_activite,
              heure_debut: row.heure_debut || '',
              heure_fin: row.heure_fin || '',
              titre: row.activite_titre || '',
              description: row.activite_description || '',
              lieu: row.lieu || '',
              animateur: row.animateur || '',
              type_activite: row.type_activite || 'formation',
              ordre: row.activite_ordre || 0
            });
          }
        }
      }
    });
 
    // Convertir Map en tableau
    let sessions = Array.from(sessionsMap.values()).map(session => ({
      ...session,
      jours: Array.from(session.jours.values()).sort((a, b) => a.numero_jour - b.numero_jour)
    }));
    
    console.log(`📊 ${sessions.length} session(s) structurée(s)`);
    
    // 🌐 TRADUCTION si nécessaire
    if (targetLang === 'en') {
      console.log(`🌐 Traduction vers l'anglais...`);
      
      for (let session of sessions) {
        // ✅ SAUVEGARDER LE PAYS ORIGINAL AVANT TOUTE TRADUCTION
        const paysOriginal = session.pays;
        
        console.log(`   📝 Session "${session.intitule}" - Pays original: "${paysOriginal}"`);
        
        // Collecter tous les textes SAUF le pays
        const textsToTranslate = [
          session.intitule,
          session.population || '',
          session.prerequis || '',
          session.planificateur || '',
          // ⚠️ NE PAS INCLURE session.pays
          ...session.objectifs.map(o => o.libelle),
          ...session.jours.flatMap(j => [
            j.titre,
            ...j.activites.flatMap(a => [
              a.titre,
              a.description || '',
              a.lieu || '',
              a.animateur || '',
              a.type_activite || ''
            ])
          ])
        ];
        
        const translations = await translateTexts(textsToTranslate, targetLang);
        
        // Réinjecter les traductions
        let index = 0;
        session.intitule = translations[index++];
        session.population = translations[index++];
        session.prerequis = translations[index++];
        session.planificateur = translations[index++];
        // ⚠️ NE PAS TOUCHER À session.pays
        
        session.objectifs.forEach(o => {
          o.libelle = translations[index++];
        });
        
        session.jours.forEach(j => {
          j.titre = translations[index++];
          j.activites.forEach(a => {
            a.titre = translations[index++];
            a.description = translations[index++];
            a.lieu = translations[index++];
            a.animateur = translations[index++];
            a.type_activite = translations[index++];
          });
        });
        
        // ✅ RESTAURER LE PAYS ORIGINAL (jamais traduit)
        session.pays = paysOriginal;
        
        console.log(`   ✅ Traduction terminée - Pays conservé: "${session.pays}"`);
      }
      
      console.log(`✅ Toutes les traductions terminées`);
    }
 
    // 📊 Grouper par pays
    const groupedByPays = {};
    
    sessions.forEach(session => {
      // 🔥 Le pays est un STRING simple à ce stade
      const paysName = session.pays || 'Inconnu';
      
      console.log(`📍 Groupement: "${session.intitule}" → Pays: "${paysName}" (type: ${typeof paysName})`);
      
      if (!groupedByPays[paysName]) {
        groupedByPays[paysName] = {
          paysName: paysName, // STRING SIMPLE
          paysId: 0,
          interneExterne: {
            interne: [],
            externe: []
          }
        };
      }
      
      const status = session.interne_externe || 'interne';
      
      // 🔥 AVANT d'ajouter, créer le tableau pays pour la formation
      session.pays = [{ id_pays: 0, nom: paysName }]; // ✅ MAINTENANT on crée le tableau
      
      groupedByPays[paysName].interneExterne[status].push(session);
    });
    
    const finalResult = [
      {
        name: 'OnBoarding',
        count: sessions.length,
        pays: Object.values(groupedByPays).map(paysGroup => {
          console.log(`🏗️ Groupe final:`, {
            paysName: paysGroup.paysName,
            type: typeof paysGroup.paysName,
            interne: paysGroup.interneExterne.interne.length,
            externe: paysGroup.interneExterne.externe.length
          });
          
          return {
            paysName: paysGroup.paysName, // STRING
            paysId: paysGroup.paysId,
            interneExterne: [
              ...(paysGroup.interneExterne.interne.length > 0 ? 
                [{ status: 'interne', formations: paysGroup.interneExterne.interne }] : []),
              ...(paysGroup.interneExterne.externe.length > 0 ? 
                [{ status: 'externe', formations: paysGroup.interneExterne.externe }] : [])
            ]
          };
        })
      }
    ];
 
    console.log(`\n✅ Réponse finale:`, {
      sessions: finalResult[0].count,
      pays: finalResult[0].pays.length,
      exemple_paysName: finalResult[0].pays[0]?.paysName,
      type_paysName: typeof finalResult[0].pays[0]?.paysName
    });
    
    res.json(finalResult);
 
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch onboarding sessions',
      details: error.message
    });
  }
};

/**
 * 📄 Détails d'une session (avec traduction automatique)
 */
export const getOnboardingDetails = async (req, res) => {
  const idSession = req.params.id;
  const targetLang = req.query.lang || 'fr';
  console.log(`📥 GET /api/onboarding/${idSession}/details?lang=${targetLang}`);

  try {
    // 1️⃣ Session
    const sessionQuery = `
      SELECT id_session, intitule, pays, date_debut, date_fin,
             duree, planificateur, population, prerequis, etat
      FROM onboarding_session
      WHERE id_session = ?
    `;
    const [sessionResults] = await db.query(sessionQuery, [idSession]);

    if (sessionResults.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const session = sessionResults[0];

    // 2️⃣ Objectifs
    const [objectifsResults] = await db.query(
      `SELECT id_objectif, libelle, ordre
       FROM onboarding_objectif
       WHERE id_session = ?
       ORDER BY ordre`,
      [idSession]
    );

    // 3️⃣ Jours
    const [joursResults] = await db.query(
      `SELECT id_jour, numero_jour, titre, date_jour
       FROM onboarding_jour
       WHERE id_session = ?
       ORDER BY numero_jour`,
      [idSession]
    );

    // 4️⃣ Activités
    for (let jour of joursResults) {
      const [activitesResults] = await db.query(
        `SELECT id_activite, heure_debut, heure_fin, titre, description,
                lieu, animateur, type_activite, ordre
         FROM onboarding_activite
         WHERE id_jour = ?
         ORDER BY ordre, heure_debut`,
        [jour.id_jour]
      );
      jour.activites = activitesResults;
    }

    session.objectifs = objectifsResults;
    session.jours = joursResults;

    // 🌐 TRADUCTION BATCH si nécessaire
   // 🌐 TRADUCTION si nécessaire
// 🌐 TRADUCTION si nécessaire
if (targetLang === 'en') {
  console.log(`🌐 Traduction vers l'anglais...`);
  
  for (let session of sessions) {
    // ✅ SAUVEGARDER LE PAYS AVANT TRADUCTION
    const paysOriginal = session.pays || '';
    
    // Collecter tous les textes SAUF le pays
    const textsToTranslate = [
      session.intitule,
      session.population || '',
      session.prerequis || '',
      // ⚠️ NE PAS INCLURE session.pays ici
      ...session.objectifs.map(o => o.libelle),
      ...session.jours.flatMap(j => [
        j.titre,
        ...j.activites.flatMap(a => [
          a.titre,
          a.description || '',
          a.lieu || '',
          a.animateur || '',
          a.type_activite || ''
        ])
      ])
    ];
    
    const translations = await translateTexts(textsToTranslate, targetLang);
    
    // Réinjecter les traductions
    let index = 0;
    session.intitule = translations[index++];
    session.population = translations[index++];
    session.prerequis = translations[index++];
    // ⚠️ NE PAS PRENDRE DE TRADUCTION POUR LE PAYS
    
    session.objectifs.forEach(o => {
      o.libelle = translations[index++];
    });
    
    session.jours.forEach(j => {
      j.titre = translations[index++];
      j.activites.forEach(a => {
        a.titre = translations[index++];
        a.description = translations[index++];
        a.lieu = translations[index++];
        a.animateur = translations[index++];
        a.type_activite = translations[index++];
      });
    });
    
    // ✅ RESTAURER LE PAYS ORIGINAL (sans traduction)
    session.pays = paysOriginal;
    
    // Mettre à jour onboarding_data
    session.onboarding_data.intitule = session.intitule;
    session.onboarding_data.population = session.population;
    session.onboarding_data.prerequis = session.prerequis;
    session.onboarding_data.pays = paysOriginal; // ✅ PAYS ORIGINAL
    
    // Mettre à jour le pays dans le tableau
    session.pays = [{ id_pays: 0, nom: paysOriginal }];
    
    console.log(`✅ Session "${session.intitule}" - Pays conservé: ${paysOriginal}`);
  }
  
  console.log(`✅ Traduction terminée`);
}
    res.json(session);
    
  } catch (err) {
    console.error('❌ Erreur:', err);
    res.status(500).json({
      error: 'Erreur serveur',
      details: err.message
    });
  }
};

/**
 * ➕ Créer une session
 */
export const createOnboardingSession = async (req, res) => {
  console.log('📥 POST /api/onboarding/sessions');
 
  const { intitule, pays, date_debut, date_fin, duree, planificateur, population, prerequis, objectifs, jours } = req.body;
 
  const connection = await db.getConnection();
 
  try {
    await connection.beginTransaction();
   
    const sessionQuery = `
      INSERT INTO onboarding_session
      (intitule, pays, date_debut, date_fin, duree, planificateur, population, prerequis, etat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'validee')
    `;
   
    const [sessionResult] = await connection.query(sessionQuery,
      [intitule, pays, date_debut, date_fin, duree, planificateur, population, prerequis]);
   
    const idSession = sessionResult.insertId;
   
    // Objectifs
    if (objectifs && objectifs.length > 0) {
      const objectifsQuery = `
        INSERT INTO onboarding_objectif (id_session, libelle, ordre)
        VALUES ?
      `;
      const objectifsValues = objectifs.map((obj, index) => {
        const libelle = typeof obj === 'string' ? obj : obj.libelle;
        return [idSession, libelle, index];
      });
      await connection.query(objectifsQuery, [objectifsValues]);
    }
   
    // Jours et activités
    if (jours && jours.length > 0) {
      for (let jour of jours) {
        const jourQuery = `
          INSERT INTO onboarding_jour (id_session, numero_jour, titre, date_jour)
          VALUES (?, ?, ?, ?)
        `;
        const [jourResult] = await connection.query(jourQuery,
          [idSession, jour.numero_jour, jour.titre, jour.date_jour]);
       
        const idJour = jourResult.insertId;
       
        if (jour.activites && jour.activites.length > 0) {
          const activitesQuery = `
            INSERT INTO onboarding_activite
            (id_jour, heure_debut, heure_fin, titre, description, lieu, animateur, type_activite, ordre)
            VALUES ?
          `;
          const activitesValues = jour.activites.map((act, index) => [
            idJour,
            act.heure_debut,
            act.heure_fin,
            act.titre,
            act.description || null,
            act.lieu || null,
            act.animateur || null,
            act.type_activite || 'formation',
            index
          ]);
          await connection.query(activitesQuery, [activitesValues]);
        }
      }
    }
   
    await connection.commit();
    console.log('✅ Session créée');
    
    res.status(201).json({
      success: true,
      id_session: idSession,
      message: 'Session créée avec succès'
    });
    
  } catch (err) {
    await connection.rollback();
    console.error('❌ Erreur:', err);
    res.status(500).json({
      error: 'Erreur serveur',
      details: err.message
    });
  } finally {
    connection.release();
  }
};

/**
 * ✏️ Mettre à jour une session
 */
export const updateOnboardingSession = async (req, res) => {
  const idSession = req.params.id;
  console.log(`📥 PUT /api/onboarding/${idSession}`);
 
  const { intitule, pays, date_debut, date_fin, duree, population, planificateur, prerequis, objectifs, jours } = req.body;
 
  const connection = await db.getConnection();
 
  try {
    await connection.beginTransaction();
   
    const sessionQuery = `
      UPDATE onboarding_session
      SET intitule = ?, pays = ?, date_debut = ?, date_fin = ?,
          duree = ?, population = ?, prerequis = ?, planificateur = ?
      WHERE id_session = ?
    `;
   
    await connection.query(sessionQuery,
      [intitule, pays, date_debut, date_fin, duree, population, prerequis, planificateur, idSession]);
   
    // Supprimer et recréer objectifs
    await connection.query('DELETE FROM onboarding_objectif WHERE id_session = ?', [idSession]);
   
    if (objectifs && objectifs.length > 0) {
      const objectifsQuery = `
        INSERT INTO onboarding_objectif (id_session, libelle, ordre)
        VALUES ?
      `;
      const objectifsValues = objectifs.map((obj, index) => {
        const libelle = typeof obj === 'string' ? obj : obj.libelle;
        return [idSession, libelle, index];
      });
      await connection.query(objectifsQuery, [objectifsValues]);
    }
   
    // Supprimer et recréer jours
    await connection.query('DELETE FROM onboarding_jour WHERE id_session = ?', [idSession]);
   
    if (jours && jours.length > 0) {
      for (let jour of jours) {
        const jourQuery = `
          INSERT INTO onboarding_jour (id_session, numero_jour, titre, date_jour)
          VALUES (?, ?, ?, ?)
        `;
        const [jourResult] = await connection.query(jourQuery,
          [idSession, jour.numero_jour, jour.titre, jour.date_jour]);
       
        const idJour = jourResult.insertId;
       
        if (jour.activites && jour.activites.length > 0) {
          const activitesQuery = `
            INSERT INTO onboarding_activite
            (id_jour, heure_debut, heure_fin, titre, description, lieu, animateur, type_activite, ordre)
            VALUES ?
          `;
          const activitesValues = jour.activites.map((act, index) => [
            idJour,
            act.heure_debut,
            act.heure_fin,
            act.titre,
            act.description || null,
            act.lieu || null,
            act.animateur || null,
            act.type_activite || 'formation',
            index
          ]);
          await connection.query(activitesQuery, [activitesValues]);
        }
      }
    }
   
    await connection.commit();
    console.log('✅ Session mise à jour');
    
    res.json({
      success: true,
      message: 'Session mise à jour avec succès'
    });
    
  } catch (err) {
    await connection.rollback();
    console.error('❌ Erreur:', err);
    res.status(500).json({
      error: 'Erreur serveur',
      details: err.message
    });
  } finally {
    connection.release();
  }
};

/**
 * 🗑️ Supprimer une session
 */
export const deleteOnboardingSession = async (req, res) => {
  const idSession = req.params.id;
  console.log(`📥 DELETE /api/onboarding/${idSession}`);
 
  try {
    const query = 'DELETE FROM onboarding_session WHERE id_session = ?';
    const [result] = await db.query(query, [idSession]);
   
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }
   
    console.log('✅ Session supprimée');
    res.json({
      success: true,
      message: 'Session supprimée avec succès'
    });
    
  } catch (err) {
    console.error('❌ Erreur:', err);
    res.status(500).json({
      error: 'Erreur serveur',
      details: err.message
    });
  }
};

/**
 * 🧹 Vider le cache de traduction (utile pour debug)
 */
export const clearTranslationCache = (req, res) => {
  const size = translationCache.size;
  translationCache.clear();
  console.log(`🗑️ Cache vidé (${size} entrées)`);
  res.json({ 
    message: 'Cache cleared', 
    entries_removed: size 
  });
};

/**
 * 📊 Stats du cache
 */
export const getCacheStats = (req, res) => {
  res.json({
    entries: translationCache.size,
    keys: Array.from(translationCache.keys()).slice(0, 10) // 10 premiers
  });
};