import { Component, Inject, NgZone, OnInit, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormationService } from '../service/formation-service';
import { HttpClientModule } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { TranslationService } from '../service/translation.service';
import { RouterModule } from '@angular/router';
import { Formation as BaseFormation } from '../model/formation.model';


type Formation = BaseFormation;

declare var $: any;
declare var google: any;

// ✅ INTERFACES - NE PAS SUPPRIMER
interface GroupedFormations {
  axe: string;
  types: {
    type: string;
    interneExterne: {
      status: 'interne' | 'externe';
      formations: Formation[];
    }[];
  }[];
}
interface Pays {
  id_pays: number;
  nom: string;
}


interface GroupedParcours {
  name: string;
  count: number;
  axes?: {
    axe: string;
    types: {
      type: string;
      interneExterne: {
        status: 'interne' | 'externe';
        formations: Formation[];
      }[];
    }[];
  }[];
  pays?: {
    paysName: string;
    paysId: number;
    interneExterne: {
      status: 'interne' | 'externe';
      formations: Formation[];
    }[];
  }[];
}

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, HttpClientModule,RouterModule],
  templateUrl: './catalogue.html',
  styleUrls: ['./catalogue.css']
})
export class Catalogue implements OnInit {
    showLanguageModal = true;  // Afficher le modal au démarrage
selectLanguage(lang: 'fr' | 'en') {
  this.currentLanguage = lang;
  this.showLanguageModal = false;
  this.showCover = true;

  if (lang === 'en') {
    this.translations = this.englishTranslations;
    this.translateAllFormations(); // traduit les formations
  } else {
    this.translations = {
      catalogueTitle: 'Catalogue des formations',
      welcomeSubtitle: 'Découvrez nos formations',
      feature1: 'Thématiques Inspirantes ',
      feature2: 'Formats Variés',
      feature3: 'Compétences clés au rendez-vous',
      startButton: 'Commencer',
      seconnecter:'Se connecter',
      page: 'Page',
      formations: 'Formations',
      parcours: 'Parcours',
      sommaire: 'Sommaire',
      translating: 'Traduction en cours...',
      provider: 'Prestataire',
      trainer: 'Formateur',
      level: 'Niveau',
      population: 'Public',
      objectives: 'Objectifs',
      skills: 'Compétences',
      prerequisites: 'Prérequis',
      welcomeBadge: 'Bienvenue',
      popupTitle: 'Découvrez notre catalogue',
      popupTitleHighlight: 'Interactif',
      popupMessage1: 'Notre catalogue est interactif et dynamique.',
      popupMessage2: 'Choisissez votre langue et explorez les formations.',
      popupFeature1Title: 'Rapide',
      popupFeature1Desc: 'Accédez rapidement aux informations.',
      popupFeature2Title: 'Interactif',
      popupFeature2Desc: 'Naviguez facilement entre les pages.',
      popupFeature3Title: 'Multilingue',
      popupFeature3Desc: 'Disponible en français et anglais.',
      popupCta: 'Commencez dès maintenant !',
      discoverButton: 'Découvrir'
    };
    this.translatedFormations = [...this.formations]; // revient au français
    this.updateGroupedData();
    if (this.currentFormation) {
      this.currentFormation = this.translatedFormations[this.currentPage];
    }
  }
}

  formations: Formation[] = [];
  translatedFormations: Formation[] = [];
  collapsedAxes: boolean[] = [];
  categories: string[] = [];
  groupedFormations: GroupedFormations[] = [];
  currentPage: number = 0;
  currentFormation: Formation | null = null;
  translationReady = false;
  
  // Propriétés de traduction
  currentLanguage: string = 'fr';
  translations: any = {
  catalogueTitle: 'Catalogue des formations',
  welcomeSubtitle: 'Découvrez nos formations',
  feature1: 'Thématiques Inspirantes ',
  feature2: 'Formats Variés',
  feature3: 'Compétences clés au rendez-vous',
  startButton: 'Commencer',
  seconnecter:'Se connecter',
  page: 'Page',
  formations: 'Formations',
  parcours: 'Parcours',
  sommaire: 'Sommaire',
  translating: 'Traduction en cours...',
  provider: 'Prestataire',
  trainer: 'Formateur',
  level: 'Niveau',
  population: 'Public',
  objectives: 'Objectifs',
  skills: 'Compétences',
  prerequisites: 'Prérequis',
  welcomeBadge: 'Bienvenue',
  popupTitle: 'Découvrez notre catalogue',
  popupTitleHighlight: 'Interactif',
  popupMessage1: 'Notre catalogue est interactif et dynamique.',
  popupMessage2: 'Choisissez votre langue et explorez les formations.',
  popupFeature1Title: 'Rapide',
  popupFeature1Desc: 'Accédez rapidement aux informations.',
  popupFeature2Title: 'Interactif',
  popupFeature2Desc: 'Naviguez facilement entre les pages.',
  popupFeature3Title: 'Multilingue',
  popupFeature3Desc: 'Disponible en français et anglais.',
  popupCta: 'Commencez dès maintenant !',
  discoverButton: 'Découvrir'
};
englishTranslations = {
  catalogueTitle: 'Training Catalogue',
  welcomeSubtitle: 'Discover our trainings',
  feature1: 'Inspiring Themes',
  feature2: 'Discover our training programs',
  feature3: 'Various Formats',
  startButton: 'Start',
  seconnecter:'Log in',
  page: 'Page',
  formations: 'Trainings',
  parcours: 'Paths',
  sommaire: 'Summary',
  translating: 'Translating...',
  provider: 'Provider',
  trainer: 'Trainer',
  level: 'Level',
  population: 'Audience',
  objectives: 'Objectives',
  skills: 'Skills',
  prerequisites: 'Prerequisites',
  welcomeBadge: 'Welcome',
  popupTitle: 'Discover our catalogue',
  popupTitleHighlight: 'Interactive',
  popupMessage1: 'Our catalogue is interactive and dynamic.',
  popupMessage2: 'Choose your language and explore the trainings.',
  popupFeature1Title: 'Fast',
  popupFeature1Desc: 'Access information quickly.',
  popupFeature2Title: 'Interactive',
  popupFeature2Desc: 'Navigate easily between pages.',
  popupFeature3Title: 'Multilingual',
  popupFeature3Desc: 'Available in French and English.',
  popupCta: 'Start now!',
  discoverButton: 'Discover'
};
// Dictionnaire pour les AXES
axeTranslations: { [key: string]: { fr: string, en: string } } = {
  'Technique': { fr: 'Technique', en: 'Technical' },
  'Fonctionnelle': { fr: 'Fonctionnelle', en: 'Functional' },
  'Métier': { fr: 'Métier', en: 'Business' },
  'Onboarding': { fr: 'Onboarding', en: 'Onboarding' },
  'Solutions': { fr: 'Solutions', en: 'Solutions' },
  'Linguistique': { fr: 'Linguistique', en: 'Linguistic' },
  'Transversale': { fr: 'Transversale', en: 'Cross-functional' }
};

parcoursTranslations: { [key: string]: { fr: string, en: string } } = {
  'Milles': { fr: 'Milles', en: 'Milles' },
  'Cassiope': { fr: 'Cassiope', en: 'Cassiope' },
  'E-flo': { fr: 'E-flo', en: 'E-flo' },
  'EKIP': { fr: 'EKIP', en: 'EKIP' },
  'OnBoarding': { fr: 'OnBoarding', en: 'OnBoarding' }
};





// Méthode pour traduire un nom d'axe
translateAxe(axe: string): string {
  // Si on est en français, retourner le nom original
  if (this.currentLanguage === 'fr') {
    return axe;
  }
  
  // Si on est en anglais, chercher la traduction
  // Si pas trouvé, retourner le nom original (fallback)
  return this.axeTranslations[axe]?.en || axe;
}

// Méthode pour traduire un nom de parcours
translateParcours(parcours: string): string {
  if (this.currentLanguage === 'fr') {
    return parcours;
  }
  
  return this.parcoursTranslations[parcours]?.en || parcours;
}
// Dictionnaire pour les PARCOURS




  isTranslating: boolean = false;
  
  // Page flip animation properties
  isAnimating = false;
  pageFlipDirection: 'forward' | 'backward' | null = null;
  groupedAxes: any[] = [];
  groupedParcours: GroupedParcours[] = [];

  // View toggle properties
  currentView: 'axe' | 'parcours' = 'axe';
  visibleFormations: Formation[] = [];

  collapsedParcoursAxes: { [key: string]: boolean[] } = {};
  collapsedParcours: boolean[] = [];


  showCover = true;
  showPopup: boolean = false;
  showCatalogue: boolean = false;

  constructor(
    private formationService: FormationService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private translationService: TranslationService,
      private cdr: ChangeDetectorRef

  ) {}

  ngOnInit(): void {
    this.loadFormations();
    
    // Écouter les changements de langue
    this.translationService.getLanguage().subscribe(lang => {
      if (lang === 'en') {
  this.translations = {
    catalogueTitle: 'Training Catalogue',
    welcomeSubtitle: 'Welcome',
    feature1: 'Inspiring Themes',
    feature2: 'Discover our training programs',
    feature3: 'Various Formats',
    startButton: 'Start',
    page: 'Page',
    formations: 'Trainings',
    parcours: 'Paths',
    sommaire: 'Summary',
    translating: 'Translating…',
    provider: 'Provider',
    trainer: 'Trainer',
    level: 'Level',
    population: 'Audience',
    objectives: 'Objectives',
    skills: 'Skills',
    prerequisites: 'Prerequisites'
  };
}

      console.log('🌐 Langue changée vers:', lang);
      this.currentLanguage = lang;
      
      // Ne pas traduire si les formations ne sont pas chargées
      if (this.formations.length === 0) {
        console.log('⚠️ Formations pas encore chargées');
        return;
      }
      
      if (lang === 'en') {
        console.log('🇬🇧 Démarrage traduction...');
        this.translateAllFormations();
      } else {
        console.log('🇫🇷 Retour au français');
        this.translatedFormations = [...this.formations];
        this.updateGroupedData();
        if (this.currentFormation) {
          this.currentFormation = this.translatedFormations[this.currentPage];
        }
      }
    });
  }

  ngAfterViewInit() {
    // Code existant si nécessaire
  }
  toggleParcours(index: number): void {
    this.collapsedParcours[index] = !this.collapsedParcours[index];
  }
 

  switchView(view: 'axe' | 'parcours') {
    this.currentView = view;
  }

  toggleAxe(index: number) {
    this.collapsedAxes[index] = !this.collapsedAxes[index];
  }
  
  toggleParcoursAxe(parcoursName: string, axeIndex: number) {
    if (!this.collapsedParcoursAxes[parcoursName]) {
      this.collapsedParcoursAxes[parcoursName] = [];
    }
    this.collapsedParcoursAxes[parcoursName][axeIndex] = !this.collapsedParcoursAxes[parcoursName][axeIndex];
  }

  loadFormations(): void {
    console.log('📥 Chargement des formations...');
    this.formationService.getFormations().subscribe({
      next: (data) => {
        console.log('✅ Formations standards chargées:', data.length);
        this.formations = data;
        this.translatedFormations = [...data];

        if (this.formations.length > 0) {
          this.currentFormation = this.translatedFormations[0];
        }

        this.updateGroupedData();

        // ✅ Charger aussi les formations OnBoarding
        this.loadOnboardingFormations();

        // Si la langue est anglais, traduire
        if (this.currentLanguage === 'en') {
          console.log('🇬🇧 Langue = EN, démarrage traduction...');
          this.translateAllFormations();
        }
      },
      error: err => console.error('❌ Erreur chargement formations:', err)
    });
  }
loadOnboardingFormations(): void {
  this.formationService.getAllOnboardingFormations().subscribe({
    next: (onboardingData) => {
      console.log('✅ OnBoarding formations chargées:', onboardingData.length);
      
      // Merge OnBoarding formations with existing formations
      // Remove duplicates based on id_formation
      const allFormations = [...this.formations, ...onboardingData];
      const uniqueFormations = this.uniqueById(allFormations);
      
      this.formations = uniqueFormations;
      this.translatedFormations = [...uniqueFormations];
      
      if (this.formations.length > 0 && !this.currentFormation) {
        this.currentFormation = this.translatedFormations[0];
      }
      
      this.updateGroupedData();
      
      // Translate if needed
      if (this.currentLanguage === 'en') {
        this.translateAllFormations();
      }
    },
    error: err => console.error('❌ Erreur chargement OnBoarding:', err)
  });
}
updateGroupedData(): void {
    this.groupedFormations = this.computeGroupedFormations();
    this.groupedParcours = this.computeParcoursFormations();

    this.collapsedAxes = this.groupedFormations.map(() => true);
    
    // Initialize collapsed state for each parcours
    this.collapsedParcours = this.groupedParcours.map(() => true); 
    
    this.collapsedParcoursAxes = {};
    
    this.groupedParcours.forEach(p => {
      if (p.pays) {
        // OnBoarding: initialize collapse state for pays
        this.collapsedParcoursAxes[p.name] = p.pays.map(() => true);
      } else if (p.axes) {
        // Other parcours: initialize collapse state for axes
        this.collapsedParcoursAxes[p.name] = p.axes.map(() => true);
      }
    });
  }
// Remplacez seulement les méthodes translateAllFormations et translateField dans votre catalogue.ts

async translateAllFormations() {
  console.log('🔄 MEGA-BATCH: Traduction de', this.formations.length, 'formations en 1 appel');
  this.isTranslating = true;
  
  try {
    // Collecter TOUS les textes de TOUTES les formations
    const allTexts: string[] = [];
    const formationFieldCounts: number[] = [];
    
    this.formations.forEach(formation => {
      const fields = [
        formation.intitule || '',
        formation.duree || '',
        formation.prerequis || '',
        formation.population || '',
        // ❌ NE PAS INCLURE : axe, parcours (ils servent de clés de regroupement)
        // formation.axe || '',
        // formation.parcours || '',
        formation.niveau || '',
        formation.type || '',
        formation.formateur || '',
        formation.prestataire || '',
        ...(formation.objectifs || []),
        ...(formation.competences || [])
      ];
      
      allTexts.push(...fields);
      formationFieldCounts.push(fields.length);
    });
    
    console.log(`📊 Total: ${allTexts.length} textes à traduire en 1 appel`);
    
    // ⚡ Traduire TOUT en 1 seul appel API
    const allTranslated = await this.translationService.translateBatchOptimized(allTexts, 'en');
    
    // Reconstituer les formations
    const translated: Formation[] = [];
    let currentIndex = 0;
    
    this.formations.forEach((formation, i) => {
      const fieldCount = formationFieldCounts[i];
      const formationTexts = allTranslated.slice(currentIndex, currentIndex + fieldCount);
      
      let idx = 0;
      const objCount = formation.objectifs?.length || 0;
      const compCount = formation.competences?.length || 0;
      
      translated.push({
        ...formation,
        intitule: formationTexts[idx++],
        duree: formationTexts[idx++],
        prerequis: formationTexts[idx++],
        population: formationTexts[idx++],
        // ✅ GARDER LES VALEURS ORIGINALES FRANÇAISES
        axe: formation.axe,           // Reste "Technique" même en anglais
        parcours: formation.parcours, // Reste "Milles" même en anglais
        pays: formation.pays,         // Garde les noms de pays originaux
        niveau: formationTexts[idx++],
        type: formationTexts[idx++],
        formateur: formationTexts[idx++],
        prestataire: formationTexts[idx++],
        objectifs: formationTexts.slice(idx, idx + objCount),
        competences: formationTexts.slice(idx + objCount, idx + objCount + compCount)
      });
      
      currentIndex += fieldCount;
    });
    
    console.log('✅ Traduction MEGA-BATCH terminée !');
    this.translatedFormations = translated;
    this.updateGroupedData();
    
    if (this.currentFormation) {
      this.currentFormation = this.translatedFormations[this.currentPage];
    }
    
    this.cdr.detectChanges();
    
  } catch (error) {
    console.error('❌ Erreur MEGA-BATCH:', error);
    this.translatedFormations = [...this.formations];
    this.updateGroupedData();
  } finally {
    this.isTranslating = false;
  }
}

private async translateField(text: string | undefined): Promise<string> {
  if (!text || text.trim() === '') {
    return '';
  }
  
  try {
    const result = await this.translationService.translateText(text, 'en').toPromise();
    return result || text;
  } catch (error) {
    console.error(`Erreur traduction:`, error);
    return text;
  }
}

  changeLanguage(lang: string) {
    console.log(`🔄 changeLanguage appelé: ${this.currentLanguage} → ${lang}`);
    
    if (lang === this.currentLanguage) {
      console.log('⚠️ Langue déjà sélectionnée');
      return;
    }
    
    // Le service va émettre le changement et l'observable dans ngOnInit va réagir
    this.translationService.setLanguage(lang);
  }

  startCatalogue() {
    this.showCover = false;
    this.showCatalogue = true;
    this.showPopup = true;
  }

  closePopup() {
    console.log('CLOSE POPUP CLICKED');
    this.showPopup = false;
  }

  launchCatalogue() {
    console.log("Catalogue started!"); 
  }
  private getUniqueFormations(formations: Formation[]): Formation[] {
  const map = new Map<number, Formation>();

  for (const f of formations) {
    if (!map.has(f.id_formation)) {
      map.set(f.id_formation, f);
    }
  }

  return Array.from(map.values());
}
private uniqueById(formations: Formation[]): Formation[] {
  const map = new Map<number, Formation>();
  formations.forEach(f => map.set(f.id_formation, f));
  return Array.from(map.values());
}
  computeGroupedFormations(): GroupedFormations[] {
    const grouped: GroupedFormations[] = [];
    const axes = [...new Set(this.translatedFormations.map(f => f.axe))];

    for (const axe of axes) {
      const axeFormations = this.translatedFormations.filter(f => f.axe === axe);
      const types = [...new Set(axeFormations.map(f => f.type))];

      const typeGroups = types.map(type => {
        const typeFormations = axeFormations.filter(f => f.type === type);
        return {
          type,
          interneExterne: ['externe', 'interne'].map(status => ({
            status: status as 'externe' | 'interne',
            formations: typeFormations.filter(f => f.interne_externe === status)
          })).filter(group => group.formations.length > 0)
        };
      });

      grouped.push({ axe, types: typeGroups });
    }

    return grouped;
  }

  computeParcoursFormations(): GroupedParcours[] {
  const parcoursNames = [...new Set(this.translatedFormations.map(f => f.parcours).filter(p => p))];
  
  return parcoursNames.map(parcoursName => {
    const parcoursFormations = this.translatedFormations.filter(f => f.parcours === parcoursName);
    
    // ✅ Check if this is OnBoarding parcours
    if (parcoursName === 'OnBoarding') {
      // Group by pays for OnBoarding
      const paysGroups = this.groupByPays(parcoursFormations);
      
      return {
        name: parcoursName,
        count: parcoursFormations.length,
        pays: paysGroups,
        axes: [] // Empty axes for OnBoarding
      };
    }
    
    // ✅ Normal parcours: group by axes
    const axes = [...new Set(parcoursFormations.map(f => f.axe))];
    
    const axeGroups = axes.map(axe => {
      const axeFormations = parcoursFormations.filter(f => f.axe === axe);
      const types = [...new Set(axeFormations.map(f => f.type))];
      
      const typeGroups = types.map(type => {
        const typeFormations = axeFormations.filter(f => f.type === type);
        return {
          type,
          interneExterne: ['externe', 'interne'].map(status => ({
            status: status as 'externe' | 'interne',
            formations: typeFormations.filter(f => f.interne_externe === status)
          })).filter(group => group.formations.length > 0)
        };
      });
      
      return { axe, types: typeGroups };
    });
    
    return {
      name: parcoursName,
      count: parcoursFormations.length,
      axes: axeGroups,
      pays: [] // Empty pays for normal parcours
    };
  });
}

private groupByPays(formations: Formation[]): any[] {
  const paysMap = new Map<number, Formation[]>();

  formations.forEach(f => {
    if (f.pays && f.pays.length > 0) {
      f.pays.forEach((p: Pays) => {  // <-- typage explicite ici
        if (!paysMap.has(p.id_pays)) paysMap.set(p.id_pays, []);
        paysMap.get(p.id_pays)!.push(f);
      });
    }
  });

  const result = Array.from(paysMap.entries()).map(([paysId, forms]) => ({
    paysName: forms[0].pays.find((p: Pays) => p.id_pays === paysId)?.nom || 'Unknown',
    paysId,
    interneExterne: ['externe','interne'].map(status => ({
      status: status as 'externe'|'interne',
      formations: forms.filter(f => f.interne_externe === status)
    })).filter(g => g.formations.length > 0)
  }));
  return result;
}



initializeCollapsedParcoursAxes(): void {
  this.collapsedParcoursAxes = {};

  for (const p of this.groupedParcours ?? []) {
    // Use optional chaining and nullish coalescing to handle undefined axes
    this.collapsedParcoursAxes[p.name] = p.axes?.map(() => false) ?? [];
  }

  console.log('✅ collapsedParcoursAxes initialized:', this.collapsedParcoursAxes);
}

getVisibleFormations(): Formation[] {
  if (this.currentView === 'axe') {
    return this.groupedFormations?.flatMap((g: GroupedFormations) =>
      g.types?.flatMap(t =>
        t.interneExterne?.flatMap(s => s.formations ?? []) ?? []
      ) ?? []
    ) ?? [];
  } else if (this.currentView === 'parcours') {
    const formations: Formation[] = [];

    for (const parcours of this.groupedParcours ?? []) {
      // Handle OnBoarding with pays grouping
      if (parcours.pays?.length) {
        for (const paysGroup of parcours.pays) {
          for (const statusGroup of paysGroup.interneExterne ?? []) {
            formations.push(...(statusGroup.formations ?? []));
          }
        }
      }
      // Handle normal parcours with axes grouping
      else if (parcours.axes?.length) {
        for (const axe of parcours.axes) {
          for (const type of axe.types ?? []) {
            for (const statusGroup of type.interneExterne ?? []) {
              formations.push(...(statusGroup.formations ?? []));
            }
          }
        }
      }
    }

    return formations;
  }

  return [];
}


  isCurrentPageFormation(formation: Formation): boolean {
    const visible = this.getVisibleFormations();
    return visible[this.currentPage] === formation;
  }

  goToPage(index: number): void {
    const visible = this.getVisibleFormations();
    if (!visible[index]) return;
    this.currentPage = index;
    this.currentFormation = visible[index];
  }

  nextPage(): void {
    if (this.canGoNext()) this.goToPage(this.currentPage + 1);
  }

  prevPage(): void {
    if (this.canGoPrevious()) this.goToPage(this.currentPage - 1);
  }

  getFormationsByCategory(category: string): Formation[] {
    let filtered = this.translatedFormations.filter(f => f.type === category);

    filtered.sort((a, b) => {
      if (a.interne_externe === b.interne_externe) {
        return a.axe.localeCompare(b.axe);
      }
      return a.interne_externe.localeCompare(b.interne_externe);
    });

    return filtered;
  }

  getFormationIndex(formation: Formation): number {
    return this.translatedFormations.indexOf(formation);
  }

  isCurrentPage(index: number): boolean {
    return this.currentPage === index;
  }

  canGoPrevious(): boolean {
    return this.currentPage > 0;
  }

  canGoNext(): boolean {
    return this.currentPage < this.getVisibleFormations().length - 1;
  }

  getNiveauColor(niveau: string): string {
    switch(niveau?.toLowerCase()) {
      case 'débutant':
      case 'beginner':
        return 'niveau-debutant';
      case 'intermédiaire':
      case 'intermediate':
        return 'niveau-intermediaire';
      case 'avancé':
      case 'advanced':
        return 'niveau-avance';
      default:
        return 'niveau-default';
    }
  }
}