import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';

import { FormationService } from '../service/formation-service';
import { Formation, Pays } from '../model/formation.model';
import { FormationForm } from '../model/FormationForm.model';
import { TranslationService } from '../service/translation.service';

@Component({
  selector: 'app-formateur-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formateur-component.html',
  styleUrls: ['./formateur-component.css']
})
export class FormateurComponent implements OnInit, OnDestroy {

  formateurs: { id_user: number; nom: string; prenom: string }[] = [];
  paysList: { id_pays: number; nom: string }[] = [];
  newFormation: FormationForm = this.createEmptyForm();
 pays: number[] = [];
 
  
  // ✅ NOUVEAU : Informations du formateur connecté
  currentUserId: number = 0;
  currentUserName: string = '';
  
  // Guide
  guideOpen: boolean = false;
  currentGuideStep: number = 1;
  totalGuideSteps: number = 6;
  
  // Traduction
  private translationService = inject(TranslationService);
  private langSub!: Subscription;
  currentLang: string = 'fr';

  constructor(private formationService: FormationService) {}

  ngOnInit(): void {
    // ✅ NOUVEAU : Récupérer l'ID du formateur connecté
    this.loadCurrentUser();
    
    this.loadFormateurs();
    this.loadPays();
    
    // Récupérer la langue actuelle
    this.currentLang = this.translationService.getCurrentLanguage();
    
    // S'abonner aux changements de langue
    this.langSub = this.translationService.getLanguage().subscribe(lang => {
      this.currentLang = lang;
    });

    // Vérifier si l'utilisateur a déjà vu le guide
    const hasSeenGuide = sessionStorage.getItem('formateurGuideCompleted');
    
    if (!hasSeenGuide) {
      this.guideOpen = true;
    }
  }

  ngOnDestroy(): void {
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
  }

  // ✅ NOUVELLE MÉTHODE : Charger les informations du formateur connecté
  loadCurrentUser(): void {
    const userId = sessionStorage.getItem('userId');
    const userName = sessionStorage.getItem('userName');
    const userPrenom = sessionStorage.getItem('userPrenom');
    
    if (userId) {
      this.currentUserId = parseInt(userId, 10);
      this.currentUserName = `${userName || ''} ${userPrenom || ''}`.trim();
      
      // ✅ Pré-remplir automatiquement le formateur dans le formulaire
      this.newFormation.id_formateur = this.currentUserId;
    }
  }

  // ==================== MÉTHODES DU GUIDE ====================
  
  openGuide(): void {
    this.guideOpen = true;
    this.currentGuideStep = 1;
  }
  
  closeGuide(): void {
    this.guideOpen = false;
    sessionStorage.setItem('formateurGuideCompleted', 'true');
    this.currentGuideStep = 1;
  }
  
  nextStep(): void {
    if (this.currentGuideStep < this.totalGuideSteps) {
      this.currentGuideStep++;
    }
  }
  
  previousStep(): void {
    if (this.currentGuideStep > 1) {
      this.currentGuideStep--;
    }
  }

  getLabel(frLabel: string): string {
    if (this.currentLang === 'fr') {
      return frLabel;
    }

    const translations: { [key: string]: string } = {
      'Informations Générales': 'General Information',
      'Type de Formation': 'Training Type',
      'Objectifs *': 'Objectives *',
      'Compétences *': 'Skills *',
      'Prérequis *': 'Prerequisites *',
      'Intitulé de la formation *': 'Training Title *',
      'Population cible *': 'Target Population *',
      'Axe *': 'Area *',
      'Niveau *': 'Level *',
      'Parcours': 'Path',
      'Pays :': 'Country:',
      'Pays': 'Country',
      'Durée': 'Duration',
      'Interne  *': 'Internal  *',
      'Interne / Externe *': 'Internal / External *',
      'Formateur interne *': 'Internal Trainer *',
      'Prestataire *': 'Provider *',
      'Ex: Formation Angular avancé': 'Ex: Advanced Angular Training',
      'Ex: Développeurs, Consultants...': 'Ex: Developers, Consultants...',
      'Sélectionnez...': 'Select...',
      'Sélectionner un formateur': 'Select a trainer',
      'Ex: 2 jours, 14 heures...': 'Ex: 2 days, 14 hours...',
      'Nom du prestataire': 'Provider name',
      'Saisir un objectif': 'Enter an objective',
      'Saisir une compétence': 'Enter a skill',
      'Décrivez les prérequis nécessaires pour cette formation...': 'Describe the prerequisites for this training...',
      'Technique': 'Technical',
      'Fonctionnelle': 'Functional',
      'Métier': 'Business',
      'Onboarding': 'Onboarding',
      'Solutions': 'Solutions',
      'Linguistique': 'Language',
      'Transversale': 'Transversal',
      'Débutant': 'Beginner',
      'Intermédiaire': 'Intermediate',
      'Avancé': 'Advanced',
      'Senior': 'Senior',
      'Expert': 'Expert',
      'Interne': 'Internal',
      'Externe': 'External',
      '+ Ajouter un objectif': '+ Add Objective',
      '+ Ajouter une compétence': '+ Add Skill',
      'Réinitialiser': 'Reset',
      'Ajouter la formation': 'Add Training',
      'Supprimer cet objectif': 'Remove this objective',
      'Supprimer cette compétence': 'Remove this skill',
      'Aide': 'Help',
      'Succès': 'Success',
      'Formation ajoutée': 'Training added',
      'Erreur': 'Error',
      'Échec lors de l\'ajout': 'Failed to add',
      'Impossible de charger les formateurs': 'Unable to load trainers',
      'Guide d\'utilisation': 'User Guide',
      'Gestion des formations - Formateur': 'Training Management - Trainer',
      'Bienvenue dans l\'espace Formateur': 'Welcome to the Trainer Space',
      'Créer une formation': 'Create a Training',
      'Statuts de validation': 'Validation Statuses',
      'Modifier ou supprimer': 'Edit or Delete',
      'Consulter l\'historique': 'View History',
      'Bonnes pratiques': 'Best Practices',
      'En tant que formateur, vous pouvez créer et proposer des formations. Toute formation créée sera soumise à validation par l\'administrateur.': 
        'As a trainer, you can create and propose training courses. All created training will be submitted for validation by the administrator.',
      'Astuce : Toutes vos formations nécessitent une validation administrative': 
        'Tip: All your training courses require administrative validation',
      'Ajouter une formation': 'Add Training',
      'Remplissez le formulaire pour créer une nouvelle formation.': 
        'Fill out the form to create a new training.',
      'Votre formation sera mise en attente de validation.': 
        'Your training will be put on hold for validation.',
      'Plus votre formation est détaillée, plus elle a de chances d\'être validée rapidement': 
        'The more detailed your training is, the more likely it is to be validated quickly',
      'En attente': 'Pending',
      'Validée': 'Validated',
      'Refusée': 'Rejected',
      'Vos formations peuvent avoir 3 statuts différents :': 
        'Your training courses can have 3 different statuses:',
      'Formation soumise, en attente de validation par l\'administrateur': 
        'Training submitted, pending validation by administrator',
      'Formation approuvée et publiée par l\'administrateur': 
        'Training approved and published by administrator',
      'Formation non approuvée. Vous pouvez la modifier et la resoumettre': 
        'Training not approved. You can modify and resubmit it',
      'Le délai de validation dépend de la disponibilité de l\'administrateur': 
        'The validation time depends on the administrator\'s availability',
      'Limitation importante': 'Important Limitation',
      'Vous pouvez modifier ou supprimer uniquement les formations ayant le statut :': 
        'You can only edit or delete training courses with the status:',
      'Les formations Validées ne peuvent plus être modifiées.': 
        'Validated training courses can no longer be modified.',
      'Les formations validées sont protégées pour garantir leur intégrité': 
        'Validated training courses are protected to ensure their integrity',
      'Voir toutes vos formations': 'View All Your Training',
      'Dans le tableau, vous pouvez consulter l\'historique complet :': 
        'In the table, you can view the complete history:',
      'Formations en attente de validation': 'Training pending validation',
      'Formations validées et publiées': 'Validated and published training',
      'Formations refusées avec raison du refus': 'Rejected training with reason for rejection',
      'Utilisez les filtres pour trier par statut': 'Use filters to sort by status',
      'Consultez régulièrement l\'historique pour suivre l\'évolution de vos formations': 
        'Check the history regularly to track the progress of your training courses',
      'Objectifs clairs': 'Clear Objectives',
      'Définissez des objectifs pédagogiques précis et mesurables': 
        'Define precise and measurable learning objectives',
      'Compétences associées': 'Associated Skills',
      'Listez les compétences que les participants vont acquérir': 
        'List the skills participants will acquire',
      'Informations complètes': 'Complete Information',
      'Renseignez tous les champs (durée, prérequis, population cible)': 
        'Fill in all fields (duration, prerequisites, target population)',
      'Vérification': 'Verification',
      'Relisez votre formation pour éviter les refus': 
        'Review your training to avoid rejections',
      'Une formation bien préparée a plus de chances d\'être validée du premier coup': 
        'A well-prepared training course is more likely to be validated on the first try',
      'Précédent': 'Previous',
      'Suivant': 'Next',
      'Commencer': 'Start'
    };

    return translations[frLabel] || frLabel;
  }

  getAxeOptions() {
    return [
      { value: '', label: this.getLabel('Sélectionnez...') },
      { value: 'Technique', label: this.getLabel('Technique') },
      { value: 'Fonctionnelle', label: this.getLabel('Fonctionnelle') },
      { value: 'Métier', label: this.getLabel('Métier') },
      { value: 'Onboarding', label: this.getLabel('Onboarding') },
      { value: 'Solutions', label: this.getLabel('Solutions') },
      { value: 'Linguistique', label: this.getLabel('Linguistique') },
      { value: 'Transversale', label: this.getLabel('Transversale') }
    ];
  }

  getNiveauOptions() {
    return [
      { value: 'débutant', label: this.getLabel('Débutant') },
      { value: 'intermédiaire', label: this.getLabel('Intermédiaire') },
      { value: 'avancé', label: this.getLabel('Avancé') },
      { value: 'senior', label: this.getLabel('Senior') },
      { value: 'expert', label: this.getLabel('Expert') }
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

  getInterneExterneOptions() {
    return [
      { value: 'interne', label: this.getLabel('Interne') }
    ];
  }

  private createEmptyForm(): FormationForm {
    return {
      intitule: '',
      type: 'Formation',
      population: '',
      niveau: '',
      prerequis: '',
      duree: '',
      axe: '',
      parcours: '',
 pays: [],
       interne_externe: 'interne',
      objectifs: [''],
      competences: ['']
    };
  }

  loadFormateurs(): void {
    this.formationService.loadFormateurs().subscribe({
      next: (data: any[]) => {
        this.formateurs = data;
      },
      error: (err) => {
        console.error('Erreur chargement formateurs', err);
        Swal.fire(
          this.getLabel('Erreur'), 
          this.getLabel('Impossible de charger les formateurs'), 
          'error'
        );
      }
    });
  }

  isNewPaysSelected(paysId: number): boolean {
    return this.newFormation.pays?.includes(paysId) || false;
  }

  loadPays(): void {
    this.formationService.getPays().subscribe({
      next: data => this.paysList = data,
      error: err => console.error(err)
    });
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

  onInterneExterneChange(): void {
    if (this.newFormation.interne_externe === 'interne') {
      delete this.newFormation.prestataire;
    } else {
      delete this.newFormation.id_formateur;
    }
  }

  addObjectif(): void {
    this.newFormation.objectifs.push('');
  }

  removeObjectif(i: number): void {
    this.newFormation.objectifs.splice(i, 1);
  }

  addCompetence(): void {
    this.newFormation.competences.push('');
  }

  removeCompetence(i: number): void {
    this.newFormation.competences.splice(i, 1);
  }

  saveFormation(): void {
    const payload: Formation = {
      id_formation: 0,
      formateur: '',
      axe_code: '',
      ...this.newFormation,
      objectifs: this.newFormation.objectifs.filter(o => o.trim()),
      competences: this.newFormation.competences.filter(c => c.trim()),
      prestataire: this.newFormation.prestataire ?? '',
      id_formateur: this.newFormation.id_formateur ?? 0,
  pays: (this.newFormation.pays || []).map(id => ({
      id_pays: id as any,
      nom: ''
    })) as Pays[]    };

    this.formationService.addFormation(payload).subscribe({
      next: (res) => {
        Swal.fire(
          this.getLabel('Succès'),
          `${this.getLabel('Formation ajoutée')} (code ${res.axe_code})`,
          'success'
        );
        this.resetForm();
      },
      error: () =>
        Swal.fire(
          this.getLabel('Erreur'), 
          this.getLabel('Échec lors de l\'ajout'), 
          'error'
        )
    });
  }
  

  resetForm(): void {
    this.newFormation = this.createEmptyForm();
    // ✅ Après réinitialisation, recharger l'ID du formateur connecté
    this.loadCurrentUser();
  }
}