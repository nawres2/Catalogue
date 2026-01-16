// onboarding-management.component.ts
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { OnboardingSession, Jour, Activite } from '../model/onboarding.model';
import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectorRef, OnInit, PLATFORM_ID } from '@angular/core';
import Swal from 'sweetalert2';
import { OnboardingTranslationService } from '../service/onboarding-translation.service';

@Component({
  selector: 'app-onboarding-management',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './onboarding-management.html',
  styleUrls: ['./onboarding-management.css'],
})
export class OnboardingManagement implements OnInit {
  private platformId = inject(PLATFORM_ID);
  sessions: OnboardingSession[] = [];
  allSessions: OnboardingSession[] = [];
  loading: boolean = false;
  currentLanguage: string = 'fr';
  isTranslating: boolean = false;
 
  showModal = false;
  showDetailsModal = false;
  isEditMode = false;
 
  private cdr = inject(ChangeDetectorRef);
  private translationService = inject(OnboardingTranslationService);
  
  currentSessionId?: number;
  selectedSession?: OnboardingSession;
 
  formData: OnboardingSession = this.emptySession();
  objectifs: string[] = [''];
  jours: Jour[] = [];
 
  typesActivite = [
    'formation',
    'presentation',
    'atelier',
    'pause',
    'repas',
    'visite'
  ];

  // ✅ DICTIONNAIRE DE TRADUCTIONS STATIQUES
  translations: any = {
    fr: {
      title: 'Gestion des Sessions OnBoarding',
      newSession: 'Nouvelle Session',
      intitule: 'Intitulé',
      planificateur: 'Planificateur',
      dateDebut: 'Date Début',
      dateFin: 'Date Fin',
      etat: 'État',
       formation: 'Formation',
  presentation: 'Présentation',
  atelier: 'Atelier',
  pause: 'Pause',
  repas: 'Repas',
  visite: 'Visite',
      actions: 'Actions',
      noSession: 'Aucune session trouvée',
      createFirst: 'Créez votre première session pour commencer',
      loading: 'Chargement des sessions...',
      translating: 'Traduction en cours...',
      view: 'Voir les détails',
      edit: 'Modifier',
      delete: 'Supprimer',
      cancel: 'Annuler',
      save: 'Créer la session',
      update: 'Mettre à jour',
      close: 'Fermer',
      createSession: 'Créer une session',
      editSession: 'Modifier une session',
      fillInfo: 'Remplissez les informations ci-dessous',
      generalInfo: 'Informations générales',
      objectives: 'Objectifs',
      planning: 'Planning des jours',
      intituleLabel: 'Intitulé',
      planificateurLabel: 'Planificateur',
      paysLabel: 'Pays',
      dateDebutLabel: 'Date de début',
      dateFinLabel: 'Date de fin',
      populationLabel: 'Population cible',
      prerequisLabel: 'Prérequis',
      intitulePlaceholder: 'Ex: Session d\'intégration 2026',
      planificateurPlaceholder: 'Rym Mejri',
      paysPlaceholder: 'Ex: France',
      populationPlaceholder: 'Ex: Nouveaux embauchés',
      prerequisPlaceholder: 'Décrivez les prérequis nécessaires...',
      objectifPlaceholder: 'Décrivez l\'objectif...',
      addObjective: 'Ajouter un objectif',
      removeObjective: 'Supprimer',
      day: 'Jour',
      dayTitle: 'Titre du jour',
      dayTitlePlaceholder: 'Ex: Introduction et accueil',
      date: 'Date',
      addDay: 'Ajouter un jour',
      removeDay: 'Supprimer ce jour',
      activity: 'Activité',
      startTime: 'Heure de début',
      endTime: 'Heure de fin',
      type: 'Type',
      activityTitle: 'Titre de l\'activité',
      activityTitlePlaceholder: 'Ex: Présentation de l\'entreprise',
      description: 'Description',
      descriptionPlaceholder: 'Décrivez l\'activité...',
      location: 'Lieu',
      locationPlaceholder: 'Ex: Salle de conférence A',
      animator: 'Animateur',
      animatorPlaceholder: 'Ex: Jean Dupont',
      addActivity: 'Ajouter une activité',
      removeActivity: 'Supprimer cette activité',
      targetPopulation: 'Population cible',
      prerequisites: 'Prérequis',
      brouillon: 'brouillon',
      validee: 'Validée',
      deleteConfirmTitle: 'Êtes-vous sûr ?',
      deleteConfirmText: 'Vous ne pourrez pas revenir en arrière !',
      deleteConfirmButton: 'Oui, supprimer !',
      deleteCancelButton: 'Annuler',
      deleteSuccessTitle: 'Supprimé !',
      deleteSuccessText: 'La session a été supprimée.',
      saveSuccessTitle: 'Succès !',
      saveSuccessText: 'La session a été sauvegardée avec succès.',
      updateSuccessTitle: 'Mis à jour !',
      updateSuccessText: 'La session a été mise à jour avec succès.',
      errorTitle: 'Erreur !',
      loadingTitle: 'Chargement...',
      loadingText: 'Veuillez patienter',
    },
    en: {
      title: 'OnBoarding Sessions Management',
      newSession: 'New Session',
      intitule: 'Title',
      planificateur: 'Planner',
      dateDebut: 'Start Date',
      dateFin: 'End Date',
      etat: 'Status',
      actions: 'Actions',
      noSession: 'No session found',
      createFirst: 'Create your first session to get started',
      loading: 'Loading sessions...',
      translating: 'Translating...',
      view: 'View details',
      edit: 'Edit',
      delete: 'Delete',
      cancel: 'Cancel',
      save: 'Create session',
      update: 'Update',
      close: 'Close',
      createSession: 'Create a session',
      editSession: 'Edit a session',
      fillInfo: 'Fill in the information below',
      generalInfo: 'General Information',
      objectives: 'Objectives',
      planning: 'Daily Planning',
      intituleLabel: 'Title',
      planificateurLabel: 'Planner',
      paysLabel: 'Country',
      dateDebutLabel: 'Start date',
      dateFinLabel: 'End date',
      populationLabel: 'Target population',
      prerequisLabel: 'Prerequisites',
      intitulePlaceholder: 'Ex: 2026 Integration Session',
      planificateurPlaceholder: 'Rym Mejri',
      paysPlaceholder: 'Ex: France',
      populationPlaceholder: 'Ex: New hires',
      prerequisPlaceholder: 'Describe the necessary prerequisites...',
      objectifPlaceholder: 'Describe the objective...',
      addObjective: 'Add objective',
      removeObjective: 'Remove',
      day: 'Day',
      dayTitle: 'Day title',
      dayTitlePlaceholder: 'Ex: Introduction and welcome',
      date: 'Date',
      addDay: 'Add day',
      removeDay: 'Remove this day',
      activity: 'Activity',
      startTime: 'Start time',
      endTime: 'End time',
      type: 'Type',
      activityTitle: 'Activity title',
      activityTitlePlaceholder: 'Ex: Company presentation',
      description: 'Description',
      descriptionPlaceholder: 'Describe the activity...',
      location: 'Location',
      locationPlaceholder: 'Ex: Conference room A',
      animator: 'Facilitator',
      animatorPlaceholder: 'Ex: Jean Dupont',
      addActivity: 'Add activity',
      removeActivity: 'Remove this activity',
      targetPopulation: 'Target population',
      prerequisites: 'Prerequisites',
      brouillon: 'draft',
      validee: 'validated',
      deleteConfirmTitle: 'Are you sure?',
      deleteConfirmText: 'You won\'t be able to revert this!',
      deleteConfirmButton: 'Yes, delete it!',
      deleteCancelButton: 'Cancel',
      deleteSuccessTitle: 'Deleted!',
      deleteSuccessText: 'The session has been deleted.',
      saveSuccessTitle: 'Success!',
      saveSuccessText: 'The session has been saved successfully.',
      updateSuccessTitle: 'Updated!',
      updateSuccessText: 'The session has been updated successfully.',
      errorTitle: 'Error!',
      loadingTitle: 'Loading...',
      loadingText: 'Please wait',
       formation:'Training',
    presentation :'Presentation',
    atelier:'Workshop',
    pause:'Break',
    repas :'Lunch',
    visite :'Visit',
    }
  };
 
  constructor(private http: HttpClient) {}

  t(key: string): string {
    return this.translations[this.currentLanguage]?.[key] || key;
  }
 
  ngOnInit(): void {
    console.log('🚀 OnboardingManagement - Initialisation');
    
    this.currentLanguage = localStorage.getItem('selectedLanguage') || 
                          localStorage.getItem('lang') || 
                          'fr';
    
    console.log(`🌐 Langue active: ${this.currentLanguage}`);
    this.loadSessions();
  }
 
  /**
   * 🔥 CHARGEMENT + TRADUCTION AUTOMATIQUE DES SESSIONS
   */
  async loadSessions(): Promise<void> {
    console.log('📥 Chargement des sessions...');
    this.loading = true;
    
    Swal.fire({
      title: this.t('loadingTitle'),
      text: this.t('loadingText'),
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    try {
      // 1️⃣ Charger les données brutes (FR)
      const data = await this.http.get<OnboardingSession[]>(
        'http://localhost:3000/api/onboarding/sessions'
      ).toPromise();
      
      console.log('✅ Sessions reçues:', data);
      
      this.allSessions = (data || []).map(session => ({
        ...session,
        nombre_jours: session.jours?.length || 0,
        nombre_activites: session.jours?.reduce((total, jour) => 
          total + (jour.activites?.length || 0), 0) || 0
      }));
      
      // 2️⃣ Traduire si nécessaire
      if (this.currentLanguage !== 'fr') {
        await this.translateSessionsData();
      } else {
        this.filterSessionsByLanguage();
      }
      
      this.loading = false;
      this.cdr.detectChanges();
      Swal.close();
      
    } catch (err: any) {
      console.error('❌ Erreur chargement sessions:', err);
      this.loading = false;
      
      Swal.fire({
        icon: 'error',
        title: this.t('errorTitle'),
        text: err.error?.details || err.message,
        confirmButtonColor: '#3085d6'
      });
    }
  }

  /**
   * 🌐 TRADUIT TOUTES LES SESSIONS
   */
  private async translateSessionsData(): Promise<void> {
    console.log(`🌐 Début traduction vers ${this.currentLanguage}...`);
    this.isTranslating = true;
    
    Swal.fire({
      title: this.t('loadingTitle'),
      text: this.t('translating'),
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const translatedData = await this.translationService.translateOnboardingData(
        { sessions: this.allSessions },
        this.currentLanguage
      );
      
      this.allSessions = translatedData.sessions;
      this.filterSessionsByLanguage();
      
      console.log('✅ Traduction terminée');
      
    } catch (error) {
      console.error('❌ Erreur traduction:', error);
      Swal.fire({
        icon: 'warning',
        title: 'Traduction échouée',
        text: 'Affichage des données en français',
        timer: 2000
      });
    } finally {
      this.isTranslating = false;
      Swal.close();
    }
  }
  
  // onboarding-management.component.ts
// Remplacez la méthode filterSessionsByLanguage par celle-ci :

filterSessionsByLanguage(): void {
  console.log(`🔍 Filtrage pour la langue ${this.currentLanguage}`);
  console.log(`📊 Total sessions disponibles:`, this.allSessions.length);
  
  // 🔥 AFFICHER TOUTES LES SESSIONS (pas de filtrage par ID)
  this.sessions = [...this.allSessions];
  
  console.log(`✅ ${this.sessions.length} session(s) affichée(s)`);
  
  // Debug: afficher les IDs des sessions
  if (this.sessions.length > 0) {
    console.log('📌 IDs des sessions:', this.sessions.map(s => s.id_session).join(', '));
  }
}

// OU si vous voulez vraiment filtrer par langue, utilisez un champ de la session :
/*
filterSessionsByLanguage(): void {
  console.log(`🔍 Filtrage pour la langue ${this.currentLanguage}`);
  console.log(`📊 Total sessions disponibles:`, this.allSessions.length);
  
  // Filtrer selon un champ langue dans la session (si vous en avez un)
  // Sinon, afficher toutes les sessions
  if (this.allSessions.length > 0 && this.allSessions[0].langue) {
    this.sessions = this.allSessions.filter(
      session => session.langue === this.currentLanguage
    );
  } else {
    // Pas de champ langue ? Afficher toutes les sessions
    this.sessions = [...this.allSessions];
  }
  
  console.log(`✅ ${this.sessions.length} session(s) après filtrage`);
}
*/

  /**
   * 🔄 CHANGEMENT DE LANGUE
   */
  async changeLanguage(lang: 'fr' | 'en'): Promise<void> {
    if (this.currentLanguage === lang) return;
    
    console.log(`🌐 Changement de langue: ${lang}`);
    this.currentLanguage = lang;
    localStorage.setItem('selectedLanguage', lang);
    localStorage.setItem('lang', lang);
    
    await this.loadSessions();
  }
 
  /**
   * 📥 CHARGER LES DÉTAILS D'UNE SESSION (avec traduction)
   */
  async loadDetails(id: number): Promise<void> {
    console.log(`📥 Chargement détails session ${id}...`);
    
    Swal.fire({
      title: this.t('loadingTitle'),
      text: this.t('loadingText'),
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    try {
      const data = await this.http.get<OnboardingSession>(
        `http://localhost:3000/api/onboarding/${id}/details`
      ).toPromise();
      
      console.log('✅ Détails reçus:', data);
      
      // Traduire si nécessaire
      if (this.currentLanguage !== 'fr' && data) {
        const translated = await this.translationService.translateOnboardingData(
          { sessions: [data] },
          this.currentLanguage
        );
        this.selectedSession = translated.sessions[0];
      } else {
        this.selectedSession = data;
      }
      
      this.showDetailsModal = true;
      Swal.close();
      
    } catch (err: any) {
      console.error('❌ Erreur chargement détails:', err);
      Swal.fire({
        icon: 'error',
        title: this.t('errorTitle'),
        text: err.error?.details || err.message,
        confirmButtonColor: '#3085d6'
      });
    }
  }
 
  openCreate(): void {
    console.log('➕ Ouverture modal création');
    this.isEditMode = false;
    this.resetForm();
    this.showModal = true;
  }
 
  // onboarding-management.component.ts
// Remplacez la méthode openEdit par celle-ci :

async openEdit(session: OnboardingSession): Promise<void> {
  console.log('✏️ Ouverture modal édition:', session);
  this.isEditMode = true;
  this.currentSessionId = session.id_session;

  Swal.fire({
    title: this.t('loadingTitle'),
    text: this.t('loadingText'),
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    // 1️⃣ Charger les données brutes (FR) depuis la base
    const data = await this.http.get<OnboardingSession>(
      `http://localhost:3000/api/onboarding/${session.id_session}/details`
    ).toPromise();
    
    console.log('✅ Données session pour édition (FR):', data);
    
    if (data) {
      // 2️⃣ Traduire si nécessaire
      let sessionData: OnboardingSession;
      
      if (this.currentLanguage !== 'fr') {
        console.log(`🌐 Traduction de la session pour édition vers ${this.currentLanguage}...`);
        const translated = await this.translationService.translateOnboardingData(
          { sessions: [data] },
          this.currentLanguage
        );
        sessionData = translated.sessions[0];
        console.log('✅ Données traduites pour édition:', sessionData);
      } else {
        sessionData = data;
      }
      
      // 3️⃣ Remplir le formulaire avec les données traduites
      this.formData = { ...sessionData };
      
      if (sessionData.objectifs && Array.isArray(sessionData.objectifs)) {
        this.objectifs = sessionData.objectifs.map(obj => 
          typeof obj === 'string' ? obj : obj.libelle
        );
      } else {
        this.objectifs = [''];
      }
      
      this.jours = sessionData.jours || [];
      this.showModal = true;
    }
    
    Swal.close();
    
  } catch (err: any) {
    console.error('❌ Erreur chargement pour édition:', err);
    Swal.fire({
      icon: 'error',
      title: this.t('errorTitle'),
      text: err.error?.details || err.message,
      confirmButtonColor: '#3085d6'
    });
  }
}
 
  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }
 
  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedSession = undefined;
  }
 
  addObjectif(): void {
    this.objectifs.push('');
  }
 
  removeObjectif(i: number): void {
    if (this.objectifs.length > 1) {
      this.objectifs.splice(i, 1);
    }
  }
 
  addJour(): void {
    this.jours.push({
      numero_jour: this.jours.length + 1,
      titre: '',
      date_jour: '',
      activites: []
    });
  }
 
  removeJour(i: number): void {
    this.jours.splice(i, 1);
    this.jours.forEach((j, idx) => j.numero_jour = idx + 1);
  }
 
  addActivite(jourIndex: number): void {
    this.jours[jourIndex].activites.push({
      heure_debut: '',
      heure_fin: '',
      titre: '',
      type_activite: 'formation'
    });
  }
 
  removeActivite(j: number, a: number): void {
    this.jours[j].activites.splice(a, 1);
  }
 
  async save(): Promise<void> {
    console.log('💾 Sauvegarde session...');
    
    const payload: OnboardingSession = {
      ...this.formData,
      objectifs: this.objectifs
        .filter(o => o.trim())
        .map(libelle => ({ libelle })),
      jours: this.jours
    };
    
    console.log('📤 Payload:', payload);
 
    Swal.fire({
      title: this.t('loadingTitle'),
      text: this.t('loadingText'),
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
 
    try {
      const url = this.isEditMode
        ? `http://localhost:3000/api/onboarding/${this.currentSessionId}`
        : 'http://localhost:3000/api/onboarding/sessions';
      
      const method = this.isEditMode ? 'put' : 'post';
      
      await this.http[method](url, payload).toPromise();
      
      console.log('✅ Sauvegarde réussie');
      await this.loadSessions();
      this.closeModal();
      
      Swal.fire({
        icon: 'success',
        title: this.isEditMode ? this.t('updateSuccessTitle') : this.t('saveSuccessTitle'),
        text: this.isEditMode ? this.t('updateSuccessText') : this.t('saveSuccessText'),
        confirmButtonColor: '#3085d6',
        timer: 2000
      });
      
    } catch (err: any) {
      console.error('❌ Erreur sauvegarde:', err);
      Swal.fire({
        icon: 'error',
        title: this.t('errorTitle'),
        text: err.error?.details || err.message,
        confirmButtonColor: '#3085d6'
      });
    }
  }
 
  delete(id: number): void {
    Swal.fire({
      title: this.t('deleteConfirmTitle'),
      text: this.t('deleteConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('deleteConfirmButton'),
      cancelButtonText: this.t('deleteCancelButton')
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: this.t('loadingTitle'),
          text: this.t('loadingText'),
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        try {
          await this.http.delete(`http://localhost:3000/api/onboarding/${id}`).toPromise();
          console.log('✅ Session supprimée');
          await this.loadSessions();
          
          Swal.fire({
            icon: 'success',
            title: this.t('deleteSuccessTitle'),
            text: this.t('deleteSuccessText'),
            confirmButtonColor: '#3085d6',
            timer: 2000
          });
          
        } catch (err: any) {
          console.error('❌ Erreur suppression:', err);
          Swal.fire({
            icon: 'error',
            title: this.t('errorTitle'),
            text: err.error?.details || err.message,
            confirmButtonColor: '#3085d6'
          });
        }
      }
    });
  }
 
  emptySession(): OnboardingSession {
    return {
      intitule: '',
      pays: '',
      planificateur: '',
      date_debut: '',
      date_fin: '',
      duree: '',
      population: '',
      prerequis: '',
      etat: 'validee'
    };
  }
 
  resetForm(): void {
    this.formData = this.emptySession();
    this.objectifs = [''];
    this.jours = [];
    this.currentSessionId = undefined;
  }
 
  trackByIndex(i: number): number {
    return i;
  }
}