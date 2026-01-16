import { Component, EventEmitter, Output, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../service/auth-service';
import { TranslationService } from '../service/translation.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {

  @Output() toggleSidebar = new EventEmitter<boolean>();
  sidebarOpen = true;
  isTranslating = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ui = {
    catalogue: 'Catalogue',
    formations: 'Formations',
    users: 'Utilisateurs',
    pending: 'Formations en attente',
    form: 'Formulaire',
    history: 'Historique',
    onboarding: 'Onboarding', // ✅ Attention à la casse (minuscule)
    logout: 'Déconnexion'
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.translateMenu();
    }
  }

  async translateMenu() {
    console.log('🔍 translateMenu appelé');
    
    const lang = localStorage.getItem('selectedLanguage') || 'fr';
    console.log('🌍 Langue détectée:', lang);
    console.log('📝 UI AVANT traduction:', JSON.stringify(this.ui));

    if (lang === 'en') {
      this.isTranslating = true;
      this.cdr.detectChanges();

      const keys = Object.keys(this.ui) as (keyof typeof this.ui)[];
      const values = Object.values(this.ui);

      console.log('📤 Textes à traduire:', values);

      try {
        const translated = await this.translationService.translateBatchOptimized(values, 'en');
        
        console.log('📥 Traductions reçues:', translated);

        // ✅ Créer un NOUVEL objet
        const newUi: any = {};
        keys.forEach((key, i) => {
          newUi[key] = translated[i] || this.ui[key];
          console.log(`  ${key}: "${this.ui[key]}" → "${newUi[key]}"`);
        });

        // ✅ Remplacer l'objet
        this.ui = newUi;
        
        console.log('✅ UI APRÈS traduction:', JSON.stringify(this.ui));

        this.isTranslating = false;
        this.cdr.detectChanges();

      } catch (error) {
        console.error('❌ Erreur traduction:', error);
        this.isTranslating = false;
        this.cdr.detectChanges();
      }
    }
  }

  toggle() {
    this.sidebarOpen = !this.sidebarOpen;
    this.toggleSidebar.emit(this.sidebarOpen);
  }

  async logout() {
    this.authService.logout();

    const lang = localStorage.getItem('selectedLanguage') || 'fr';
    const title = lang === 'en' ? 'Logged out' : 'Déconnecté';
    const text = lang === 'en' ? 'You have been logged out successfully' : 'Vous avez été déconnecté avec succès';

    Swal.fire({
      icon: 'success',
      title: title,
      text: text,
      timer: 1500,
      showConfirmButton: false
    });

    this.router.navigate(['/catalogue']);
  }

  isAdmin(): boolean {
    return this.authService.hasRole(2);
  }

  isFormateur(): boolean {
    return this.authService.hasRole(1);
  }
}