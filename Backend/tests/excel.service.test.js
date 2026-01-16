import { collectTexts } from '../services/excel.service';
import { applyTranslations } from '../services/excel.service';

describe('applyTranslations', () => {

  it('should apply translations correctly', () => {
    const formations = [
      { objectifsTranslated: [], competencesTranslated: [] }
    ];

    const mapping = [
      { formationIndex: 0, field: 'intitule' },
      { formationIndex: 0, field: 'objectifs', index: 0 }
    ];

    const translations = ['Node Training', 'Learn Node'];

    applyTranslations(formations, translations, mapping);

    expect(formations[0].intituleTranslated).toBe('Node Training');
    expect(formations[0].objectifsTranslated[0]).toBe('Learn Node');
  });

});

describe('collectTexts', () => {

  it('should collect valid texts', () => {
    const formations = [
      {
        intitule: 'Node',
        population: 'Dev',
        prerequis: '',
        prestataire: null
      }
    ];

    const result = collectTexts(formations);

    expect(result.textsToTranslate.length).toBe(2);
    expect(result.textMapping.length).toBe(2);
  });

});
