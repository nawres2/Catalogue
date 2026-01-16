import { Component, Inject, NgZone, OnInit, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormationService } from '../service/formation-service';
import { HttpClientModule } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { TranslationService } from '../service/translation.service';
import { RouterModule } from '@angular/router';
import { Formation as BaseFormation } from '../model/formation.model';
import { OnboardingTranslationService } from '../service/onboarding-translation.service';

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
  imports: [CommonModule, HttpClientModule, RouterModule],
  templateUrl: './catalogue.html',
  styleUrls: ['./catalogue.css']
})
export class Catalogue implements OnInit {
  showLanguageModal = true;
  
  formations: Formation[] = [];
  translatedFormations: Formation[] = [];
  collapsedAxes: boolean[] = [];
  categories: string[] = [];
  groupedFormations: GroupedFormations[] = [];
  currentPage: number = 0;
  currentFormation: Formation | null = null;
  translationReady = false;
  
  currentLanguage: string = 'fr';
  translations: any = {
  catalogueTitle: 'Catalogue des formations',
  welcomeSubtitle: 'Découvrez nos formations',
  feature1: 'Thématiques Inspirantes ',
  feature2: 'Formats Variés',
  feature3: 'Compétences clés au rendez-vous',
  startButton: 'Commencer',
  seconnecter: 'Se connecter',
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
  discoverButton: 'Découvrir',
  // ✅ AJOUTS MANQUANTS
  programmeDetaille: 'Programme détaillé',
  duree: 'Durée',
  planificateur: 'Planificateur',
  jours: 'jours',
  noActivities: 'Aucune activité prévue pour ce jour',
  onboardingSession: 'SESSION ONBOARDING'
};

englishTranslations = {
  catalogueTitle: 'Training Catalogue',
  welcomeSubtitle: 'Discover our trainings',
  feature1: 'Inspiring Themes',
  feature2: 'Discover our training programs',
  feature3: 'Various Formats',
  startButton: 'Start',
  seconnecter: 'Log in',
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
  discoverButton: 'Discover',
  // ✅ AJOUTS MANQUANTS
   programmeDetaille: 'Detailed Program',
  duree: 'Duration',
  planificateur: 'Owner',
  jours: 'days',
  noActivities: 'No activities scheduled for this day',
  onboardingSession: 'ONBOARDING SESSION'
};


  // Dictionnaire pour les AXES
axeTranslations: { [key: string]: { fr: string, en: string } } = {
  'Technique': { fr: 'Technique', en: 'Technical' },
  'Fonctionnel': { fr: 'Fonctionnel', en: 'Functional' },
  'Fonctionel': { fr: 'Fonctionnel', en: 'Functional' }, // ✅ AJOUT ICI
  'Métier': { fr: 'Métier', en: 'Business' },
  'Onboarding': { fr: 'Onboarding', en: 'Onboarding' },
  'Solutions': { fr: 'Solutions', en: 'Solutions' },
  'Linguistique': { fr: 'Linguistique', en: 'Linguistic' },
  'Transversale': { fr: 'Transversale', en: 'Transversal' }
};

  // Dictionnaire pour les PARCOURS
  parcoursTranslations: { [key: string]: { fr: string, en: string } } = {
    'Milles': { fr: 'Milles', en: 'Milles' },
    'Cassiope': { fr: 'Cassiope', en: 'Cassiope' },
    'E-flo': { fr: 'E-flo', en: 'E-flo' },
    'EKIP': { fr: 'EKIP', en: 'EKIP' },
    'OnBoarding': { fr: 'OnBoarding', en: 'OnBoarding' }
  };
   paysTranslations: { [key: string]: { fr: string, en: string } } = {
    'Tunisie': { fr: 'Tunisie', en: 'Tunisia' },
    'France': { fr: 'France', en: 'France' },
    'Maroc': { fr: 'Maroc', en: 'Morocco' },
    'Algérie': { fr: 'Algérie', en: 'Algeria' },
    'Belgique': { fr: 'Belgique', en: 'Belgium' },
    'Suisse': { fr: 'Suisse', en: 'Switzerland' },
    'Canada': { fr: 'Canada', en: 'Canada' },
    'Sénégal': { fr: 'Sénégal', en: 'Senegal' },
    'Côte d\'Ivoire': { fr: 'Côte d\'Ivoire', en: 'Ivory Coast' },
    'Madagascar': { fr: 'Madagascar', en: 'Madagascar' },
    'Mali': { fr: 'Mali', en: 'Mali' },
    'Niger': { fr: 'Niger', en: 'Niger' },
    'Burkina Faso': { fr: 'Burkina Faso', en: 'Burkina Faso' },
    'Cameroun': { fr: 'Cameroun', en: 'Cameroon' },
    'Congo': { fr: 'Congo', en: 'Congo' },
    'Gabon': { fr: 'Gabon', en: 'Gabon' },
    'Guinée': { fr: 'Guinée', en: 'Guinea' },
    'Mauritanie': { fr: 'Mauritanie', en: 'Mauritania' },
    'Togo': { fr: 'Togo', en: 'Togo' },
    'Bénin': { fr: 'Bénin', en: 'Benin' },
    'Rwanda': { fr: 'Rwanda', en: 'Rwanda' },
    'Burundi': { fr: 'Burundi', en: 'Burundi' },
    'Tchad': { fr: 'Tchad', en: 'Chad' },
    'Djibouti': { fr: 'Djibouti', en: 'Djibouti' },
    'Comores': { fr: 'Comores', en: 'Comoros' },
    'Seychelles': { fr: 'Seychelles', en: 'Seychelles' },
    'Maurice': { fr: 'Maurice', en: 'Mauritius' }
  };

  isTranslating: boolean = false;
  isAnimating = false;
  pageFlipDirection: 'forward' | 'backward' | null = null;
  groupedAxes: any[] = [];
  groupedParcours: GroupedParcours[] = [];

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
      private onboardingTranslationService: OnboardingTranslationService, // ✅ AJOUT ICI

    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
  // Ne pas appeler loadFormations() ici, utiliser une méthode combinée
  this.loadAllData();
  
  // Écouter les changements de langue
  this.translationService.getLanguage().subscribe(lang => {
    if (lang === 'en') {
      this.translations = this.englishTranslations;
    }

    console.log('🌐 Langue changée vers:', lang);
    this.currentLanguage = lang;
    
    // Recharger les données avec la nouvelle langue
    if (this.formations.length > 0) {
      this.loadAllData();
    }
  });
}


 translatePaysName(paysName: string): string {
    if (this.currentLanguage === 'fr') {
      return paysName;
    }
    return this.paysTranslations[paysName]?.en || paysName;
  }
async selectLanguage(lang: 'fr' | 'en') {
  this.currentLanguage = lang;
  this.showLanguageModal = false;
  this.showCover = true;

  if (lang === 'en') {
    this.translations = this.englishTranslations;
  } else {
    this.translations = {
      catalogueTitle: 'Catalogue des formations',
      welcomeSubtitle: 'Découvrez nos formations',
      feature1: 'Thématiques Inspirantes ',
      feature2: 'Formats Variés',
      feature3: 'Compétences clés au rendez-vous',
      startButton: 'Commencer',
      seconnecter: 'Se connecter',
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
      discoverButton: 'Découvrir',
      programmeDetaille: 'Programme détaillé',
      duree: 'Durée',
      planificateur: 'Planificateur',
      jours: 'jours',
      noActivities: 'Aucune activité prévue pour ce jour',
      onboardingSession: 'SESSION ONBOARDING'
    };
  }
  
  // Charger les données avec la langue sélectionnée
  await this.loadAllData();
}

  // Méthode pour traduire un nom d'axe
translateAxe(axe: string): string {
  console.log('🔍 translateAxe appelé avec:', {
    axe: axe,
    langue: this.currentLanguage,
    dictionnaire: this.axeTranslations[axe]
  });
  
  if (this.currentLanguage === 'fr') {
    const result = this.axeTranslations[axe]?.fr || axe;
    console.log('   → Résultat FR:', result);
    return result;
  }
  const result = this.axeTranslations[axe]?.en || axe;
  console.log('   → Résultat EN:', result);
  return result;
}

  // Méthode pour traduire un nom de parcours
  translateParcours(parcours: string): string {
  console.log('🔍 translateParcours appelé avec:', {
    parcours: parcours,
    langue: this.currentLanguage
  });
  
  if (this.currentLanguage === 'fr') {
    return this.parcoursTranslations[parcours]?.fr || parcours;
  }
  return this.parcoursTranslations[parcours]?.en || parcours;
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

      // ✅ Charger aussi les sessions OnBoarding avec la langue actuelle
      this.loadOnboardingSessions();

      // Si la langue est anglais, traduire
      if (this.currentLanguage === 'en') {
        console.log('🇬🇧 Langue = EN, démarrage traduction...');
        this.translateAllFormations();
      }
    },
    error: err => console.error('❌ Erreur chargement formations:', err)
  });
}

  
async loadAllData(): Promise<void> {
  console.log('📥 Chargement de toutes les données...');
  
  try {
    // 1️⃣ Charger les formations standard
    const standardFormations = await this.loadFormationsPromise();
    console.log(`✅ Formations standard chargées: ${standardFormations.length}`);
    
    // 2️⃣ Charger les sessions OnBoarding
    const onboardingFormations = await this.loadOnboardingSessionsPromise();
    console.log(`✅ Sessions OnBoarding chargées: ${onboardingFormations.length}`);
    
    // 3️⃣ Combiner toutes les formations
    const allFormations = [...standardFormations, ...onboardingFormations];
    const uniqueFormations = this.uniqueById(allFormations);
    
    this.formations = uniqueFormations;
    this.translatedFormations = [...uniqueFormations];
    
    console.log(`📊 Total formations chargées: ${this.formations.length}`);
    console.log(`   - Standard: ${standardFormations.length}`);
    console.log(`   - OnBoarding: ${onboardingFormations.length}`);
    
    // 4️⃣ Mettre à jour l'affichage
    this.updateGroupedData();
    
    if (!this.currentFormation && this.translatedFormations.length > 0) {
      this.currentFormation = this.translatedFormations[0];
    }
    
    // 5️⃣ Traduire si la langue est anglais
    if (this.currentLanguage === 'en') {
      console.log('🇬🇧 Langue = EN, démarrage traduction...');
      await this.translateAllFormations();
    }
    
    this.cdr.detectChanges();
    
  } catch (error) {
    console.error('❌ Erreur chargement données:', error);
  }
}
private loadFormationsPromise(): Promise<Formation[]> {
  return new Promise((resolve, reject) => {
    this.formationService.getFormations().subscribe({
      next: (data) => resolve(data),
      error: (err) => {
        console.error('❌ Erreur chargement formations:', err);
        reject(err);
      }
    });
  });
}

private transformOnboardingSession(
  session: any, 
  paysName?: string, 
  paysId?: number
): Formation | null {
  
  if (!session) {
    console.warn('⚠️ Session null/undefined');
    return null;
  }
  
  try {
    const sessionId = session.id_formation || session.id_session;
    
    // 🔥 CORRECTION: Le pays est un string simple, pas un objet
    const sessionPays = paysName || session.pays || 'Non spécifié';
    const sessionPaysId = paysId || 0;
    
    console.log(`  🔧 Transformation session:`, {
      id: sessionId,
      intitule: session.intitule,
      pays_brut: session.pays,
      pays_final: sessionPays,
      type_pays: typeof session.pays
    });
    
    const onboardingData = {
      id_session: sessionId,
      intitule: session.intitule || 'Sans titre',
      pays: sessionPays, // ✅ String simple
      planificateur: session.planificateur || '',
      date_debut: session.date_debut || '',
      date_fin: session.date_fin || '',
      duree: session.duree || '',
      population: session.population || '',
      prerequis: session.prerequis || '',
      etat: (session.etat === 'validee' || session.etat === 'brouillon') 
        ? session.etat 
        : 'validee' as 'validee' | 'brouillon',
      objectifs: (session.objectifs || []).map((obj: any) => ({
        id_objectif: obj.id_objectif || 0,
        libelle: typeof obj === 'string' ? obj : (obj.libelle || obj)
      })),
      jours: (session.jours || []).map((jour: any) => ({
        id_jour: jour.id_jour || 0,
        id_session: sessionId,
        numero_jour: jour.numero_jour || 0,
        date_jour: jour.date_jour || '',
        titre: jour.titre || '',
        activites: (jour.activites || []).map((act: any) => ({
          id_activite: act.id_activite || 0,
          id_jour: jour.id_jour || 0,
          titre: act.titre || '',
          description: act.description || '',
          heure_debut: act.heure_debut || '',
          heure_fin: act.heure_fin || '',
          lieu: act.lieu || '',
          animateur: act.animateur || '',
          type_activite: act.type_activite || ''
        }))
      })),
      nombre_jours: session.jours?.length || 0,
      nombre_activites: session.jours?.reduce((sum: number, j: any) =>
        sum + (j.activites?.length || 0), 0) || 0
    };
    
    // 🔥 CORRECTION CRITIQUE: Créer le tableau pays correctement
    const formation: Formation = {
      id_formation: sessionId,
      id_formateur: 0,
      intitule: session.intitule || 'Sans titre',
      duree: session.duree || '',
      prerequis: session.prerequis || '',
      population: session.population || '',
      axe: 'Onboarding',
      axe_code: 'ONB',
      parcours: 'OnBoarding',
      // ✅ Créer un tableau avec UN objet pays basé sur le string
      pays: [{ 
        id_pays: sessionPaysId, 
        nom: sessionPays // Le string simple de la base
      }],
      niveau: 'Tous niveaux',
      type: 'Onboarding',
      formateur: '',
      prestataire: '',
      objectifs: onboardingData.objectifs.map((o: any) => o.libelle),
      competences: [],
      interne_externe: session.interne_externe || 'interne' as 'interne' | 'externe',
      source: 'onboarding_session',
      onboarding_data: onboardingData
    };
    
    console.log(`    ✅ Formation créée:`, {
      intitule: formation.intitule,
      pays_array: formation.pays,
      pays_nom: formation.pays[0].nom
    });
    
    return formation;
    
  } catch (error) {
    console.error('❌ Erreur transformation session:', error, session);
    return null;
  }
}


/**
 * 🔥 VERSION CORRIGÉE: loadOnboardingSessionsPromise
 * Adapté pour le format où pays est un string dans chaque session
 */
private loadOnboardingSessionsPromise(): Promise<Formation[]> {
  return new Promise((resolve, reject) => {
    console.log(`📥 Chargement sessions OnBoarding (langue: ${this.currentLanguage})...`);
    
    this.formationService.getOnboardingSessions(this.currentLanguage).subscribe({
      next: (onboardingData: any) => {
        console.log('✅ Données brutes reçues:', onboardingData);
        
        if (!onboardingData) {
          console.log('⚠️ Aucune donnée OnBoarding');
          resolve([]);
          return;
        }
        
        const transformedSessions: Formation[] = [];
        
        // 🔍 FORMAT ATTENDU: [{ pays: [{ paysName: "...", interneExterne: [...] }] }]
        if (Array.isArray(onboardingData) && onboardingData.length > 0) {
          const parcours = onboardingData[0];
          
          console.log('📦 Structure parcours:', {
            hasPays: !!parcours?.pays,
            paysLength: parcours?.pays?.length,
            firstPays: parcours?.pays?.[0]
          });
          
          if (parcours?.pays && Array.isArray(parcours.pays)) {
            parcours.pays.forEach((paysGroup: any, paysIdx: number) => {
              // 🔥 DEBUG COMPLET
              console.log(`\n🔍 DEBUG paysGroup ${paysIdx + 1}:`, {
                paysGroup_complet: paysGroup,
                paysName_raw: paysGroup.paysName,
                paysName_type: typeof paysGroup.paysName,
                paysName_keys: paysGroup.paysName ? Object.keys(paysGroup.paysName) : null,
                paysId: paysGroup.paysId,
                nom: paysGroup.nom,
                toutes_les_cles: Object.keys(paysGroup)
              });
              
              // 🔥 EXTRACTION ULTRA-ROBUSTE
              let paysName: string = 'Non spécifié';
              
              // Tentative 1: paysName est un string
              if (typeof paysGroup.paysName === 'string') {
                paysName = paysGroup.paysName;
                console.log(`   ✅ Cas 1: paysName direct = "${paysName}"`);
              }
              // Tentative 2: paysName est un objet avec propriété 'nom'
              else if (paysGroup.paysName && typeof paysGroup.paysName === 'object') {
                if (paysGroup.paysName.nom) {
                  paysName = paysGroup.paysName.nom;
                  console.log(`   ✅ Cas 2: paysName.nom = "${paysName}"`);
                } else if (paysGroup.paysName.name) {
                  paysName = paysGroup.paysName.name;
                  console.log(`   ✅ Cas 3: paysName.name = "${paysName}"`);
                }
              }
              // Tentative 3: Chercher dans paysGroup.nom
              else if (paysGroup.nom && typeof paysGroup.nom === 'string') {
                paysName = paysGroup.nom;
                console.log(`   ✅ Cas 4: paysGroup.nom = "${paysName}"`);
              }
              // Tentative 4: Regarder dans les formations si elles existent
              else if (paysGroup.interneExterne?.[0]?.formations?.[0]?.pays) {
                const premierPays = paysGroup.interneExterne[0].formations[0].pays;
                if (typeof premierPays === 'string') {
                  paysName = premierPays;
                  console.log(`   ✅ Cas 5: depuis première formation = "${paysName}"`);
                }
              }
              
              console.log(`   🎯 Pays final extrait: "${paysName}"`);
              
              if (paysName === 'Non spécifié') {
                console.error(`   ❌ ÉCHEC: Impossible d'extraire le pays!`);
                console.error(`   📋 Dump complet:`, JSON.stringify(paysGroup, null, 2));
              }
              
              if (paysGroup.interneExterne && Array.isArray(paysGroup.interneExterne)) {
                paysGroup.interneExterne.forEach((statusGroup: any, statusIdx: number) => {
                  console.log(`  📋 Status ${statusIdx + 1}: ${statusGroup.status}`);
                  
                  if (statusGroup.formations && Array.isArray(statusGroup.formations)) {
                    statusGroup.formations.forEach((session: any, sessionIdx: number) => {
                      console.log(`    🎓 Session ${sessionIdx + 1}: ${session.intitule}`);
                      
                      // 🔥 Passer le nom du pays extrait
                      const transformed = this.transformOnboardingSession(
                        session,
                        paysName, // ✅ String simple
                        paysGroup.paysId || 0
                      );
                      
                      if (transformed) {
                        transformedSessions.push(transformed);
                      }
                    });
                  }
                });
              }
            });
          }
        }
        
        console.log(`✅ ${transformedSessions.length} sessions OnBoarding transformées`);
        resolve(transformedSessions);
      },
      error: (err) => {
        console.error('❌ Erreur chargement OnBoarding:', err);
        resolve([]);
      }
    });
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

// catalogue.component.ts
// Remplacez la méthode translateAllFormations par celle-ci :

// catalogue.component.ts - Méthode corrigée

// catalogue.component.ts - Méthode corrigée

async translateAllFormations() {
  console.log('🔄 MEGA-BATCH: Traduction de', this.formations.length, 'formations');
  this.isTranslating = true;
 
  try {
    // 1️⃣ Séparer les formations OnBoarding et standard
    const standardFormations = this.formations.filter(f => f.source !== 'onboarding_session');
    const onboardingSessions = this.formations.filter(f => f.source === 'onboarding_session');
    
    console.log(`📊 Formations à traduire:`);
    console.log(`   - Standard: ${standardFormations.length}`);
    console.log(`   - OnBoarding: ${onboardingSessions.length}`);

    // 2️⃣ Traduire les formations standard
    const translatedStandard: Formation[] = [];
    
    if (standardFormations.length > 0) {
      console.log('🔄 Traduction des formations standard...');
      const allTexts: string[] = [];
      const formationFieldCounts: number[] = [];
     
      standardFormations.forEach(formation => {
        const fields = [
          formation.intitule || '',
          // ❌ NE PAS INCLURE duree dans la traduction
          formation.prerequis || '',
          formation.population || '',
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
     
      const allTranslated = await this.translationService.translateBatchOptimized(allTexts, 'en');
     
      let currentIndex = 0;
      standardFormations.forEach((formation, i) => {
        const fieldCount = formationFieldCounts[i];
        const formationTexts = allTranslated.slice(currentIndex, currentIndex + fieldCount);
       
        let idx = 0;
        const objCount = formation.objectifs?.length || 0;
        const compCount = formation.competences?.length || 0;
       
        translatedStandard.push({
          ...formation,
          intitule: formationTexts[idx++],
          duree: this.formatDuree(formation.duree, 'en'), // ✅ Format simple sans traduction automatique
          prerequis: formationTexts[idx++],
          population: formationTexts[idx++],
          axe: formation.axe,
          parcours: formation.parcours,
          pays: formation.pays,
          niveau: formationTexts[idx++],
          type: formationTexts[idx++],
          formateur: formationTexts[idx++],
          prestataire: formationTexts[idx++],
          objectifs: formationTexts.slice(idx, idx + objCount),
          competences: formationTexts.slice(idx + objCount, idx + objCount + compCount),
          source: 'formation' as const
        });
       
        currentIndex += fieldCount;
      });
      
      console.log(`✅ ${translatedStandard.length} formations standard traduites`);
    }

    // 3️⃣ Traduire les sessions OnBoarding
    const translatedOnboarding: Formation[] = [];
    
    if (onboardingSessions.length > 0) {
      console.log('🔄 Traduction des sessions OnBoarding...');
      
      const sessionsToTranslate = onboardingSessions
        .map(f => f.onboarding_data)
        .filter((data): data is NonNullable<typeof data> => data != null)
        .map(data => {
          const normalizedEtat: 'validee' | 'brouillon' = 
            data.etat === 'brouillon' ? 'brouillon' : 'validee';
          
          return {
            id_session: data.id_session,
            intitule: data.intitule,
            pays: data.pays,
            planificateur: data.planificateur,
            date_debut: data.date_debut,
            date_fin: data.date_fin,
            duree: data.duree,
            population: data.population,
            prerequis: data.prerequis,
            etat: normalizedEtat,
            objectifs: data.objectifs || [],
            jours: data.jours || [],
            nombre_jours: data.nombre_jours,
            nombre_activites: data.nombre_activites
          };
        });
      
      console.log(`   📦 Sessions OnBoarding à traduire: ${sessionsToTranslate.length}`);
      
      if (sessionsToTranslate.length === 0) {
        console.warn('⚠️ Aucune session OnBoarding valide à traduire');
      } else {
        const translatedData = await this.onboardingTranslationService.translateOnboardingData(
          { sessions: sessionsToTranslate },
          'en'
        );
        
        console.log(`   ✅ Traduction OnBoarding terminée: ${translatedData.sessions.length} sessions`);
        
        // 🔥 RESTAURER LES HEURES ORIGINALES (pour OnBoarding)
        translatedData.sessions.forEach((translatedSession, sessionIndex) => {
          const originalSession = sessionsToTranslate[sessionIndex];
          
          if (translatedSession.jours && originalSession.jours) {
            translatedSession.jours.forEach((jourTraduit, jourIndex) => {
              const jourOriginal = originalSession.jours[jourIndex];
              
              if (jourTraduit.activites && jourOriginal.activites) {
                jourTraduit.activites.forEach((actTraduite, actIndex) => {
                  const actOriginal = jourOriginal.activites[actIndex];
                  
                  // ✅ Restaurer les heures exactes
                  actTraduite.heure_debut = actOriginal.heure_debut;
                  actTraduite.heure_fin = actOriginal.heure_fin;
                });
              }
            });
          }
          
          // ✅ Restaurer aussi la durée de la session
          translatedSession.duree = this.formatDuree(originalSession.duree, 'en');
        });
        
        // Reconstruire les formations avec les données traduites
        onboardingSessions.forEach((formation, i) => {
          const translatedSession = translatedData.sessions[i];
          
          if (!translatedSession) {
            console.warn(`⚠️ Session ${i} non traduite, conservation de l'original`);
            translatedOnboarding.push(formation);
            return;
          }
          
          console.log(`\n🔨 Reconstruction OnBoarding ${i + 1}:`);
          console.log(`   Intitulé original: ${formation.intitule}`);
          console.log(`   Intitulé traduit: ${translatedSession.intitule}`);
          console.log(`   Pays: ${formation.pays?.[0]?.nom || 'N/A'}`);
          
          const translatedOnboardingData = {
            id_session: translatedSession.id_session || formation.id_formation,
            intitule: translatedSession.intitule,
            pays: formation.onboarding_data?.pays || formation.pays?.[0]?.nom || '',
            planificateur: translatedSession.planificateur || '',
            date_debut: translatedSession.date_debut,
            date_fin: translatedSession.date_fin,
            duree: translatedSession.duree || '', // ✅ Déjà formaté
            population: translatedSession.population || '',
            prerequis: translatedSession.prerequis || '',
            etat: translatedSession.etat,
            objectifs: translatedSession.objectifs || [],
            jours: translatedSession.jours || [],
            nombre_jours: translatedSession.nombre_jours || 0,
            nombre_activites: translatedSession.nombre_activites || 0
          };
          
          const newFormation: Formation = {
            id_formation: formation.id_formation,
            id_formateur: formation.id_formateur || 0,
            intitule: translatedSession.intitule,
            duree: translatedSession.duree || formation.duree, // ✅ Déjà formaté
            prerequis: translatedSession.prerequis || formation.prerequis,
            population: translatedSession.population || formation.population,
            axe: formation.axe,
            axe_code: formation.axe_code,
            parcours: formation.parcours,
            pays: formation.pays,
            niveau: 'All levels',
            type: 'Onboarding',
            formateur: formation.formateur,
            prestataire: formation.prestataire,
            objectifs: translatedSession.objectifs?.map((obj: any) => obj.libelle) || [],
            competences: formation.competences || [],
            interne_externe: formation.interne_externe,
            source: 'onboarding_session' as const,
            onboarding_data: translatedOnboardingData
          };
          
          console.log(`   ✅ Formation OnBoarding ${i + 1} reconstruite avec traductions`);
          
          translatedOnboarding.push(newFormation);
        });
        
        console.log(`✅ ${translatedOnboarding.length} sessions OnBoarding traduites et intégrées`);
      }
    }

    // 4️⃣ Fusionner les formations traduites
    this.translatedFormations = [...translatedStandard, ...translatedOnboarding];
    
    console.log('\n🔍 VÉRIFICATION APRÈS FUSION:');
    console.log(`   Total formations: ${this.translatedFormations.length}`);
    console.log(`   - Standard: ${translatedStandard.length}`);
    console.log(`   - OnBoarding: ${translatedOnboarding.length}`);
    
    const onboardingCheck = this.translatedFormations.filter(f => f.parcours === 'OnBoarding');
    console.log(`   Formations OnBoarding dans le résultat final: ${onboardingCheck.length}`);
    
    if (onboardingCheck.length > 0) {
      console.log(`   Exemple OnBoarding:`, {
        intitule: onboardingCheck[0].intitule,
        pays: onboardingCheck[0].pays,
        population: onboardingCheck[0].population,
        onboarding_data: onboardingCheck[0].onboarding_data
      });
    }
    
    // 5️⃣ Trier pour conserver l'ordre original
    this.translatedFormations.sort((a, b) => {
      const indexA = this.formations.findIndex(f => f.id_formation === a.id_formation);
      const indexB = this.formations.findIndex(f => f.id_formation === b.id_formation);
      return indexA - indexB;
    });
    
    // 6️⃣ Mettre à jour l'affichage
    this.updateGroupedData();
    
    if (this.currentFormation) {
      const currentIndex = this.currentPage;
      this.currentFormation = this.translatedFormations[currentIndex];
    }
   
    this.cdr.detectChanges();
   
    console.log('✅ Traduction complète terminée avec succès');
   
  } catch (error) {
    console.error('❌ Erreur traduction:', error);
    this.translatedFormations = [...this.formations];
    this.updateGroupedData();
  } finally {
    this.isTranslating = false;
  }
}

// ✅ AJOUTER cette méthode utilitaire dans votre classe
private formatDuree(duree: string, lang: string): string {
  if (!duree) return '';
  
  if (lang === 'en') {
    // Remplacer uniquement les mots français par leur équivalent anglais
    return duree
      .replace(/heures?/gi, 'hours')
      .replace(/heure/gi, 'hour')
      .replace(/jours?/gi, 'days')
      .replace(/jour/gi, 'day')
      .replace(/minutes?/gi, 'minutes')
      .replace(/minute/gi, 'minute')
      .replace(/semaines?/gi, 'weeks')
      .replace(/semaine/gi, 'week')
      .replace(/mois/gi, 'months');
  }
  
  return duree;
}


// ✅ AUSSI, vérifiez que loadOnboardingSessions mappe correctement les données
loadOnboardingSessions(): void {
  console.log('📥 Chargement des sessions OnBoarding...');
  console.log(`🌐 Langue actuelle: ${this.currentLanguage}`);
  
  this.formationService.getOnboardingSessions(this.currentLanguage).subscribe({
    next: (onboardingData: any[]) => {
      console.log('✅ Données OnBoarding reçues:', onboardingData);
      
      if (!onboardingData || onboardingData.length === 0) {
        console.log('⚠️ Aucune donnée OnBoarding reçue');
        return;
      }
      
      const onboardingParcours = onboardingData[0];
      
      if (!onboardingParcours || !onboardingParcours.pays) {
        console.log('⚠️ Structure OnBoarding invalide');
        return;
      }
      
      const transformedSessions: Formation[] = [];
      
      onboardingParcours.pays?.forEach((paysGroup: any) => {
        paysGroup.interneExterne?.forEach((statusGroup: any) => {
          statusGroup.formations?.forEach((session: any) => {
            
            // ✅ CORRECTION: Créer la structure OnboardingSession complète
            const onboardingData = {
              id_session: session.id_formation,
              intitule: session.intitule,
              pays: session.pays || paysGroup.paysName,
              planificateur: session.planificateur || '',
              date_debut: session.date_debut,
              date_fin: session.date_fin,
              duree: session.duree || '',
              population: session.population || '',
              prerequis: session.prerequis || '',
              etat: (session.etat === 'validee' || session.etat === 'brouillon') ? session.etat : 'validee',
              objectifs: (session.objectifs || []).map((obj: any) => ({
                id_objectif: obj.id_objectif || 0,
                libelle: typeof obj === 'string' ? obj : obj.libelle
              })),
              jours: (session.jours || []).map((jour: any) => ({
                id_jour: jour.id_jour,
                id_session: session.id_formation,
                numero_jour: jour.numero_jour,
                date_jour: jour.date_jour,
                titre: jour.titre,
                activites: (jour.activites || []).map((act: any) => ({
                  id_activite: act.id_activite,
                  id_jour: jour.id_jour,
                  titre: act.titre,
                  description: act.description || '',
                  heure_debut: act.heure_debut,
                  heure_fin: act.heure_fin,
                  lieu: act.lieu || '',
                  animateur: act.animateur || '',
                  type_activite: act.type_activite || ''
                }))
              })),
              nombre_jours: session.jours?.length || 0,
              nombre_activites: session.jours?.reduce((sum: number, j: any) =>
                sum + (j.activites?.length || 0), 0) || 0
            };
            
            const transformedSession: Formation = {
              id_formation: session.id_formation,
              id_formateur: 0,
              intitule: session.intitule,
              duree: session.duree || '',
              prerequis: session.prerequis || '',
              population: session.population || '',
              axe: 'Onboarding',
              axe_code: 'ONB',
              parcours: 'OnBoarding',
              pays: [{ id_pays: 0, nom: session.pays || paysGroup.paysName }],
              niveau: 'Tous niveaux',
              type: 'Onboarding',
              formateur: '',
              prestataire: '',
              objectifs: onboardingData.objectifs.map((o: any) => o.libelle),
              competences: [],
              interne_externe: statusGroup.status as 'interne' | 'externe',
              source: 'onboarding_session',
              onboarding_data: onboardingData
            };
            
            transformedSessions.push(transformedSession);
          });
        });
      });
      
      if (transformedSessions.length > 0) {
        const allFormations = [...this.formations, ...transformedSessions];
        const uniqueFormations = this.uniqueById(allFormations);
        
        this.formations = uniqueFormations;
        this.translatedFormations = [...uniqueFormations];
        
        this.updateGroupedData();
        
        if (!this.currentFormation && this.translatedFormations.length > 0) {
          this.currentFormation = this.translatedFormations[0];
        }
        
        this.cdr.detectChanges();
        
        console.log('✅ Données OnBoarding intégrées:', transformedSessions.length);
      }
    },
    error: err => console.error('❌ Erreur chargement OnBoarding:', err)
  });
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

  private uniqueById(formations: Formation[]): Formation[] {
    const map = new Map<number, Formation>();
    formations.forEach(f => map.set(f.id_formation, f));
    return Array.from(map.values());
  }

computeGroupedFormations(): GroupedFormations[] {
  const grouped: GroupedFormations[] = [];
 
  // ✅ EXCLURE les formations avec axe "Onboarding" de la vue par axe
  const axes = [...new Set(this.translatedFormations
    .filter(f => f.axe !== 'Onboarding') // ← AJOUT ICI
    .map(f => f.axe))];

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
private hasValidPays(formation: Formation): boolean {
  return !!(
    formation.pays && 
    Array.isArray(formation.pays) && 
    formation.pays.length > 0 &&
    formation.pays[0]?.nom
  );
}
debugOnboardingStructure(): void {
  console.log('\n🔍 ========== DEBUG ONBOARDING STRUCTURE ==========');
  
  const onboardingFormations = this.formations.filter(f => f.parcours === 'OnBoarding');
  console.log(`📊 Total formations OnBoarding: ${onboardingFormations.length}`);
  
  onboardingFormations.forEach((f, i) => {
    console.log(`\n📋 Formation ${i + 1}:`);
    console.log(`   ID: ${f.id_formation}`);
    console.log(`   Intitulé: ${f.intitule}`);
    console.log(`   Pays (array):`, f.pays);
    console.log(`   Pays valide?: ${this.hasValidPays(f)}`);
    
    if (f.pays && Array.isArray(f.pays) && f.pays.length > 0) {
      f.pays.forEach((p, pi) => {
        console.log(`      Pays ${pi + 1}:`, {
          id_pays: p.id_pays,
          nom: p.nom,
          type: typeof p,
          isObject: typeof p === 'object'
        });
      });
    }
    
    if (f.onboarding_data) {
      console.log(`   OnBoarding Data:`);
      console.log(`      - Pays (dans data): ${f.onboarding_data.pays}`);
      console.log(`      - Planificateur: ${f.onboarding_data.planificateur}`);
      console.log(`      - Nombre jours: ${f.onboarding_data.nombre_jours}`);
    }
  });
  
  // Tester groupByPays
  console.log('\n🧪 Test groupByPays:');
  const grouped = this.groupByPays(onboardingFormations);
  console.log(`   Résultat: ${grouped.length} groupes`);
  grouped.forEach((g, i) => {
    console.log(`   Groupe ${i + 1}: ${g.paysName} (${g.interneExterne.length} status)`);
  });
  
  console.log('\n========== FIN DEBUG ==========\n');
}
  computeParcoursFormations(): GroupedParcours[] {
  const parcoursNames = [...new Set(this.translatedFormations.map(f => f.parcours).filter(p => p))];
  
  return parcoursNames.map(parcoursName => {
    const parcoursFormations = this.translatedFormations.filter(f => f.parcours === parcoursName);
    
    console.log(`\n📦 Traitement parcours: ${parcoursName}`);
    console.log(`   Total formations: ${parcoursFormations.length}`);
    
    if (parcoursName === 'OnBoarding') {
      // 🔥 VÉRIFIER que les formations ont des pays valides
      const formationsAvecPays = parcoursFormations.filter(f => this.hasValidPays(f));
      const formationsSansPays = parcoursFormations.filter(f => !this.hasValidPays(f));
      
      console.log(`   Avec pays valide: ${formationsAvecPays.length}`);
      console.log(`   Sans pays valide: ${formationsSansPays.length}`);
      
      if (formationsSansPays.length > 0) {
        console.warn('⚠️ Formations OnBoarding sans pays détectées:');
        formationsSansPays.forEach(f => {
          console.warn(`   - ${f.intitule}: pays =`, f.pays);
        });
      }
      
      // Group by pays for OnBoarding
      const paysGroups = this.groupByPays(formationsAvecPays);
      
      console.log(`   Groupes pays créés: ${paysGroups.length}`);
      
      return {
        name: parcoursName,
        count: parcoursFormations.length,
        pays: paysGroups,
        axes: []
      };
    }
    
    // Normal parcours: group by axes
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
      pays: []
    };
  });
}

private groupByPays(formations: Formation[]): any[] {
  console.log(`\n🌍 groupByPays - Début`);
  console.log(`   Formations reçues: ${formations.length}`);
  
  const paysMap = new Map<string, Formation[]>();

  formations.forEach((f, idx) => {
    console.log(`   Formation ${idx + 1}:`, {
      id: f.id_formation,
      intitule: f.intitule?.substring(0, 40),
      pays_array: f.pays,
      premier_pays: f.pays?.[0]
    });
    
    if (f.pays && Array.isArray(f.pays) && f.pays.length > 0) {
      f.pays.forEach((p: Pays) => {
        if (p && p.nom && typeof p.nom === 'string') {
          const paysName = p.nom; // ✅ Déjà un string
          console.log(`      → Ajout au pays: "${paysName}"`);
          
          if (!paysMap.has(paysName)) {
            paysMap.set(paysName, []);
          }
          paysMap.get(paysName)!.push(f);
        } else {
          console.warn(`      ⚠️ Pays invalide:`, p);
        }
      });
    } else {
      console.warn(`      ⚠️ Aucun pays valide pour la formation`);
    }
  });

  console.log(`\n   📊 paysMap: ${paysMap.size} pays distincts`);
  paysMap.forEach((forms, paysNom) => {
    console.log(`      - "${paysNom}": ${forms.length} formation(s)`);
  });

  const result = Array.from(paysMap.entries()).map(([paysNom, forms]) => {
    const paysObj = forms[0].pays.find((p: Pays) => p.nom === paysNom);
    const paysId = paysObj?.id_pays || 0;
    
    console.log(`\n   🏗️ Création groupe: "${paysNom}" (ID: ${paysId})`);
    
    const interneExterne = ['externe', 'interne'].map(status => {
      const filtered = forms.filter(f => f.interne_externe === status);
      console.log(`      ${status}: ${filtered.length}`);
      return {
        status: status as 'externe' | 'interne',
        formations: filtered
      };
    }).filter(g => g.formations.length > 0);
    
    return {
      paysName: paysNom, // ✅ String simple
      paysId: paysId,
      interneExterne: interneExterne
    };
  });
  
  console.log(`\n   ✅ Retourne ${result.length} groupes de pays\n`);
  
  return result;
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
  
  // Méthodes utilitaires pour les sessions OnBoarding
  trackByJourId(index: number, jour: any): any {
    return jour.id || jour.numero_jour || index;
  }

  trackByActiviteId(index: number, activite: any): any {
    return activite.id || activite.id_activite || index;
  }

  isOnboardingSession(formation: Formation): boolean {
    return !!formation.onboarding_data;
  }
}