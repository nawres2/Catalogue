import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { FormationService, Formation, Formateur, Objectif, Competence } from '../service/request_formation.service';

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

  formationRequests: Formation[] = [];
  selectedRequest: Formation | null = null;
  detailModalOpen = false;
  formateurs: Formateur[] = [];
  
  objectifsArray: Objectif[] = [];
  competencesArray: Competence[] = [];

  // ✅ Nouvelles propriétés pour la modal de confirmation
  confirmModalOpen = false;
  confirmAction: 'valider' | 'refuser' | null = null;
  confirmMessage = '';

  private routerEventsSub: any;
  loading = true;

  ngOnInit(): void {
    this.loadFormationRequests();

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
  }

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

  openDetailModal(request: Formation): void {
    if (!request.id_formation) return;

    this.formationService.getFormationDetails(request.id_formation).subscribe({
      next: (details: Formation) => {
        this.selectedRequest = details;
        this.objectifsArray = details.objectifs || [];
        this.competencesArray = details.competences || [];
        this.detailModalOpen = true;
      },
      error: (err) => {
        console.error('Erreur chargement détails:', err);
        alert('Erreur lors du chargement des détails de la formation');
      }
    });
  }

  closeDetailModal(): void {
    this.detailModalOpen = false;
    this.selectedRequest = null;
    this.objectifsArray = [];
    this.competencesArray = [];
  }

  // ✅ Ouvre la modal de confirmation pour valider
  openValiderConfirm(): void {
    if (!this.selectedRequest?.id_formation) return;
    this.confirmAction = 'valider';
    this.confirmMessage = 'Êtes-vous sûr de vouloir valider cette formation ?';
    this.confirmModalOpen = true;
  }

  // ✅ Ouvre la modal de confirmation pour refuser
  openRefuserConfirm(): void {
    if (!this.selectedRequest?.id_formation) return;
    this.confirmAction = 'refuser';
    this.confirmMessage = 'Êtes-vous sûr de vouloir refuser cette formation ?';
    this.confirmModalOpen = true;
  }

  // ✅ Ferme la modal de confirmation
  closeConfirmModal(): void {
    this.confirmModalOpen = false;
    this.confirmAction = null;
    this.confirmMessage = '';
  }

  // ✅ Exécute l'action confirmée
  executeConfirmedAction(): void {
    if (this.confirmAction === 'valider') {
      this.validerFormation();
    } else if (this.confirmAction === 'refuser') {
      this.refuserFormation();
    }
    this.closeConfirmModal();
  }

  // ✅ Valider sans confirmation (appelée après confirmation)
  validerFormation(): void {
    if (!this.selectedRequest?.id_formation) return;

    this.formationService.validerFormation(this.selectedRequest.id_formation).subscribe({
      next: () => {
        this.closeDetailModal();
        this.loadFormationRequests();
      },
      error: (err) => {
        console.error('Erreur validation:', err);
        alert('Erreur lors de la validation de la formation');
      }
    });
  }

  // ✅ Refuser sans confirmation (appelée après confirmation)
  refuserFormation(): void {
    if (!this.selectedRequest?.id_formation) return;

    this.formationService.refuserFormation(this.selectedRequest.id_formation).subscribe({
      next: () => {
        alert('Formation refusée');
        this.closeDetailModal();
        this.loadFormationRequests();
      },
      error: (err) => {
        console.error('Erreur refus:', err);
        alert('Erreur lors du refus de la formation');
      }
    });
  }

  trackFormation(index: number, item: Formation) { return item.id_formation; }
  trackObjectif(index: number, item: Objectif) { return item.id_objectif; }
  trackCompetence(index: number, item: Competence) { return item.id_competence; }

  getFormateurName(idFormateur: number | undefined): string {
    if (!idFormateur) return 'Non assigné';
    const formateur = this.formateurs.find(f => f.id_user === idFormateur);
    return formateur ? `${formateur.nom} ${formateur.prenom}` : 'Non trouvé';
  }
}