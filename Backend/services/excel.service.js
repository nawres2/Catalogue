export function collectTexts(formations) {
  const textsToTranslate = [];
  const textMapping = [];

  formations.forEach((f, i) => {

    // ✅ INITIALISATION CORRECTE
    f.objectifsArray = Array.isArray(f.objectifs) ? f.objectifs : [];
    f.competencesArray = Array.isArray(f.competences) ? f.competences : [];
    f.objectifsTranslated = [];
    f.competencesTranslated = [];

    const pushText = (text, field, index = null) => {
      if (text && text.trim() !== '') {
        textsToTranslate.push(text);
        textMapping.push({ formationIndex: i, field, index });
      }
    };

    // Champs simples
    pushText(f.intitule, 'intitule');
    pushText(f.population, 'population');
    pushText(f.prerequis, 'prerequis');
    pushText(f.prestataire, 'prestataire');

    // ✅ Objectifs
    f.objectifsArray.forEach((obj, idx) => {
      pushText(obj, 'objectifs', idx);
    });

    // ✅ Compétences
    f.competencesArray.forEach((comp, idx) => {
      pushText(comp, 'competences', idx);
    });
  });

  return { textsToTranslate, textMapping };
}



export function applyTranslations(formations, translations, mapping) {
  mapping.forEach((map, i) => {
    const formation = formations[map.formationIndex];
    const translated = translations[i];

    if (map.field === 'objectifs') {
      formation.objectifsTranslated[map.index] = translated;
    } 
    else if (map.field === 'competences') {
      formation.competencesTranslated[map.index] = translated;
    } 
    else {
      formation[`${map.field}Translated`] = translated;
    }
  });
}
