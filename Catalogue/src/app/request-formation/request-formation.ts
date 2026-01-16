import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { FormationService, Formation, Formateur, Objectif, Competence } from '../service/request_formation.service';
import { TranslationService } from '../service/translation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-request-formation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './request-formation.html',
  styleUrls: ['./request-formation.css']
})
export class RequestFormation implements OnInit, OnDestroy {
  private formationService = inject(FormationService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private translationService = inject(TranslationService);

  formationRequests: Formation[] = [];
  formationRequestsTranslated: Formation[] = [];
  selectedRequest: Formation | null = null;
  selectedRequestTranslated: Formation | null = null;
  detailModalOpen = false;
  formateurs: Formateur[] = [];
  
  objectifsArray: Objectif[] = [];
  competencesArray: Competence[] = [];
  objectifsArrayTranslated: Objectif[] = [];
  competencesArrayTranslated: Competence[] = [];

  confirmModalOpen = false;
  confirmAction: 'valider' | 'refuser' | null = null;
  confirmMessage = '';

  private routerEventsSub: any;
  private langSub!: Subscription;
  loading = true;
  currentLang: string = 'fr';
  isTranslating: boolean = false;

  ngOnInit(): void {
    this.loadFormationRequests();

    // Récupérer la langue actuelle
    this.currentLang = this.translationService.getCurrentLanguage();

    // S'abonner aux changements de langue
    this.langSub = this.translationService.getLanguage().subscribe(lang => {
      console.log(`🌍 Language changed to: ${lang}`);
      this.currentLang = lang;
      this.translateAllFormations();
      
      // Si une modal de détails est ouverte, la traduire aussi
      if (this.detailModalOpen && this.selectedRequest) {
        this.translateModalDetails();
      }
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (event.url.includes('formation_demande')) {
          this.loadFormationRequests();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerEventsSub) {
      this.routerEventsSub.unsubscribe();
    }
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
  }

  /* ===================== TRADUCTION ===================== */

  /**
   * 🌍 Traduit toutes les formations en attente
   */
  async translateAllFormations() {
    if (this.currentLang === 'fr' || this.formationRequests.length === 0) {
      this.formationRequestsTranslated = [...this.formationRequests];
      this.cdr.detectChanges();
      return;
    }

    this.isTranslating = true;
    console.log(`🚀 Translating ${this.formationRequests.length} formation requests to ${this.currentLang}`);

    try {
      const textsToTranslate: string[] = [];
      const indexMap: { formationIndex: number; field: string }[] = [];

      this.formationRequests.forEach((formation, fIndex) => {
        const simpleFields = ['intitule', 'axe', 'axe_code', 'niveau', 'population', 'interne_externe', 'description', 'prerequis'];
        
        simpleFields.forEach(field => {
          const value = (formation as any)[field];
          if (value && typeof value === 'string' && value.trim() !== '') {
            textsToTranslate.push(value);
            indexMap.push({ formationIndex: fIndex, field });
          }
        });
      });

      console.log(`📦 Total texts to translate: ${textsToTranslate.length}`);

      if (textsToTranslate.length === 0) {
        this.formationRequestsTranslated = [...this.formationRequests];
        this.isTranslating = false;
        this.cdr.detectChanges();
        return;
      }

      const startTime = Date.now();
      const translations = await this.translationService.translateBatchOptimized(
        textsToTranslate,
        this.currentLang
      );
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Translation complete in ${duration}s`);

      this.formationRequestsTranslated = JSON.parse(JSON.stringify(this.formationRequests));

      translations.forEach((translatedText, i) => {
        const mapping = indexMap[i];
        const formation = this.formationRequestsTranslated[mapping.formationIndex];
        (formation as any)[mapping.field] = translatedText;
      });

      this.isTranslating = false;
      this.cdr.detectChanges();

    } catch (error) {
      console.error('❌ Translation error:', error);
      this.formationRequestsTranslated = [...this.formationRequests];
      this.isTranslating = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * 🌍 Traduit les détails de la modal
   */
  async translateModalDetails() {
    if (this.currentLang === 'fr' || !this.selectedRequest) {
      this.selectedRequestTranslated = this.selectedRequest;
      this.objectifsArrayTranslated = [...this.objectifsArray];
      this.competencesArrayTranslated = [...this.competencesArray];
      this.cdr.detectChanges();
      return;
    }

    try {
      const textsToTranslate: string[] = [];
      const indexMap: { type: 'formation' | 'objectif' | 'competence'; index?: number; field?: string }[] = [];

      // Formation details
      const formationFields = ['intitule', 'axe', 'axe_code', 'niveau', 'population', 'interne_externe', 'description', 'prerequis'];
      formationFields.forEach(field => {
        const value = (this.selectedRequest as any)[field];
        if (value && typeof value === 'string' && value.trim() !== '') {
          textsToTranslate.push(value);
          indexMap.push({ type: 'formation', field });
        }
      });

      // Objectifs
      this.objectifsArray.forEach((obj, index) => {
        if (obj.libelle && obj.libelle.trim() !== '') {
          textsToTranslate.push(obj.libelle);
          indexMap.push({ type: 'objectif', index });
        }
      });

      // Compétences
      this.competencesArray.forEach((comp, index) => {
        if (comp.libelle && comp.libelle.trim() !== '') {
          textsToTranslate.push(comp.libelle);
          indexMap.push({ type: 'competence', index });
        }
      });

      if (textsToTranslate.length === 0) {
        this.selectedRequestTranslated = this.selectedRequest;
        this.objectifsArrayTranslated = [...this.objectifsArray];
        this.competencesArrayTranslated = [...this.competencesArray];
        this.cdr.detectChanges();
        return;
      }

      const translations = await this.translationService.translateBatchOptimized(
        textsToTranslate,
        this.currentLang
      );

      this.selectedRequestTranslated = JSON.parse(JSON.stringify(this.selectedRequest));
      this.objectifsArrayTranslated = JSON.parse(JSON.stringify(this.objectifsArray));
      this.competencesArrayTranslated = JSON.parse(JSON.stringify(this.competencesArray));

      translations.forEach((translatedText, i) => {
        const mapping = indexMap[i];
        
        if (mapping.type === 'formation' && mapping.field) {
          (this.selectedRequestTranslated as any)[mapping.field] = translatedText;
        } else if (mapping.type === 'objectif' && mapping.index !== undefined) {
          this.objectifsArrayTranslated[mapping.index].libelle = translatedText;
        } else if (mapping.type === 'competence' && mapping.index !== undefined) {
          this.competencesArrayTranslated[mapping.index].libelle = translatedText;
        }
      });

      this.cdr.detectChanges();

    } catch (error) {
      console.error('❌ Modal translation error:', error);
      this.selectedRequestTranslated = this.selectedRequest;
      this.objectifsArrayTranslated = [...this.objectifsArray];
      this.competencesArrayTranslated = [...this.competencesArray];
      this.cdr.detectChanges();
    }
  }

  /**
   * 🌍 Traduit un label
   */
  getLabel(frLabel: string): string {
    if (this.currentLang === 'fr') {
      return frLabel;
    }

    const translations: { [key: string]: string } = {
      // Titre et compteur
      'Formations en Attente de Validation': 'Trainings Pending Validation',
      'formation(s)': 'training(s)',
      'Aucune formation en attente de validation': 'No trainings pending validation',
      
      // Tableau
      'Intitulé': 'Title',
      'Axe': 'Area',
      'Niveau': 'Level',
      'Population': 'Population',
      'Formateur': 'Trainer',
      'Type': 'Type',
      'Actions': 'Actions',
      
      // Niveaux
      'débutant': 'Beginner',
      'intermédiaire': 'Intermediate',
      'avancé': 'Advanced',
      'senior': 'Senior',
      'expert': 'Expert',
      
      // Types
      'interne': 'Internal',
      'externe': 'External',
      'Non spécifié': 'Not specified',
      'Non assigné': 'Not assigned',
      'Non défini': 'Not defined',
      'Non trouvé': 'Not found',
      
      // Modal détails
      'Détails de la Formation': 'Training Details',
      'Informations générales': 'General Information',
      'Intitulé :': 'Title:',
      'Axe :': 'Area:',
      'Code Axe :': 'Area Code:',
      'Niveau :': 'Level:',
      'Population :': 'Population:',
      'Type :': 'Type:',
      'Nom :': 'Name:',
      'Description': 'Description',
      'Prérequis': 'Prerequisites',
      'Objectifs pédagogiques': 'Learning Objectives',
      'Compétences visées': 'Target Skills',
      'Aucun objectif défini': 'No objectives defined',
      'Aucune compétence définie': 'No skills defined',
      
      // Boutons
      '❌ Refuser': '❌ Reject',
      '✅ Valider': '✅ Validate',
      
      // Confirmations
      'Êtes-vous sûr de vouloir valider cette formation ?': 'Are you sure you want to validate this training?',
      'Êtes-vous sûr de vouloir refuser cette formation ?': 'Are you sure you want to reject this training?',
      'Formation refusée': 'Training rejected',
      'Erreur lors de la validation de la formation': 'Error validating the training',
      'Erreur lors du refus de la formation': 'Error rejecting the training',
      'Erreur lors du chargement des détails de la formation': 'Error loading training details',
      'Traduction en cours...': 'Translation in progress...'
    };

    return translations[frLabel] || frLabel;
  }

  /**
   * 📊 Retourne les formations à afficher (traduites ou non)
   */
  getDisplayedFormations(): Formation[] {
    return this.currentLang === 'fr' ? this.formationRequests : this.formationRequestsTranslated;
  }

  /**
   * 📊 Retourne la formation sélectionnée (traduite ou non)
   */
  getDisplayedSelectedRequest(): Formation | null {
    return this.currentLang === 'fr' ? this.selectedRequest : this.selectedRequestTranslated;
  }

  /**
   * 📊 Retourne les objectifs à afficher (traduits ou non)
   */
  getDisplayedObjectifs(): Objectif[] {
    return this.currentLang === 'fr' ? this.objectifsArray : this.objectifsArrayTranslated;
  }

  /**
   * 📊 Retourne les compétences à afficher (traduites ou non)
   */
  getDisplayedCompetences(): Competence[] {
    return this.currentLang === 'fr' ? this.competencesArray : this.competencesArrayTranslated;
  }

  /* ===================== CHARGEMENT DES DONNÉES ===================== */

  private loadData(): void {
    this.formationRequests = [];
    this.formateurs = [];
    this.loadFormationRequests();
    this.loadFormateurs();
  }

  loadFormationRequests(): void {
    this.formationService.getFormationRequests().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.formationRequests = data;
          this.translateAllFormations(); // Traduire après chargement
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error(err)
    });
  }

  loadFormateurs(): void {
    this.formationService.getFormateurs().subscribe({
      next: (data: Formateur[]) => this.formateurs = data,
      error: (err) => console.error('Erreur chargement formateurs:', err)
    });
  }

  /* ===================== MODAL DÉTAILS ===================== */

  openDetailModal(request: Formation): void {
    if (!request.id_formation) return;

    // Récupérer l'original (non traduit) pour avoir l'ID correct
    const originalRequest = this.formationRequests.find(
      f => f.id_formation === request.id_formation
    );

    if (!originalRequest || !originalRequest.id_formation) return;

    this.formationService.getFormationDetails(originalRequest.id_formation).subscribe({
      next: (details: Formation) => {
        this.selectedRequest = details;
        this.objectifsArray = details.objectifs || [];
        this.competencesArray = details.competences || [];
        this.translateModalDetails(); // Traduire les détails
        this.detailModalOpen = true;
      },
      error: (err) => {
        console.error('Erreur chargement détails:', err);
        alert(this.getLabel('Erreur lors du chargement des détails de la formation'));
      }
    });
  }

  closeDetailModal(): void {
    this.detailModalOpen = false;
    this.selectedRequest = null;
    this.selectedRequestTranslated = null;
    this.objectifsArray = [];
    this.competencesArray = [];
    this.objectifsArrayTranslated = [];
    this.competencesArrayTranslated = [];
  }

  /* ===================== ACTIONS VALIDATION / REFUS ===================== */

  openValiderConfirm(): void {
    if (!this.selectedRequest?.id_formation) return;
    this.confirmAction = 'valider';
    this.confirmMessage = this.getLabel('Êtes-vous sûr de vouloir valider cette formation ?');
    this.confirmModalOpen = true;
  }

  openRefuserConfirm(): void {
    if (!this.selectedRequest?.id_formation) return;
    this.confirmAction = 'refuser';
    this.confirmMessage = this.getLabel('Êtes-vous sûr de vouloir refuser cette formation ?');
    this.confirmModalOpen = true;
  }

  closeConfirmModal(): void {
    this.confirmModalOpen = false;
    this.confirmAction = null;
    this.confirmMessage = '';
  }

  executeConfirmedAction(): void {
    if (this.confirmAction === 'valider') {
      this.validerFormation();
    } else if (this.confirmAction === 'refuser') {
      this.refuserFormation();
    }
    this.closeConfirmModal();
  }

  validerFormation(): void {
    if (!this.selectedRequest?.id_formation) return;
    
    const formationId = this.selectedRequest.id_formation;

    this.formationService.validerFormation(formationId).subscribe({
      next: () => {
        this.closeDetailModal();
        this.loadFormationRequests();
      },
      error: (err) => {
        console.error('Erreur validation:', err);
        alert(this.getLabel('Erreur lors de la validation de la formation'));
      }
    });
  }

  refuserFormation(): void {
    if (!this.selectedRequest?.id_formation) return;
    
    const formationId = this.selectedRequest.id_formation;

    this.formationService.refuserFormation(formationId).subscribe({
      next: () => {
        alert(this.getLabel('Formation refusée'));
        this.closeDetailModal();
        this.loadFormationRequests();
      },
      error: (err) => {
        console.error('Erreur refus:', err);
        alert(this.getLabel('Erreur lors du refus de la formation'));
      }
    });
  }

  /* ===================== HELPERS ===================== */

  trackFormation(index: number, item: Formation) { return item.id_formation; }
  trackObjectif(index: number, item: Objectif) { return item.id_objectif; }
  trackCompetence(index: number, item: Competence) { return item.id_competence; }

  getFormateurName(idFormateur: number | undefined): string {
    if (!idFormateur) return this.getLabel('Non assigné');
    const formateur = this.formateurs.find(f => f.id_user === idFormateur);
    return formateur ? `${formateur.nom} ${formateur.prenom}` : this.getLabel('Non trouvé');
  }
}