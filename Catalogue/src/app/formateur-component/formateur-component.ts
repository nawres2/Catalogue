import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { FormationService } from '../service/formation-service';
import { Formation } from '../model/formation.model';
import { FormationForm } from '../model/FormationForm.model';

@Component({
  selector: 'app-formateur-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formateur-component.html',
  styleUrls: ['./formateur-component.css']
})
export class FormateurComponent implements OnInit {

  formateurs: { id_user: number; nom: string; prenom: string }[] = [];
paysList: { id_pays: number; nom: string }[] = [];
  newFormation: FormationForm = this.createEmptyForm();
pays: number[] = [];
  constructor(private formationService: FormationService) {}

  ngOnInit(): void {
    this.loadFormateurs();
     this.loadPays();
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
      pays: [] as number[],
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
      Swal.fire('Erreur', 'Impossible de charger les formateurs', 'error');
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
  pays: this.newFormation.pays ?? []  // <-- explicitly required
};


    this.formationService.addFormation(payload).subscribe({
      next: (res) => {
        Swal.fire(
          'Succès',
          `Formation ajoutée (code ${res.axe_code})`,
          'success'
        );
        this.resetForm();
      },
      error: () =>
        Swal.fire('Erreur', 'Échec lors de l’ajout', 'error')
    });
  }

  resetForm(): void {
    this.newFormation = this.createEmptyForm();
  }
}
