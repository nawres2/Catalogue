import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { FormationService } from '../service/formation-service';
@Component({
  selector: 'app-formation',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './formation.html',
  styleUrls: ['./formation.css']
})
export class formation implements OnInit, OnDestroy {
    
  formations: any[] = [];
  formateurs: any[] = [];
  objectifs: any[] = [];
  competences: any[] = [];
paysList: { id_pays: number; nom: string }[] = [];
pays: number[] = [];

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
  editFormation: any = null;

  refreshSub!: Subscription;
  userRole: 'admin' | 'formateur' | null = null;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private formationService: FormationService
  ) {}

  /* ===================== LIFECYCLE ===================== */

 ngOnInit() {
  this.loadAll();

  // Récupération du rôle
  const storedRole = localStorage.getItem('userRole');
  if (storedRole) {
    this.userRole = storedRole as 'admin' | 'formateur';
  }

  // Afficher le guide UNE SEULE FOIS après login
  const hasSeenGuide = localStorage.getItem('hasSeenFormationGuide');
  if (!hasSeenGuide && this.userRole) {
    this.welcomeModalOpen = true;
    localStorage.setItem('hasSeenFormationGuide', 'true');
  }
   this.loadPays();
}

isPaysSelected(paysId: number): boolean {
  return this.editFormation.pays?.includes(paysId) || false;
}

togglePays(paysId: number): void {
  if (!this.editFormation.pays) {
    this.editFormation.pays = [];
  }
  
  const index = this.editFormation.pays.indexOf(paysId);
  
  if (index > -1) {
    // Remove if already selected
    this.editFormation.pays.splice(index, 1);
  } else {
    // Add if not selected
    this.editFormation.pays.push(paysId);
  }
}
isNewPaysSelected(paysId: number): boolean {
  return this.newFormation.pays?.includes(paysId) || false;
}

// Toggle country selection in NEW formation
toggleNewPays(paysId: number): void {
  if (!this.newFormation.pays) {
    this.newFormation.pays = [];
  }
  
  const index = this.newFormation.pays.indexOf(paysId);
  
  if (index > -1) {
    // Remove if already selected
    this.newFormation.pays.splice(index, 1);
  } else {
    // Add if not selected
    this.newFormation.pays.push(paysId);
  }
}
  ngOnDestroy() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }
downloadFormations() {
  // Ouvre le fichier Excel généré par le backend
  window.open('http://localhost:3000/api/download', '_blank');
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
      .get<any[]>('http://localhost:3000/api/formations')
      .subscribe(data => {
        this.ngZone.run(() => {
          this.formations = data;
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

  validateFormation(formation: any) {
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
    const formation = this.formations[i];

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

  openEditModal(f: any) {
    this.editFormation = structuredClone(f);
    this.editObjectifsInput = [...(f.objectifs || [])];
    this.editCompetencesInput = [...(f.competences || [])];
    
    if (f.duree) {
      const match = f.duree.match(/(\d+)\s*(jours|heures)/i);
      if (match) {
        this.editDureeNumber = parseInt(match[1]);
        this.editDureeUnit = match[2].toLowerCase() as 'jours' | 'heures';
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

  emptyFormation() {
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
       pays: [] as number[],
      duree: '',
      objectifs: [],
      competences: [],
      statut: 'en_attente'
    };
  }
}