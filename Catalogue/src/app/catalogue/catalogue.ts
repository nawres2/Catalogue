import { Component, Inject, NgZone, OnInit, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Formation } from '../model/formation.model';
import { FormationService } from '../service/formation-service';
import { HttpClientModule } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { TranslationService } from '../service/translation.service';
import { RouterModule } from '@angular/router';


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

interface GroupedParcours {
  name: string;
  count: number;
  axes: {
    axe: string;
    types: {
      type: string;
      interneExterne: {
        status: 'interne' | 'externe';
        formations: Formation[];
      }[];
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
  feature1: 'Feature 1',
  feature2: 'Feature 2',
  feature3: 'Feature 3',
  startButton: 'Start',
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
    feature1: 'Feature 1',
    feature2: 'Feature 2',
    feature3: 'Feature 3',
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
        console.log('✅ Formations chargées:', data.length);
        this.formations = data;
        this.translatedFormations = [...data];

        if (this.formations.length > 0) {
          this.currentFormation = this.translatedFormations[0];
        }

        this.updateGroupedData();

        // Si la langue est anglais, traduire
        if (this.currentLanguage === 'en') {
          console.log('🇬🇧 Langue = EN, démarrage traduction...');
          this.translateAllFormations();
        }
      },
      error: err => console.error('❌ Erreur chargement formations:', err)
    });
  }

  updateGroupedData(): void {
    this.groupedFormations = this.computeGroupedFormations();
    this.groupedParcours = this.computeParcoursFormations();

    this.collapsedAxes = this.groupedFormations.map(() => false);
    this.collapsedParcoursAxes = {};
    this.groupedParcours.forEach(p => {
      this.collapsedParcoursAxes[p.name] = p.axes.map(() => false);
    });
  }

// Remplacez seulement les méthodes translateAllFormations et translateField dans votre catalogue.ts
// Remplacez seulement les méthodes translateAllFormations et translateField dans votre catalogue.ts

async translateAllFormations() {
  console.log('🔄 Début de la traduction de', this.formations.length, 'formations');
  this.isTranslating = true;
  
  try {
    const translated: Formation[] = [];
    const BATCH_SIZE = 5; // Traduire 5 formations en parallèle
    
    for (let i = 0; i < this.formations.length; i += BATCH_SIZE) {
      const batch = this.formations.slice(i, Math.min(i + BATCH_SIZE, this.formations.length));
      console.log(`📦 Traduction lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(this.formations.length / BATCH_SIZE)} (formations ${i + 1}-${i + batch.length})`);
      
      // Traduire toutes les formations du lot en parallèle
      const batchPromises = batch.map(async (formation, idx) => {
        try {
          const [
            intitule,
            duree,
            prerequis,
            population,
            axe,
            niveau,
            type,
            parcours,
            formateur,
            prestataire,
            objectifs,
            competences
          ] = await Promise.all([
            this.translateField(formation.intitule),
            this.translateField(formation.duree),
            this.translateField(formation.prerequis),
            this.translateField(formation.population),
            this.translateField(formation.axe),
            this.translateField(formation.niveau),
            this.translateField(formation.type),
            this.translateField(formation.parcours),
            formation.formateur ? this.translateField(formation.formateur) : Promise.resolve(''),
            formation.prestataire ? this.translateField(formation.prestataire) : Promise.resolve(''),
            formation.objectifs && formation.objectifs.length > 0
              ? this.translationService.translateArray(formation.objectifs, 'en')
              : Promise.resolve([]),
            formation.competences && formation.competences.length > 0
              ? this.translationService.translateArray(formation.competences, 'en')
              : Promise.resolve([])
          ]);

          return {
            ...formation,
            intitule,
            duree,
            prerequis,
            population,
            axe,
            niveau,
            type,
            parcours,
            formateur,
            prestataire,
            objectifs,
            competences
          };
        } catch (err) {
          console.error(`❌ Erreur formation ${i + idx + 1}:`, err);
          return formation; // Retourner l'original en cas d'erreur
        }
      });

      const batchResults = await Promise.all(batchPromises);
      translated.push(...batchResults);
      
      console.log(`✅ Lot ${Math.floor(i / BATCH_SIZE) + 1} terminé (${translated.length}/${this.formations.length})`);
      
      // Forcer la détection de changement après chaque lot
      this.cdr.detectChanges();
    }

    console.log('✅ Toutes les traductions terminées');
    
    // DEBUG: Vérifier les premières formations traduites
    console.log('📋 Exemple de traduction:');
    console.log('  Formation 1 (FR):', this.formations[0].intitule);
    console.log('  Formation 1 (EN):', translated[0].intitule);
    console.log('  Axe (FR):', this.formations[0].axe);
    console.log('  Axe (EN):', translated[0].axe);
    
    this.translatedFormations = translated;
    this.updateGroupedData();
    
    console.log('📊 Groupes après traduction:', this.groupedFormations.map(g => g.axe));
    
    if (this.currentFormation) {
      this.currentFormation = this.translatedFormations[this.currentPage];
      console.log('📄 Formation affichée:', this.currentFormation.intitule);
    }
    
    // Forcer la mise à jour finale de l'affichage
    this.cdr.detectChanges();
    console.log('🔄 Vue mise à jour avec les traductions');
    
  } catch (error) {
    console.error('❌ Erreur globale de traduction:', error);
    alert('Erreur lors de la traduction. Vérifiez:\n1. LibreTranslate sur http://localhost:5000\n2. Le proxy sur http://localhost:8080');
    this.translatedFormations = [...this.formations];
    this.updateGroupedData();
  } finally {
    this.isTranslating = false;
    console.log('🏁 Processus de traduction terminé');
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
    const parcours = [...new Set(this.translatedFormations.map(f => f.parcours).filter(p => p))];
    
    return parcours.map(parcoursName => {
      const parcoursFormations = this.translatedFormations.filter(f => f.parcours === parcoursName);
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
        axes: axeGroups
      };
    });
  }

  getVisibleFormations(): Formation[] {
    if (this.currentView === 'axe') {
      return this.groupedFormations.flatMap((g: GroupedFormations) =>
        g.types.flatMap(t =>
          t.interneExterne.flatMap(s => s.formations)
        )
      );
    } else if (this.currentView === 'parcours') {
      const formations: Formation[] = [];
      for (const parcours of this.groupedParcours) {
        for (const axe of parcours.axes) {
          for (const type of axe.types) {
            for (const statusGroup of type.interneExterne) {
              formations.push(...statusGroup.formations);
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