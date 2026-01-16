import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { FormationService } from '../service/formation-service';
import { TranslationService } from '../service/translation.service';

interface Formation {
  id_formation?: number;
  axe: string;
  intitule: string;
  population: string;
  niveau: string;
  prerequis: string;
  id_formateur: number | null;
  interne_externe: string;
  prestataire: string;
  parcours: string;
  pays: number[];
  duree: string;
  objectifs: any[];
  competences: any[];
  statut: string;
    etat?: string;  // ✅ AJOUT: Ajouter la propriété etat (optionnelle)

  _originalId?: number; // Propriété temporaire pour l'édition
}

@Component({
  selector: 'app-formation',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './formation.html',
  styleUrls: ['./formation.css']
})
export class formation implements OnInit, OnDestroy {
    
  formations: Formation[] = [];
  formationsTranslated: Formation[] = []; // Version traduite
  formateurs: any[] = [];
  objectifs: any[] = [];
  competences: any[] = [];
  paysList: { id_pays: number; nom: string }[] = [];
  pays: number[] = [];
searchTerm: string = '';
filteredFormations: Formation[] = [];

  modalOpen = false;
  editModalOpen = false;
  welcomeModalOpen = false;
  currentGuideStep = 1;
  totalGuideSteps = 3;

  dureeNumber: number | null = null;
  dureeUnit: 'jours' | 'heures' = 'jours';

  objectifsInput: string[] = [''];
  competencesInput: string[] = [''];

  editObjectifsInput: string[] = [];
  editCompetencesInput: string[] = [];
  
  editDureeNumber: number | null = null;
  editDureeUnit: 'jours' | 'heures' = 'jours';

  newFormation = this.emptyFormation();
  editFormation: Formation | null = null;

  refreshSub!: Subscription;
  langSub!: Subscription;
  userRole: 'admin' | 'formateur' | null = null;
  currentLang: string = 'fr';
  isTranslating: boolean = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private formationService: FormationService,
    private translationService: TranslationService
  ) {}

  /* ===================== TRADUCTION DES LABELS ===================== */

  /**
   * 🌍 Traduit un label selon la langue actuelle
   */
  getLabel(frLabel: string): string {
    if (this.currentLang === 'fr') {
      return frLabel;
    }
    

    // Dictionnaire de traduction des labels
    const translations: { [key: string]: string } = {
      // Niveaux
      'débutant': 'Beginner',
      'intermédiaire': 'Intermediate',
      'avancé': 'Advanced',
      'senior': 'Senior',
      'expert': 'Expert',
      

      'Rechercher une formation...': 'Search a training...',

      // Axes
      'Technique': 'Technical',
      'Fonctionnelle': 'Functional',
      'Métier': 'Business',
      'Onboarding': 'Onboarding',
      'Solutions': 'Solutions',
      'Linguistique': 'Language',
      'Transversale': 'Cross-functional',
      
      // Interne/Externe
      'interne': 'Internal',
      'externe': 'External',
      
      // Durée
      'jours': 'days',
      'heures': 'hours',
      'Jours': 'Days',
      'Heures': 'Hours',
      
      // Parcours
      'Miles': 'Miles',
      'Cassiopae': 'Cassiopae',
      'E-flo': 'E-flo',
      'EKIP': 'EKIP',
      'OnBoarding': 'OnBoarding',
      
      // Actions et labels
      'Sélectionnez...': 'Select...',
      'Ajouter une formation': 'Add Training',
      'Modifier une formation': 'Edit Training',
      'Télécharger Excel': 'Download Excel',
      'Gestion des Formations': 'Training Management',
      
      // Formulaire
      'Niveau :': 'Level:',
      'Intitulé :': 'Title:',
      'Population :': 'Population:',
      'Axe :': 'Area:',
      'Interne / Externe :': 'Internal / External:',
      'Formateur interne :': 'Internal Trainer:',
      'Prestataire :': 'Provider:',
      'Parcours :': 'Path:',
      'Pays :': 'Country:',
      'Durée :': 'Duration:',
      'Prérequis :': 'Prerequisites:',
      'Objectifs :': 'Objectives:',
      'Compétences :': 'Skills:',
      
      // Boutons
      'Enregistrer': 'Save',
      'Mettre à jour': 'Update',
      'Annuler': 'Cancel',
      'Ajouter un objectif': 'Add Objective',
      'Ajouter une compétence': 'Add Skill',
      
      // Tableau
      'Actions': 'Actions',
      
      // SweetAlert
      'Formation ajoutée': 'Training Added',
      'Formation mise à jour': 'Training Updated',
      'Supprimé !': 'Deleted!',
      'Validée !': 'Validated!',
      'Erreur': 'Error',
      'Êtes-vous sûr ?': 'Are you sure?',
      'Oui, supprimer': 'Yes, delete',
      'Oui, valider': 'Yes, validate',



      'Télécharger': 'Download',
'Téléchargement démarré': 'Download Started',
'Génération en cours...': 'Generating...',
'Veuillez patienter...': 'Please wait...',
'Téléchargement réussi': 'Download Successful',
'Le fichier a été téléchargé': 'File downloaded successfully',
'Impossible de télécharger le fichier': 'Unable to download file',


// Guide - Titres principaux
  'Guide d\'utilisation': 'User Guide',
  'Gestion des formations': 'Training Management',
  
  // Guide - Step 1: Bienvenue
  'Bienvenue': 'Welcome',
  'Cette interface vous permet de gérer les formations selon votre rôle et leur état de validation.': 
    'This interface allows you to manage training courses according to your role and their validation status.',
  'Astuce : Les permissions varient selon votre rôle (Admin ou Formateur)': 
    'Tip: Permissions vary according to your role (Admin or Trainer)',
  
  // Guide - Step 2: Rôles
  'Votre rôle et permissions': 'Your Role and Permissions',
  
  // Admin
  'Administrateur': 'Administrator',
  'Créer, modifier et supprimer toutes les formations': 
    'Create, edit and delete all training courses',
  'Valider les formations proposées par les formateurs': 
    'Validate training courses proposed by trainers',
  'Superviser la cohérence pédagogique': 
    'Supervise pedagogical consistency',
  'Accès complet à toutes les fonctionnalités': 
    'Full access to all features',
  
  // Formateur
  'Formateur': 'Trainer',
  'Créer une formation': 'Create a training course',
  'Modifier ou supprimer une formation': 
    'Edit or delete a training course',
  'Uniquement si son statut est « en attente »': 
    'Only if its status is "pending"',
  'Les formations validées ne peuvent plus être modifiées': 
    'Validated training courses can no longer be modified',
  
  'Les permissions sont définies pour garantir la qualité des formations': 
    'Permissions are defined to ensure training quality',
  
  // Guide - Step 3: Bonnes pratiques
  'Bonnes pratiques': 'Best Practices',
  'Objectifs clairs': 'Clear Objectives',
  'Définissez des objectifs pédagogiques précis et mesurables': 
    'Define precise and measurable learning objectives',
  'Compétences associées': 'Associated Skills',
  'Associez des compétences mesurables': 
    'Associate measurable skills',
  'Vérification': 'Verification',
  'Vérifiez les informations avant validation': 
    'Verify information before validation',
  'Documentation complète': 'Complete Documentation',
  'Renseignez tous les champs pour une formation de qualité': 
    'Fill in all fields for quality training',
  'Une formation bien structurée facilite l\'apprentissage des participants': 
    'A well-structured training facilitates participant learning',
  
  // Guide - Navigation
  'Précédent': 'Previous',
  'Suivant': 'Next',
  'Commencer': 'Start'






    };

    return translations[frLabel] || frLabel;
  }

  /**
   * 🌍 Obtient les options traduites pour les sélecteurs
   */
  getNiveauOptions() {
    return [
      { value: 'débutant', label: this.getLabel('débutant') },
      { value: 'intermédiaire', label: this.getLabel('intermédiaire') },
      { value: 'avancé', label: this.getLabel('avancé') },
      { value: 'senior', label: this.getLabel('senior') },
      { value: 'expert', label: this.getLabel('expert') }
    ];
  }
  openGuide() {
  this.currentGuideStep = 1;   // recommencer le guide
  this.welcomeModalOpen = true;
}


  getAxeOptions() {
    return [
      { value: 'Technique', label: this.getLabel('Technique') },
      { value: 'Fonctionnelle', label: this.getLabel('Fonctionnelle') },
      { value: 'Métier', label: this.getLabel('Métier') },
      { value: 'Onboarding', label: this.getLabel('Onboarding') },
      { value: 'Solutions', label: this.getLabel('Solutions') },
      { value: 'Linguistique', label: this.getLabel('Linguistique') },
      { value: 'Transversale', label: this.getLabel('Transversale') }
    ];
  }

  getInterneExterneOptions() {
    return [
      { value: 'interne', label: this.getLabel('interne') },
      { value: 'externe', label: this.getLabel('externe') }
    ];
  }

  getDureeUnitOptions() {
    return [
      { value: 'jours', label: this.getLabel('Jours') },
      { value: 'heures', label: this.getLabel('Heures') }
    ];
  }

  getParcoursOptions() {
    return [
      { value: '', label: this.getLabel('Sélectionnez...') },
      { value: 'Miles', label: 'Miles' },
      { value: 'Cassiopae', label: 'Cassiopae' },
      { value: 'E-flo', label: 'E-flo' },
      { value: 'EKIP', label: 'EKIP' },
      { value: 'OnBoarding', label: 'OnBoarding' }
    ];
  }

  /* ===================== LIFECYCLE ===================== */

  ngOnInit() {
    this.loadAll();

    // Récupération du rôle
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      this.userRole = storedRole as 'admin' | 'formateur';
    }

    // Récupérer la langue actuelle
    this.currentLang = this.translationService.getCurrentLanguage();

    // S'abonner aux changements de langue
    this.langSub = this.translationService.getLanguage().subscribe(lang => {
      console.log(`🌍 Language changed to: ${lang}`);
      this.currentLang = lang;
      this.translateAllFormations();
    });

    // Afficher le guide UNE SEULE FOIS après login
    const hasSeenGuide = localStorage.getItem('hasSeenFormationGuide');
    if (!hasSeenGuide && this.userRole) {
      this.welcomeModalOpen = true;
      localStorage.setItem('hasSeenFormationGuide', 'true');
    }
    
    this.loadPays();
  }

  ngOnDestroy() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
  }

  /* ===================== TRADUCTION ===================== */

  /**
   * 🌍 Traduit TOUTES les formations en une seule fois (ULTRA-RAPIDE)
   */
translateAxeCustom(axe: string): string {
  if (this.currentLang === 'fr') return axe;

  const axeMap: Record<string, string> = {
    'Technique': 'Technical',
    'Fonctionnelle': 'Functional',
    'Métier': 'Business',
    'Onboarding': 'Onboarding',
    'Solutions': 'Solutions',
    'Linguistique': 'Language',
    'Transversale': 'Cross-functional'
  };

  return axeMap[axe] || axe;
}


  translateParcoursCustom(parcours: string): string {
  if (this.currentLang === 'fr') return parcours;

  const parcoursMap: Record<string, string> = {
    'Miles': 'Miles',
    'Cassioape': 'Cassiopae',
    'EKIP': 'EKIP',
    'OnBoarding': 'Onboarding',
    'E-flo': 'E-flo'
  };

  return parcoursMap[parcours] || parcours;
}

  async translateAllFormations() {
    if (this.currentLang === 'fr' || this.formations.length === 0) {
      this.formationsTranslated = [...this.formations];
      this.cdr.detectChanges();
      return;
    }

    this.isTranslating = true;
    console.log(`🚀 Translating ${this.formations.length} formations to ${this.currentLang}`);

    try {
      // Collecter TOUS les textes à traduire
      const textsToTranslate: string[] = [];
      const indexMap: { formationIndex: number; field: string; subIndex?: number }[] = [];

      this.formations.forEach((formation, fIndex) => {
        // Champs simples
        const simpleFields = ['intitule', 'population', 'prerequis', 'niveau', 'prestataire'];
        
        simpleFields.forEach(field => {
          const value = (formation as any)[field];
          if (value && typeof value === 'string' && value.trim() !== '') {
            textsToTranslate.push(value);
            indexMap.push({ formationIndex: fIndex, field });
          }
        });

        // Objectifs (array of strings)
        if (formation.objectifs && Array.isArray(formation.objectifs)) {
          formation.objectifs.forEach((obj, objIndex) => {
            const text = typeof obj === 'string' ? obj : obj.libelle || obj.objectif || '';
            if (text && text.trim() !== '') {
              textsToTranslate.push(text);
              indexMap.push({ formationIndex: fIndex, field: 'objectifs', subIndex: objIndex });
            }
          });
        }

        // Compétences (array of strings)
        if (formation.competences && Array.isArray(formation.competences)) {
          formation.competences.forEach((comp, compIndex) => {
            const text = typeof comp === 'string' ? comp : comp.libelle || comp.competence || '';
            if (text && text.trim() !== '') {
              textsToTranslate.push(text);
              indexMap.push({ formationIndex: fIndex, field: 'competences', subIndex: compIndex });
            }
          });
        }
      });

      console.log(`📦 Total texts to translate: ${textsToTranslate.length}`);

      if (textsToTranslate.length === 0) {
        this.formationsTranslated = [...this.formations];
        this.isTranslating = false;
        this.cdr.detectChanges();
        return;
      }

      // Traduire TOUT en une seule fois (ULTRA-RAPIDE)
      const startTime = Date.now();
      const translations = await this.translationService.translateBatchOptimized(
        textsToTranslate,
        this.currentLang
      );
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Translation complete in ${duration}s`);

      // Reconstituer les formations traduites
      this.formationsTranslated = JSON.parse(JSON.stringify(this.formations));

      translations.forEach((translatedText, i) => {
        const mapping = indexMap[i];
        const formation = this.formationsTranslated[mapping.formationIndex];

        if (mapping.subIndex !== undefined) {
          // C'est un objectif ou une compétence
          if (mapping.field === 'objectifs') {
            const obj = formation.objectifs[mapping.subIndex];
            if (typeof obj === 'string') {
              formation.objectifs[mapping.subIndex] = translatedText;
            } else {
              obj.libelle = translatedText;
            }
          } else if (mapping.field === 'competences') {
            const comp = formation.competences[mapping.subIndex];
            if (typeof comp === 'string') {
              formation.competences[mapping.subIndex] = translatedText;
            } else {
              comp.libelle = translatedText;
            }
          }
        } else {
          // C'est un champ simple
          (formation as any)[mapping.field] = translatedText;
        }
      });

      this.isTranslating = false;
      this.cdr.detectChanges();

    } catch (error) {
      console.error('❌ Translation error:', error);
      this.formationsTranslated = [...this.formations];
      this.isTranslating = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * 📊 Retourne les formations à afficher (traduites ou non)
   */
 getDisplayedFormations(): Formation[] {
  const source =
    this.currentLang === 'fr'
      ? this.formations
      : this.formationsTranslated;

  if (!this.searchTerm || !this.searchTerm.trim()) {
    return source;
  }

  const term = this.searchTerm.toLowerCase().trim();

  return source.filter(f =>
    (f.intitule || '').toLowerCase().includes(term)
  );
}

matchFormation(f: Formation, term: string): boolean {
  const textIncludes = (value: any): boolean =>
    value && value.toString().toLowerCase().includes(term);

  return (
    textIncludes(f.intitule) ||
    textIncludes(f.axe) ||
    textIncludes(f.niveau) ||
    textIncludes(f.parcours) ||

    // Objectifs
    (f.objectifs || []).some(obj =>
      textIncludes(typeof obj === 'string' ? obj : obj.libelle)
    ) ||

    // Compétences
    (f.competences || []).some(comp =>
      textIncludes(typeof comp === 'string' ? comp : comp.libelle)
    )
  );
}


  /* ===================== PAYS ===================== */

  isPaysSelected(paysId: number): boolean {
    return this.editFormation?.pays?.includes(paysId) || false;
  }

  togglePays(paysId: number): void {
    if (!this.editFormation) return;
    if (!this.editFormation.pays) {
      this.editFormation.pays = [];
    }
    
    const index = this.editFormation.pays.indexOf(paysId);
    
    if (index > -1) {
      this.editFormation.pays.splice(index, 1);
    } else {
      this.editFormation.pays.push(paysId);
    }
  }

  isNewPaysSelected(paysId: number): boolean {
    return this.newFormation.pays?.includes(paysId) || false;
  }

  toggleNewPays(paysId: number): void {
    if (!this.newFormation.pays) {
      this.newFormation.pays = [];
    }
    
    const index = this.newFormation.pays.indexOf(paysId);
    
    if (index > -1) {
      this.newFormation.pays.splice(index, 1);
    } else {
      this.newFormation.pays.push(paysId);
    }
  }

  downloadFormations() {
  const currentLang = this.translationService.getCurrentLanguage();
  const url = `http://localhost:3000/api/download?lang=${currentLang}`;
  window.open(url, '_blank');
}

  loadPays(): void {
    this.formationService.getPays().subscribe({
      next: data => this.paysList = data,
      error: err => console.error(err)
    });
  }

  /* ===================== GUIDE NAVIGATION ===================== */

  nextStep() {
    if (this.currentGuideStep < this.totalGuideSteps) {
      this.currentGuideStep++;
    }
  }

  previousStep() {
    if (this.currentGuideStep > 1) {
      this.currentGuideStep--;
    }
  }

  closeWelcomeModal() {
    this.welcomeModalOpen = false;
    this.currentGuideStep = 1;
  }

  showGuideAgain() {
    this.currentGuideStep = 1;
    this.welcomeModalOpen = true;
  }

  /* ===================== LOADERS ===================== */

  loadAll() {
    this.loadFormations();
    this.loadFormateurs();
    this.loadObjectifs();
    this.loadCompetences();
  }

   loadFormations() {
    this.http
      .get<Formation[]>('http://localhost:3000/api/formations')
      .subscribe(data => {
        this.ngZone.run(() => {
          // ✅ AJOUT: Filtrer uniquement les formations validées
          this.formations = data.filter(f => 
            f.statut === 'validee' || f.etat === 'validee'
          );
          
          this.translateAllFormations(); // Traduire après chargement
          this.cdr.detectChanges();
        });
      });
  }

  loadFormateurs() {
    this.http.get<any[]>('http://localhost:3000/api/formateurs')
      .subscribe(data => {
        this.ngZone.run(() => {
          this.formateurs = data;
          this.cdr.detectChanges();
        });
      });
  }

  loadObjectifs() {
    this.http.get<any[]>('http://localhost:3000/api/objectifs')
      .subscribe(data => {
        this.ngZone.run(() => {
          this.objectifs = data;
          this.cdr.detectChanges();
        });
      });
  }

  loadCompetences() {
    this.http.get<any[]>('http://localhost:3000/api/competences')
      .subscribe(data => {
        this.ngZone.run(() => {
          this.competences = data;
          this.cdr.detectChanges();
        });
      });
  }

  /* ===================== CREATE ===================== */

  async saveFormation() {
    try {
      const objectifIds = await this.resolveIds(
        this.objectifsInput,
        this.objectifs,
        'objectif',
        'id_objectif'
      );

      const competenceIds = await this.resolveIds(
        this.competencesInput,
        this.competences,
        'competence',
        'id_competence'
      );

      const payload = {
        ...this.newFormation,
        duree: this.dureeNumber
          ? `${this.dureeNumber} ${this.dureeUnit}`
          : null,
        objectifs: objectifIds,
        competences: competenceIds,
        statut: this.userRole === 'admin' ? 'validé' : 'en_attente'
      };

      this.http.post('http://localhost:3000/api/formation', payload)
        .subscribe({
          next: () => {
            const message = this.userRole === 'admin'
              ? 'La formation a été créée et validée avec succès.'
              : 'La formation a été créée et est en attente de validation.';

            Swal.fire({
              icon: 'success',
              title: 'Formation ajoutée',
              text: message,
              timer: 2000,
              showConfirmButton: false
            });

            this.loadFormations();
            this.closeModal();
            this.cdr.detectChanges();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: 'Une erreur est survenue lors de la création de la formation.',
              confirmButtonColor: '#d33'
            });
            console.error(err);
          }
        });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur interne',
        text: 'Impossible de traiter les objectifs ou les compétences.'
      });
      console.error(error);
    }
  }

  /* ===================== UPDATE ===================== */

  async updateFormation() {
    if (!this.editFormation) return;

    try {
      // Si on est en mode traduit, il faut retrouver l'original pour avoir les bons IDs
      const originalFormation = this.formations.find(
        form => form.id_formation === this.editFormation!.id_formation
      );

      // Si la langue est EN, on doit retransformer les textes en FR avant sauvegarde
      // Pour cela, on va garder la structure originale et mettre à jour seulement ce qui a changé
      
      const objectifIds = await this.resolveIds(
        this.editObjectifsInput,
        this.objectifs,
        'objectif',
        'id_objectif'
      );

      const competenceIds = await this.resolveIds(
        this.editCompetencesInput,
        this.competences,
        'competence',
        'id_competence'
      );

      const payload = {
        ...this.editFormation,
        duree: this.editDureeNumber
          ? `${this.editDureeNumber} ${this.editDureeUnit}`
          : null,
        objectifs: objectifIds,
        competences: competenceIds
      };

      // Nettoyer les propriétés temporaires
      delete payload._originalId;

      this.http.put(
        `http://localhost:3000/api/formations/${this.editFormation.id_formation}`,
        payload
      ).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Formation mise à jour',
            text: 'Les modifications ont été enregistrées avec succès.',
            timer: 1800,
            showConfirmButton: false
          });

          this.loadFormations();
          this.closeEditModal();
          this.cdr.detectChanges();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Impossible de mettre à jour la formation. Veuillez réessayer.',
            confirmButtonColor: '#d33'
          });
          console.error(err);
        }
      });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur interne',
        text: 'Problème lors de la résolution des objectifs ou compétences.'
      });
      console.error(error);
    }
  }

  /* ===================== VALIDATE (ADMIN ONLY) ===================== */

  validateFormation(formation: Formation) {
    Swal.fire({
      title: 'Valider cette formation ?',
      text: `Voulez-vous valider la formation "${formation.intitule}" ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, valider',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.put(
          `http://localhost:3000/api/formations/${formation.id_formation}`,
          { ...formation, statut: 'validé' }
        ).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Validée !',
              text: 'La formation a été validée avec succès.',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadFormations();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: 'Impossible de valider la formation.',
              confirmButtonColor: '#d33'
            });
            console.error(err);
          }
        });
      }
    });
  }




  /* ===================== DELETE ===================== */

  delete(i: number) {
    const displayedFormations = this.getDisplayedFormations();
    const formation = displayedFormations[i];

    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: `Voulez-vous vraiment supprimer la formation "${formation.intitule}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        const id = formation.id_formation;
        this.http
          .delete(`http://localhost:3000/api/formations/${id}`)
          .subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: 'Supprimé !',
                text: 'La formation a été supprimée avec succès.',
                timer: 1500,
                showConfirmButton: false
              });
              this.loadFormations();
            },
            error: (err) => {
              Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: 'Impossible de supprimer la formation.',
                confirmButtonColor: '#d33'
              });
              console.error(err);
            }
          });
      }
    });
  }

  /* ===================== MODALS ===================== */

  openModal() {
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.newFormation = this.emptyFormation();
    this.objectifsInput = [''];
    this.competencesInput = [''];
    this.dureeNumber = null;
    this.cdr.detectChanges();
  }

  openEditModal(f: Formation) {
    // Si la langue est EN, utiliser la formation traduite pour l'affichage
    // Mais garder une référence à l'original pour la sauvegarde
    const originalFormation = this.formations.find(
      form => form.id_formation === f.id_formation
    );
    
    // Utiliser la formation cliquée (qui peut être traduite)
    this.editFormation = structuredClone(f);
    
    // Stocker l'ID pour retrouver l'original lors de la sauvegarde
    this.editFormation._originalId = originalFormation?.id_formation;
    
    // Extraire les objectifs et compétences sous forme de texte
    this.editObjectifsInput = (this.editFormation.objectifs || []).map(obj => 
      typeof obj === 'string' ? obj : obj.libelle || obj.objectif || ''
    );
    
    this.editCompetencesInput = (this.editFormation.competences || []).map(comp => 
      typeof comp === 'string' ? comp : comp.libelle || comp.competence || ''
    );
    
    if (this.editFormation.duree) {
      const match = this.editFormation.duree.match(/(\d+)\s*(jours|heures|days|hours)/i);
      if (match) {
        this.editDureeNumber = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        // Convertir en français pour le formulaire
        if (unit === 'days') {
          this.editDureeUnit = 'jours';
        } else if (unit === 'hours') {
          this.editDureeUnit = 'heures';
        } else {
          this.editDureeUnit = unit as 'jours' | 'heures';
        }
      }
    }
    
    this.editModalOpen = true;
  }

  closeEditModal() {
    this.editModalOpen = false;
    this.editFormation = null;
    this.editObjectifsInput = [];
    this.editCompetencesInput = [];
    this.editDureeNumber = null;
    this.cdr.detectChanges();
  }
  

  /* ===================== HELPERS ===================== */

  addObjectifInput() { this.objectifsInput.push(''); }
  addCompetenceInput() { this.competencesInput.push(''); }
  addEditObjectifInput() { this.editObjectifsInput.push(''); }
  addEditCompetenceInput() { this.editCompetencesInput.push(''); }

  async resolveIds(
    inputs: string[],
    cache: any[],
    endpoint: string,
    idKey: string
  ): Promise<number[]> {
    const ids: number[] = [];

    for (const text of inputs) {
      if (!text || !text.trim()) continue;

      const existing = cache.find(
        e => e.libelle.toLowerCase() === text.toLowerCase()
      );

      if (existing) {
        ids.push(existing[idKey]);
      } else {
        const res: any = await firstValueFrom(
          this.http.post(`http://localhost:3000/api/${endpoint}`, { libelle: text })
        );
        ids.push(res[idKey]);
        cache.push(res);
      }
    }

    return ids;
  }

  emptyFormation(): Formation {
    return {
      axe: '',
      intitule: '',
      population: '',
      niveau: 'débutant',
      prerequis: '',
      id_formateur: null,
      interne_externe: 'interne',
      prestataire: '',
      parcours: '',
      pays: [],
      duree: '',
      objectifs: [],
      competences: [],
      statut: 'en_attente'
    };
  }




  
}



/* ===================== HTML TEMPLATE CHANGES ===================== 
Modifiez formation.html comme suit:

1. Changez la boucle du tableau:
   <tr *ngFor="let f of formations; let i = index">
   
   PAR:
   <tr *ngFor="let f of getDisplayedFormations(); let i = index">

2. Ajoutez un indicateur de traduction après le header:
   <div class="translation-indicator" *ngIf="isTranslating">
     <span class="spinner"></span> Traduction en cours...
   </div>

3. Ajoutez dans le CSS (.css file):
   .translation-indicator {
     position: fixed;
     top: 20px;
     right: 20px;
     background: #4CAF50;
     color: white;
     padding: 12px 20px;
     border-radius: 8px;
     box-shadow: 0 4px 12px rgba(0,0,0,0.15);
     z-index: 9999;
     display: flex;
     align-items: center;
     gap: 10px;
     animation: slideIn 0.3s ease;
   }

   .spinner {
     width: 16px;
     height: 16px;
     border: 2px solid #fff;
     border-top-color: transparent;
     border-radius: 50%;
     animation: spin 0.6s linear infinite;
   }

   @keyframes spin {
     to { transform: rotate(360deg); }
   }

   @keyframes slideIn {
     from { transform: translateX(100%); }
     to { transform: translateX(0); }
   }
*/