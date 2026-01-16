import { ChangeDetectorRef, Component, inject, NgZone, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormationService } from '../service/formation-service';
import { TranslationService } from '../service/translation.service';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface Formation {
  id_formation: number;
  intitule: string;
  type: string;
  axe: string;
  niveau: string;
  population?: string;
  interne_externe?: 'interne' | 'externe';
  etat: 'en_attente' | 'validee' | 'refusee';
  description?: string;
  duree?: string;
  prerequis?: string;
  objectifs?: string[];
  competences?: string[];
  id_formateur?: number;
  formateur?: string;
  prestataire?: string;
  parcours?: string;
  axe_code?: string;
  pays?: Array<{ id_pays: number; nom: string }>;
}

@Component({
  selector: 'app-formation-historique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formation-historique.html',
  styleUrls: ['./formation-historique.css']
})
export class FormationHistorique implements OnInit, OnDestroy {
  formations: Formation[] = [];
  formationsTranslated: Formation[] = [];
  selectedFormation: Formation | null = null;
  selectedFormationTranslated: Formation | null = null;
  editFormationTranslated: Formation | null = null;

  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private translationService = inject(TranslationService);
  private langSub!: Subscription;

  currentLang: string = 'fr';
  isTranslating: boolean = false;

  selectedPaysIds: number[] = [];
  detailModalOpen = false;
  updateModalOpen = false;
  deleteModalOpen = false;

  formateurs: { id_user: number; nom: string; prenom: string }[] = [];
  paysList: { id_pays: number; nom: string }[] = [];
  selectedEtat: 'en_attente' | 'validee' | 'refusee' = 'en_attente';
  loading = false;

  editObjectifsInput: string[] = [];
  editCompetencesInput: string[] = [];
  editObjectifsInputTranslated: string[] = [];
  editCompetencesInputTranslated: string[] = [];
  editDureeNumber = 1;
  editDureeUnit = 'jours';

  objectifs: any[] = [];
  competences: any[] = [];

  constructor(
    private formationsService: FormationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.ngZone.run(() => {
      this.loadFormations();
      this.loadFormateurs();
      this.loadPays();
      this.loadObjectifs();
      this.loadCompetences();

      this.currentLang = this.translationService.getCurrentLanguage();

      this.langSub = this.translationService.getLanguage().subscribe(lang => {
        this.ngZone.run(() => {
          console.log(`🌍 Language changed to: ${lang}`);
          this.currentLang = lang;
          this.translateAllFormations();
          
          if (this.detailModalOpen && this.selectedFormation) {
            this.translateSelectedFormation();
          }
          
          if (this.updateModalOpen && this.selectedFormation) {
            this.translateEditFormation();
          }
          
          this.cdr.markForCheck();
        });
      });
    });
  }

  ngOnDestroy(): void {
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
  }

  /* ===================== TRADUCTION ===================== */

  async translateAllFormations(): Promise<void> {
    if (this.currentLang === 'fr' || this.formations.length === 0) {
      this.ngZone.run(() => {
        this.formationsTranslated = [...this.formations];
        this.cdr.detectChanges();
      });
      return;
    }

    this.ngZone.run(() => {
      this.isTranslating = true;
      this.cdr.detectChanges();
    });

    console.log(`🚀 Translating ${this.formations.length} formations to ${this.currentLang}`);

    try {
      const textsToTranslate: string[] = [];
      const indexMap: { formationIndex: number; field: string; subIndex?: number }[] = [];

      this.formations.forEach((formation, fIndex) => {
        const simpleFields = ['intitule', 'type', 'axe', 'niveau', 'population', 'interne_externe', 'etat', 'description', 'prerequis'];
        
        simpleFields.forEach(field => {
          const value = (formation as any)[field];
          if (value && typeof value === 'string' && value.trim() !== '') {
            textsToTranslate.push(value);
            indexMap.push({ formationIndex: fIndex, field });
          }
        });

        if (formation.objectifs && Array.isArray(formation.objectifs)) {
          formation.objectifs.forEach((obj, objIndex) => {
            if (obj && obj.trim() !== '') {
              textsToTranslate.push(obj);
              indexMap.push({ formationIndex: fIndex, field: 'objectifs', subIndex: objIndex });
            }
          });
        }

        if (formation.competences && Array.isArray(formation.competences)) {
          formation.competences.forEach((comp, compIndex) => {
            if (comp && comp.trim() !== '') {
              textsToTranslate.push(comp);
              indexMap.push({ formationIndex: fIndex, field: 'competences', subIndex: compIndex });
            }
          });
        }
      });

      console.log(`📦 Total texts to translate: ${textsToTranslate.length}`);

      if (textsToTranslate.length === 0) {
        this.ngZone.run(() => {
          this.formationsTranslated = [...this.formations];
          this.isTranslating = false;
          this.cdr.detectChanges();
        });
        return;
      }

      const startTime = Date.now();
      const translations = await this.translationService.translateBatchOptimized(
        textsToTranslate,
        this.currentLang
      );
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Translation complete in ${duration}s`);

      this.ngZone.run(() => {
        this.formationsTranslated = JSON.parse(JSON.stringify(this.formations));

        translations.forEach((translatedText, i) => {
          const mapping = indexMap[i];
          const formation = this.formationsTranslated[mapping.formationIndex];

          if (mapping.subIndex !== undefined) {
            if (mapping.field === 'objectifs') {
              formation.objectifs![mapping.subIndex] = translatedText;
            } else if (mapping.field === 'competences') {
              formation.competences![mapping.subIndex] = translatedText;
            }
          } else {
            (formation as any)[mapping.field] = translatedText;
          }
        });

        this.isTranslating = false;
        this.cdr.detectChanges();
      });

    } catch (error) {
      console.error('❌ Translation error:', error);
      this.ngZone.run(() => {
        this.formationsTranslated = [...this.formations];
        this.isTranslating = false;
        this.cdr.detectChanges();
      });
    }
  }

  async translateSelectedFormation(): Promise<void> {
    if (this.currentLang === 'fr' || !this.selectedFormation) {
      this.ngZone.run(() => {
        this.selectedFormationTranslated = this.selectedFormation;
        this.cdr.detectChanges();
      });
      return;
    }

    try {
      const textsToTranslate: string[] = [];
      const indexMap: { field: string; subIndex?: number }[] = [];

      const simpleFields = ['intitule', 'type', 'axe', 'niveau', 'population', 'interne_externe', 'etat', 'description', 'prerequis'];
      simpleFields.forEach(field => {
        const value = (this.selectedFormation as any)[field];
        if (value && typeof value === 'string' && value.trim() !== '') {
          textsToTranslate.push(value);
          indexMap.push({ field });
        }
      });

      if (this.selectedFormation.objectifs && Array.isArray(this.selectedFormation.objectifs)) {
        this.selectedFormation.objectifs.forEach((obj, objIndex) => {
          if (obj && obj.trim() !== '') {
            textsToTranslate.push(obj);
            indexMap.push({ field: 'objectifs', subIndex: objIndex });
          }
        });
      }

      if (this.selectedFormation.competences && Array.isArray(this.selectedFormation.competences)) {
        this.selectedFormation.competences.forEach((comp, compIndex) => {
          if (comp && comp.trim() !== '') {
            textsToTranslate.push(comp);
            indexMap.push({ field: 'competences', subIndex: compIndex });
          }
        });
      }

      if (textsToTranslate.length === 0) {
        this.ngZone.run(() => {
          this.selectedFormationTranslated = this.selectedFormation;
          this.cdr.detectChanges();
        });
        return;
      }

      const translations = await this.translationService.translateBatchOptimized(
        textsToTranslate,
        this.currentLang
      );

      this.ngZone.run(() => {
        this.selectedFormationTranslated = JSON.parse(JSON.stringify(this.selectedFormation));

        translations.forEach((translatedText, i) => {
          const mapping = indexMap[i];

          if (mapping.subIndex !== undefined) {
            if (mapping.field === 'objectifs') {
              this.selectedFormationTranslated!.objectifs![mapping.subIndex] = translatedText;
            } else if (mapping.field === 'competences') {
              this.selectedFormationTranslated!.competences![mapping.subIndex] = translatedText;
            }
          } else {
            (this.selectedFormationTranslated as any)[mapping.field] = translatedText;
          }
        });

        this.cdr.detectChanges();
      });

    } catch (error) {
      console.error('❌ Translation error:', error);
      this.ngZone.run(() => {
        this.selectedFormationTranslated = this.selectedFormation;
        this.cdr.detectChanges();
      });
    }
  }

  async translateEditFormation(): Promise<void> {
    if (this.currentLang === 'fr' || !this.selectedFormation) {
      this.ngZone.run(() => {
        this.editFormationTranslated = this.selectedFormation;
        this.editObjectifsInputTranslated = [...this.editObjectifsInput];
        this.editCompetencesInputTranslated = [...this.editCompetencesInput];
        this.cdr.detectChanges();
      });
      return;
    }

    try {
      const textsToTranslate: string[] = [];
      const indexMap: { type: 'field' | 'objectif' | 'competence'; index?: number; field?: string }[] = [];

      const simpleFields = ['intitule', 'type', 'prerequis', 'population'];
      simpleFields.forEach(field => {
        const value = (this.selectedFormation as any)[field];
        if (value && typeof value === 'string' && value.trim() !== '') {
          textsToTranslate.push(value);
          indexMap.push({ type: 'field', field });
        }
      });

      this.editObjectifsInput.forEach((obj, index) => {
        if (obj && obj.trim() !== '') {
          textsToTranslate.push(obj);
          indexMap.push({ type: 'objectif', index });
        }
      });

      this.editCompetencesInput.forEach((comp, index) => {
        if (comp && comp.trim() !== '') {
          textsToTranslate.push(comp);
          indexMap.push({ type: 'competence', index });
        }
      });

      if (textsToTranslate.length === 0) {
        this.ngZone.run(() => {
          this.editFormationTranslated = this.selectedFormation;
          this.editObjectifsInputTranslated = [...this.editObjectifsInput];
          this.editCompetencesInputTranslated = [...this.editCompetencesInput];
          this.cdr.detectChanges();
        });
        return;
      }

      const translations = await this.translationService.translateBatchOptimized(
        textsToTranslate,
        this.currentLang
      );

      this.ngZone.run(() => {
        this.editFormationTranslated = JSON.parse(JSON.stringify(this.selectedFormation));
        this.editObjectifsInputTranslated = [...this.editObjectifsInput];
        this.editCompetencesInputTranslated = [...this.editCompetencesInput];

        translations.forEach((translatedText, i) => {
          const mapping = indexMap[i];

          if (mapping.type === 'field' && mapping.field) {
            (this.editFormationTranslated as any)[mapping.field] = translatedText;
          } else if (mapping.type === 'objectif' && mapping.index !== undefined) {
            this.editObjectifsInputTranslated[mapping.index] = translatedText;
          } else if (mapping.type === 'competence' && mapping.index !== undefined) {
            this.editCompetencesInputTranslated[mapping.index] = translatedText;
          }
        });

        this.cdr.detectChanges();
      });

    } catch (error) {
      console.error('❌ Translation error for edit:', error);
      this.ngZone.run(() => {
        this.editFormationTranslated = this.selectedFormation;
        this.editObjectifsInputTranslated = [...this.editObjectifsInput];
        this.editCompetencesInputTranslated = [...this.editCompetencesInput];
        this.cdr.detectChanges();
      });
    }
  }

  syncTranslatedInput(field: string, value: string): void {
    this.ngZone.run(() => {
      if (this.selectedFormation) {
        (this.selectedFormation as any)[field] = value;
        if (this.editFormationTranslated) {
          (this.editFormationTranslated as any)[field] = value;
        }
      }
      this.cdr.markForCheck();
    });
  }

  syncObjectifInput(index: number, value: string): void {
    this.ngZone.run(() => {
      this.editObjectifsInput[index] = value;
      this.editObjectifsInputTranslated[index] = value;
      this.cdr.markForCheck();
    });
  }

  syncCompetenceInput(index: number, value: string): void {
    this.ngZone.run(() => {
      this.editCompetencesInput[index] = value;
      this.editCompetencesInputTranslated[index] = value;
      this.cdr.markForCheck();
    });
  }

  getLabel(frLabel: string): string {
    if (this.currentLang === 'fr') {
      return frLabel;
    }

    const translations: { [key: string]: string } = {
      'Historique des formations': 'Training History',
      'En attente': 'Pending',
      'Validées': 'Validated',
      'Refusées': 'Rejected',
      'Aucune formation trouvée': 'No trainings found',
      'Intitulé': 'Title',
      'Axe': 'Area',
      'Niveau': 'Level',
      'Population': 'Population',
      'Type': 'Type',
      'État': 'Status',
      'Non spécifié': 'Not specified',
      'Non défini': 'Not defined',
      'en_attente': 'pending',
      'validee': 'validated',
      'refusee': 'rejected',
      'Détails de la formation': 'Training Details',
      'Informations générales': 'General Information',
      'Durée': 'Duration',
      'Description': 'Description',
      'Objectifs pédagogiques': 'Learning Objectives',
      'Compétences visées': 'Target Skills',
      'prerequis': 'prerequisites',
      '✏️ Modifier': '✏️ Edit',
      '🗑️ Supprimer': '🗑️ Delete',
      'Modifier la formation': 'Edit Training',
      'Niveau :': 'Level:',
      'Type :': 'Type:',
      'Intitulé :': 'Title:',
      'Population :': 'Population:',
      'Axe :': 'Area:',
      'Interne / Externe :': 'Internal / External:',
      'Prestataire :': 'Provider:',
      'Formateur interne :': 'Internal Trainer:',
      'Parcours :': 'Path:',
      'Pays :': 'Country:',
      'Durée :': 'Duration:',
      'Prérequis :': 'Prerequisites:',
      'Objectifs :': 'Objectives:',
      'Compétences :': 'Skills:',
      'Sélectionnez...': 'Select...',
      'Sélectionnez un formateur': 'Select a trainer',
      'Débutant': 'Beginner',
      'Intermédiaire': 'Intermediate',
      'Avancé': 'Advanced',
      'Senior': 'Senior',
      'Expert': 'Expert',
      'Technique': 'Technical',
      'Fonctionnelle': 'Functional',
      'Métier': 'Business',
      'Onboarding': 'Onboarding',
      'Solutions': 'Solutions',
      'Linguistique': 'Language',
      'Transversale': 'Cross-functional',
      'Interne': 'Internal',
      'Externe': 'External',
      'Jours': 'Days',
      'Heures': 'Hours',
      'jours': 'days',
      'heures': 'hours',
      '+ Ajouter un objectif': '+ Add Objective',
      '+ Ajouter une compétence': '+ Add Skill',
      'Mettre à jour': 'Update',
      'Annuler': 'Cancel',
      'Confirmer la suppression': 'Confirm Deletion',
      'Êtes-vous sûr de vouloir supprimer cette formation ? Cette action est irréversible.': 'Are you sure you want to delete this training? This action is irreversible.',
      'Supprimer': 'Delete',
      'Confirmer la modification': 'Confirm Modification',
      'Êtes-vous sûr de vouloir modifier cette formation ?': 'Are you sure you want to modify this training?',
      'Oui, modifier': 'Yes, modify',
      'Oui, supprimer': 'Yes, delete',
      'Formation mise à jour': 'Training Updated',
      'Les modifications ont été enregistrées avec succès.': 'Changes have been saved successfully.',
      'Supprimée !': 'Deleted!',
      'La formation a été supprimée.': 'Training has been deleted.',
      'Erreur': 'Error',
      'Impossible de mettre à jour la formation. Veuillez réessayer.': 'Unable to update training. Please try again.',
      'Impossible de supprimer la formation.': 'Unable to delete training.',
      'Problème lors de la résolution des objectifs ou compétences.': 'Problem resolving objectives or skills.',
      'Impossible de charger les formateurs': 'Unable to load trainers',
      'Impossible de charger les pays': 'Unable to load countries',
      'Non authentifié': 'Not authenticated',
      'Vous devez être connecté pour voir les formations.': 'You must be logged in to view trainings.',
      'Impossible de charger les formations.': 'Unable to load trainings.',
      'Traduction en cours...': 'Translation in progress...',
      'Cette formation est validée et ne peut plus être modifiée ou supprimée.': 'This training is validated and can no longer be modified or deleted.'
    };

    return translations[frLabel] || frLabel;
  }

  getDisplayedFormations(): Formation[] {
    return this.currentLang === 'fr' ? this.formations : this.formationsTranslated;
  }

  getDisplayedSelectedFormation(): Formation | null {
    return this.currentLang === 'fr' ? this.selectedFormation : this.selectedFormationTranslated;
  }

  getDisplayedEditFormation(): Formation | null {
    return this.currentLang === 'fr' ? this.selectedFormation : this.editFormationTranslated;
  }

  getDisplayedObjectifsInput(): string[] {
    return this.currentLang === 'fr' ? this.editObjectifsInput : this.editObjectifsInputTranslated;
  }

  getDisplayedCompetencesInput(): string[] {
    return this.currentLang === 'fr' ? this.editCompetencesInput : this.editCompetencesInputTranslated;
  }

  /* ===================== CHARGEMENT DES DONNÉES ===================== */

  loadFormateurs(): void {
    this.formationsService.loadFormateurs().subscribe({
      next: (data: any[]) => {
        this.ngZone.run(() => {
          this.formateurs = data;
          console.log('✅ Formateurs loaded:', this.formateurs);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('❌ Erreur chargement formateurs', err);
          Swal.fire(this.getLabel('Erreur'), this.getLabel('Impossible de charger les formateurs'), 'error');
        });
      }
    });
  }

  loadPays(): void {
    this.formationsService.getPays().subscribe({
      next: (data: any[]) => {
        this.ngZone.run(() => {
          this.paysList = data;
          console.log('✅ Pays loaded:', this.paysList);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('❌ Erreur chargement pays', err);
          Swal.fire(this.getLabel('Erreur'), this.getLabel('Impossible de charger les pays'), 'error');
        });
      }
    });
  }

  loadFormations(): void {
    this.ngZone.run(() => {
      this.loading = true;
      this.cdr.detectChanges();
    });

    let token: string | null = null;

    if (isPlatformBrowser(this.platformId)) {
      token = localStorage.getItem('token');
    }

    if (!token) {
      this.ngZone.run(() => {
        Swal.fire(
          this.getLabel('Non authentifié'),
          this.getLabel('Vous devez être connecté pour voir les formations.'),
          'warning'
        );
        this.loading = false;
        this.cdr.detectChanges();
      });
      return;
    }

    this.formationsService.getFormationsByFormateur(this.selectedEtat)
      .subscribe({
        next: async (data) => {
          this.ngZone.run(() => {
            this.formations = data;
            // Afficher immédiatement les données originales
            this.formationsTranslated = [...data];
            this.loading = false;
            this.cdr.detectChanges();
          });
          
          // Traduire en arrière-plan si nécessaire
          if (this.currentLang !== 'fr') {
            await this.translateAllFormations();
          }
        },
        error: () => {
          this.ngZone.run(() => {
            this.loading = false;
            Swal.fire(
              this.getLabel('Erreur'),
              this.getLabel('Impossible de charger les formations.'),
              'error'
            );
            this.cdr.detectChanges();
          });
        }
      });
  }

  loadObjectifs(): void {
    this.formationsService.getObjectifs().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.objectifs = data;
          console.log('✅ Objectifs loaded:', this.objectifs);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('❌ Error loading objectifs:', err);
      }
    });
  }

  loadCompetences(): void {
    this.formationsService.getCompetences().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.competences = data;
          console.log('✅ Competences loaded:', this.competences);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('❌ Error loading competences:', err);
      }
    });
  }

  changeEtat(etat: 'en_attente' | 'validee' | 'refusee'): void {
    this.ngZone.run(() => {
      this.selectedEtat = etat;
      this.loadFormations();
    });
  }

  trackFormation(index: number, formation: Formation): number {
    return formation.id_formation;
  }

  /* ===================== MODALS ===================== */

  openDetailModal(formation: Formation): void {
    this.ngZone.run(() => {
      const original = this.formations.find(f => f.id_formation === formation.id_formation);
      if (!original) return;

      this.selectedFormation = { ...original };
      this.selectedFormationTranslated = { ...original }; // Afficher immédiatement
      
      if (original.parcours === 'OnBoarding' && original.pays) {
        this.selectedPaysIds = original.pays.map(p => p.id_pays);
      } else {
        this.selectedPaysIds = [];
      }
      
      this.editObjectifsInput = [...(original.objectifs || [''])];
      this.editCompetencesInput = [...(original.competences || [''])];
      
      const [number, unit] = this.parseDuration(original.duree || '1 jours');
      this.editDureeNumber = number;
      this.editDureeUnit = unit;
      
      this.detailModalOpen = true;
      this.cdr.detectChanges();
      
      // Traduire en arrière-plan si nécessaire
      if (this.currentLang !== 'fr') {
        this.translateSelectedFormation();
      }
    });
  }

  closeDetailModal(): void {
    this.ngZone.run(() => {
      this.detailModalOpen = false;
      this.selectedFormation = null;
      this.selectedFormationTranslated = null;
      this.editFormationTranslated = null;
      this.selectedPaysIds = [];
      this.cdr.detectChanges();
    });
  }

  openUpdateModal(): void {
    this.ngZone.run(() => {
      if (!this.selectedFormation) return;
      
      // Afficher immédiatement les données originales
      this.editFormationTranslated = { ...this.selectedFormation };
      this.editObjectifsInputTranslated = [...this.editObjectifsInput];
      this.editCompetencesInputTranslated = [...this.editCompetencesInput];
      
      if (this.selectedFormation.parcours === 'OnBoarding' && this.selectedFormation.pays) {
        this.selectedPaysIds = this.selectedFormation.pays.map(p => p.id_pays);
      }
      
      this.updateModalOpen = true;
      this.cdr.detectChanges();
      
      // Traduire en arrière-plan si nécessaire
      if (this.currentLang !== 'fr') {
        this.translateEditFormation();
      }
    });
  }

  closeUpdateModal(): void {
    this.ngZone.run(() => {
      this.updateModalOpen = false;
      this.cdr.detectChanges();
    });
  }

  async confirmUpdate(): Promise<void> {
    if (!this.selectedFormation) return;

    try {
      const objectifIds = await this.resolveIds(
        this.editObjectifsInput,
        this.objectifs || [],
        'objectif',
        'id_objectif'
      );

      const competenceIds = await this.resolveIds(
        this.editCompetencesInput,
        this.competences || [],
        'competence',
        'id_competence'
      );

      const payload: any = {
        ...this.selectedFormation,
        duree: this.editDureeNumber
          ? `${this.editDureeNumber} ${this.editDureeUnit}`
          : null,
        objectifs: objectifIds,
        competences: competenceIds,
        pays_ids: this.selectedFormation.parcours === 'OnBoarding' ? this.selectedPaysIds : []
      };

      delete payload.pays;

      const result = await Swal.fire({
        title: this.getLabel('Confirmer la modification'),
        text: this.getLabel('Êtes-vous sûr de vouloir modifier cette formation ?'),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: this.getLabel('Oui, modifier'),
        cancelButtonText: this.getLabel('Annuler'),
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
      });

      if (!result.isConfirmed) return;

      let token = '';
      if (isPlatformBrowser(this.platformId)) {
        token = localStorage.getItem('token') || '';
      }
      
      this.formationsService.updateFormation(
        this.selectedFormation.id_formation,
        payload,
        token
      ).subscribe({
        next: () => {
          this.ngZone.run(() => {
            Swal.fire({
              icon: 'success',
              title: this.getLabel('Formation mise à jour'),
              text: this.getLabel('Les modifications ont été enregistrées avec succès.'),
              timer: 1800,
              showConfirmButton: false
            });

            this.loadFormations();
            this.closeUpdateModal();
            this.closeDetailModal();
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('❌ Erreur modification formation:', err);
            
            Swal.fire({
              icon: 'error',
              title: this.getLabel('Erreur'),
              text: this.getLabel('Impossible de mettre à jour la formation. Veuillez réessayer.'),
              confirmButtonColor: '#d33'
            });
          });
        }
      });

    } catch (error) {
      this.ngZone.run(() => {
        console.error('❌ Erreur interne:', error);
        
        Swal.fire({
          icon: 'error',
          title: this.getLabel('Erreur'),
          text: this.getLabel('Problème lors de la résolution des objectifs ou compétences.')
        });
      });
    }
  }

  private async resolveIds(
    inputArray: string[],
    existingList: any[],
    entityName: string,
    idField: string
  ): Promise<number[]> {
    const ids: number[] = [];
    
    for (const item of inputArray) {
      const trimmed = item.trim();
      if (!trimmed) continue;

      const existing = existingList.find(
        (e) => e[entityName]?.toLowerCase() === trimmed.toLowerCase()
      );

      if (existing) {
        ids.push(existing[idField]);
      } else {
        const newId = await this.createNewItem(entityName, trimmed);
        if (newId) {
          ids.push(newId);
        }
      }
    }

    return ids;
  }

  private createNewItem(entityName: string, value: string): Promise<number | null> {
    return new Promise((resolve, reject) => {
      const endpoint = entityName === 'objectif' 
        ? 'http://localhost:3000/api/objectif'
        : 'http://localhost:3000/api/competence';

      const payload = { libelle: value };

      this.formationsService.createItem(endpoint, payload).subscribe({
        next: (response: any) => {
          this.ngZone.run(() => {
            const newId = response.id || response[`id_${entityName}`] || response.insertId;
            resolve(newId);
          });
        },
        error: (err) => {
          console.error(`❌ Error creating ${entityName}:`, err);
          reject(err);
        }
      });
    });
  }

  openDeleteModal(): void {
    this.ngZone.run(() => {
      this.deleteModalOpen = true;
      this.cdr.detectChanges();
    });
  }

  closeDeleteModal(): void {
    this.ngZone.run(() => {
      this.deleteModalOpen = false;
      this.cdr.detectChanges();
    });
  }

  confirmDelete(): void {
    if (!this.selectedFormation) return;

    Swal.fire({
      title: this.getLabel('Confirmer la suppression'),
      text: this.getLabel('Êtes-vous sûr de vouloir supprimer cette formation ? Cette action est irréversible.'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.getLabel('Oui, supprimer'),
      cancelButtonText: this.getLabel('Annuler'),
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed && this.selectedFormation) {
        let token = '';
        if (isPlatformBrowser(this.platformId)) {
          token = localStorage.getItem('token') || '';
        }
        this.formationsService.deleteFormation(this.selectedFormation.id_formation, token)
          .subscribe({
            next: () => {
              this.ngZone.run(() => {
                Swal.fire(
                  this.getLabel('Supprimée !'), 
                  this.getLabel('La formation a été supprimée.'), 
                  'success'
                );
                this.closeDeleteModal();
                this.closeDetailModal();
                this.loadFormations();
              });
            },
            error: (err) => {
              this.ngZone.run(() => {
                console.error('❌ Erreur suppression formation:', err);
                Swal.fire(
                  this.getLabel('Erreur'), 
                  this.getLabel('Impossible de supprimer la formation.'), 
                  'error'
                );
              });
            }
          });
      }
    });
  }

  /* ===================== HELPERS ===================== */

  isPaysSelected(paysId: number): boolean {
    return this.selectedPaysIds.includes(paysId);
  }

  togglePays(paysId: number): void {
    this.ngZone.run(() => {
      const index = this.selectedPaysIds.indexOf(paysId);
      if (index > -1) {
        this.selectedPaysIds.splice(index, 1);
      } else {
        this.selectedPaysIds.push(paysId);
      }
      this.cdr.markForCheck();
    });
  }

  addEditObjectifInput(): void {
    this.ngZone.run(() => {
      this.editObjectifsInput.push('');
      this.editObjectifsInputTranslated.push('');
      this.cdr.markForCheck();
    });
  }

  addEditCompetenceInput(): void {
    this.ngZone.run(() => {
      this.editCompetencesInput.push('');
      this.editCompetencesInputTranslated.push('');
      this.cdr.markForCheck();
    });
  }

  parseDuration(duree: string): [number, string] {
    const match = duree.match(/(\d+)\s*(jours?|heures?)/i);
    if (match) {
      const num = parseInt(match[1]);
      let unit = match[2].toLowerCase();
      if (unit === 'jour') unit = 'jours';
      if (unit === 'heure') unit = 'heures';
      return [num, unit];
    }
    return [1, 'jours'];
  }
}