import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../service/auth-service';
import { Router } from '@angular/router';
import { SidebarService } from '../service/sidebar-service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit, OnDestroy {
  sidebarOpen = true;
  private subscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private sidebarService: SidebarService
  ) {}

  ngOnInit() {
    // S'abonner aux changements d'état de la sidebar
    this.subscription = this.sidebarService.sidebarState$.subscribe(
      (state) => {
        this.sidebarOpen = state;
      }
    );
  }

  ngOnDestroy() {
    // Nettoyer la souscription
    this.subscription?.unsubscribe();
  }

  toggle() {
    this.sidebarService.toggleSidebar();
  }

  logout() {
    this.authService.logout();

    Swal.fire({
      icon: 'success',
      title: 'Déconnecté',
      text: 'Vous avez été déconnecté avec succès',
      timer: 1500,
      showConfirmButton: false
    });

    this.router.navigate(['/catalogue']);
  }
}