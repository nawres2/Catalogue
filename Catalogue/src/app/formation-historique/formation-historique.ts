import { ChangeDetectorRef, Component, inject, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormationService } from '../service/formation-service';
import Swal from 'sweetalert2';

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
  pays?: Array<{ id_pays: number; nom: string }>; // ✅ Changed to match backend response
}

@Component({
  selector: 'app-formation-historique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formation-historique.html',
  styleUrls: ['./formation-historique.css']
})
export class FormationHistorique implements OnInit {
  formations: Formation[] = [];
  selectedFormation: Formation | null = null;

  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  selectedPaysIds: number[] = []; // ✅ Track selected pays IDs separately
  detailModalOpen = false;
  updateModalOpen = false;
  deleteModalOpen = false;

  formateurs: { id_user: number; nom: string; prenom: string }[] = [];
  paysList: { id_pays: number; nom: string }[] = [];
  selectedEtat: 'en_attente' | 'validee' | 'refusee' = 'en_attente';
  loading = false;

  // Temporary arrays for dynamic inputs
  editObjectifsInput: string[] = [];
  editCompetencesInput: string[] = [];
  editDureeNumber = 1;
  editDureeUnit = 'jours';

  constructor(private formationsService: FormationService) {}

  ngOnInit(): void {
    this.loadFormations();
    this.loadFormateurs();
    this.loadPays();
    this.loadObjectifs(); // ✅ Add this
    this.loadCompetences(); // ✅ Add this
  }

  loadFormateurs(): void {
    this.formationsService.loadFormateurs().subscribe({
      next: (data: any[]) => {
        this.formateurs = data;
        console.log('✅ Formateurs loaded:', this.formateurs);
      },
      error: (err) => {
        console.error('❌ Erreur chargement formateurs', err);
        Swal.fire('Erreur', 'Impossible de charger les formateurs', 'error');
      }
    });
  }

  loadPays(): void {
    this.formationsService.getPays().subscribe({
      next: (data: any[]) => {
        this.paysList = data;
        console.log('✅ Pays loaded:', this.paysList);
      },
      error: (err) => {
        console.error('❌ Erreur chargement pays', err);
        Swal.fire('Erreur', 'Impossible de charger les pays', 'error');
      }
    });
  }

  loadFormations(): void {
    this.loading = true;
    const token = localStorage.getItem('token');
    if (!token) {
      Swal.fire('Non authentifié', 'Vous devez être connecté pour voir les formations.', 'warning');
      this.loading = false;
      return;
    }

    this.formationsService.getFormationsByFormateur(this.selectedEtat)
      .subscribe({
        next: (data) => {
          this.formations = data;
          console.log('✅ Formations loaded:', this.formations);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Erreur récupération formations:', err);
          this.loading = false;
          Swal.fire('Erreur', 'Impossible de charger les formations.', 'error');
        }
      });
  }

  changeEtat(etat: 'en_attente' | 'validee' | 'refusee'): void {
    this.selectedEtat = etat;
    this.loadFormations();
  }

  trackFormation(index: number, formation: Formation): number {
    return formation.id_formation;
  }

  // Detail Modal
  openDetailModal(formation: Formation): void {
    this.selectedFormation = { ...formation };
    
    // ✅ Initialize selectedPaysIds from formation.pays
    if (formation.parcours === 'OnBoarding' && formation.pays) {
      this.selectedPaysIds = formation.pays.map(p => p.id_pays);
    } else {
      this.selectedPaysIds = [];
    }
    
    this.editObjectifsInput = [...(formation.objectifs || [''])];
    this.editCompetencesInput = [...(formation.competences || [''])];
    
    // ✅ Parse duration properly
    const [number, unit] = this.parseDuration(formation.duree || '1 jours');
    this.editDureeNumber = number;
    this.editDureeUnit = unit;
    
    this.detailModalOpen = true;
    console.log('📋 Detail modal opened:', {
      formation: this.selectedFormation,
      selectedPaysIds: this.selectedPaysIds
    });
  }

  closeDetailModal(): void {
    this.detailModalOpen = false;
    this.selectedFormation = null;
    this.selectedPaysIds = [];
  }

  // Update Modal
  openUpdateModal(): void {
    if (!this.selectedFormation) return;
    
    // ✅ Re-initialize pays when opening update modal
    if (this.selectedFormation.parcours === 'OnBoarding' && this.selectedFormation.pays) {
      this.selectedPaysIds = this.selectedFormation.pays.map(p => p.id_pays);
    }
    
    this.updateModalOpen = true;
    console.log('📝 Update modal opened with pays:', this.selectedPaysIds);
  }

  closeUpdateModal(): void {
    this.updateModalOpen = false;
  }
 objectifs: any[] = [];
  competences: any[] = [];
 async confirmUpdate(): Promise<void> {
  if (!this.selectedFormation) return;

  try {
    // ✅ Resolve objectifs IDs (create new ones if needed)
    const objectifIds = await this.resolveIds(
      this.editObjectifsInput,
      this.objectifs || [],
      'objectif',
      'id_objectif'
    );

    // ✅ Resolve competences IDs (create new ones if needed)
    const competenceIds = await this.resolveIds(
      this.editCompetencesInput,
      this.competences || [],
      'competence',
      'id_competence'
    );

    // ✅ Prepare the payload
    const payload: any = {
      ...this.selectedFormation,
      duree: this.editDureeNumber
        ? `${this.editDureeNumber} ${this.editDureeUnit}`
        : null,
      objectifs: objectifIds,
      competences: competenceIds,
      // ✅ Include pays_ids for OnBoarding parcours
      pays_ids: this.selectedFormation.parcours === 'OnBoarding' ? this.selectedPaysIds : []
    };

    // ✅ Remove the pays array object from payload (send only IDs)
    delete payload.pays;

    console.log('📤 Update payload:', payload);

    // ✅ Show confirmation dialog
    const result = await Swal.fire({
      title: 'Confirmer la modification',
      text: 'Êtes-vous sûr de vouloir modifier cette formation ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, modifier',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    });

    if (!result.isConfirmed) return;

    // ✅ Make the API call
    const token = localStorage.getItem('token') || '';
    
    this.formationsService.updateFormation(
      this.selectedFormation.id_formation,
      payload,
      token
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
        this.closeUpdateModal();
        this.closeDetailModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erreur modification formation:', err);
        console.error('Error details:', err.error);
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de mettre à jour la formation. Veuillez réessayer.',
          confirmButtonColor: '#d33'
        });
      }
    });

  } catch (error) {
    console.error('❌ Erreur interne:', error);
    
    Swal.fire({
      icon: 'error',
      title: 'Erreur interne',
      text: 'Problème lors de la résolution des objectifs ou compétences.'
    });
  }
}

// ✅ Add the resolveIds helper method
private async resolveIds(
  inputArray: string[],
  existingList: any[],
  entityName: string,
  idField: string
): Promise<number[]> {
  const ids: number[] = [];
  
  for (const item of inputArray) {
    const trimmed = item.trim();
    if (!trimmed) continue; // Skip empty strings

    // Check if this item already exists in the database
    const existing = existingList.find(
      (e) => e[entityName]?.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      // Use existing ID
      ids.push(existing[idField]);
    } else {
      // Create new item and get its ID
      const newId = await this.createNewItem(entityName, trimmed);
      if (newId) {
        ids.push(newId);
      }
    }
  }

  return ids;
}
 loadObjectifs(): void {
    this.formationsService.getObjectifs().subscribe({
      next: (data) => {
        this.objectifs = data;
        console.log('✅ Objectifs loaded:', this.objectifs);
      },
      error: (err) => console.error('❌ Error loading objectifs:', err)
    });
  }

  loadCompetences(): void {
    this.formationsService.getCompetences().subscribe({
      next: (data) => {
        this.competences = data;
        console.log('✅ Competences loaded:', this.competences);
      },
      error: (err) => console.error('❌ Error loading competences:', err)
    });
  }
// ✅ Add helper to create new objectifs/competences
// In formation-historique.ts - Update createNewItem method
private createNewItem(entityName: string, value: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const endpoint = entityName === 'objectif' 
      ? 'http://localhost:3000/api/objectif'
      : 'http://localhost:3000/api/competence';

    // ✅ Use 'libelle' as the field name for both
    const payload = { libelle: value };

    console.log(`📤 Creating new ${entityName}:`, payload);

    this.formationsService.createItem(endpoint, payload).subscribe({
      next: (response: any) => {
        console.log(`✅ Created new ${entityName}:`, response);
        // Try multiple possible response formats
        const newId = response.id || response[`id_${entityName}`] || response.insertId;
        resolve(newId);
      },
      error: (err) => {
        console.error(`❌ Error creating ${entityName}:`, err);
        console.error('Status:', err.status);
        console.error('Error details:', err.error);
        reject(err);
      }
    });
  });
}

  // Delete Modal
  openDeleteModal(): void {
    this.deleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.deleteModalOpen = false;
  }

  confirmDelete(): void {
    if (!this.selectedFormation) return;

    Swal.fire({
      title: 'Confirmer la suppression',
      text: 'Êtes-vous sûr de vouloir supprimer cette formation ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed && this.selectedFormation) {
        const token = localStorage.getItem('token') || '';
        this.formationsService.deleteFormation(this.selectedFormation.id_formation, token)
          .subscribe({
            next: () => {
              Swal.fire('Supprimée !', 'La formation a été supprimée.', 'success');
              this.closeDeleteModal();
              this.closeDetailModal();
              this.loadFormations();
            },
            error: (err) => {
              console.error('❌ Erreur suppression formation:', err);
              Swal.fire('Erreur', 'Impossible de supprimer la formation.', 'error');
            }
          });
      }
    });
  }

  // ✅ Pays helpers - now using selectedPaysIds
  isPaysSelected(paysId: number): boolean {
    return this.selectedPaysIds.includes(paysId);
  }

  togglePays(paysId: number): void {
    const index = this.selectedPaysIds.indexOf(paysId);
    if (index > -1) {
      // Remove if already selected
      this.selectedPaysIds.splice(index, 1);
    } else {
      // Add if not selected
      this.selectedPaysIds.push(paysId);
    }
    console.log('🌍 Selected pays:', this.selectedPaysIds);
  }

  // Dynamic objectifs/competences helpers
  addEditObjectifInput(): void {
    this.editObjectifsInput.push('');
  }

  addEditCompetenceInput(): void {
    this.editCompetencesInput.push('');
  }

  // ✅ Helper to parse duration string
  parseDuration(duree: string): [number, string] {
    const match = duree.match(/(\d+)\s*(jours?|heures?)/i);
    if (match) {
      const num = parseInt(match[1]);
      let unit = match[2].toLowerCase();
      // Normalize to plural
      if (unit === 'jour') unit = 'jours';
      if (unit === 'heure') unit = 'heures';
      return [num, unit];
    }
    return [1, 'jours'];
  }

  // ✅ Helper to get pays names for display
  getPaysNames(formation: Formation): string {
    if (!formation.pays || formation.pays.length === 0) return 'Aucun';
    return formation.pays.map(p => p.nom).join(', ');
  }
}