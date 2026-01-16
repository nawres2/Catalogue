import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // ✅ Needed for *ngIf, *ngFor
import { AuthService } from '../service/auth-service';
import { ChangeDetectorRef } from '@angular/core';
import Swal from 'sweetalert2';
import { TranslationService } from '../service/translation.service';


@Component({
  selector: 'app-gest-user',
  standalone: true,
  imports: [
    FormsModule,   // ✅ for ngModel
    CommonModule   // ✅ for ngIf and ngFor
  ],
  templateUrl: './gest-user.html',
  styleUrl: './gest-user.css',
})
export class GestUser implements OnInit {
  users: any[] = [];
  roles: any[] = [];
 ui = {
  title: 'Gestion des Utilisateurs',
  addUser: 'Ajouter un utilisateur',

  thNom: 'Nom',
  thPrenom: 'Prénom',
  thEmail: 'Email',
  thRole: 'Rôle',
  thActions: 'Actions',

  editTitle: 'Modifier un utilisateur',
  addTitle: 'Ajouter un utilisateur',

  labelNom: 'Nom',
  labelPrenom: 'Prénom',
  labelEmail: 'Email',
  labelRole: 'Rôle',
  labelPassword: 'Mot de passe',
  labelPasswordOpt: 'Mot de passe (optionnel)',

  save: 'Enregistrer',
  update: 'Mettre à jour',
  cancel: 'Annuler',

  emailError: 'Only @teamwillgroup.com emails are allowed'
};



  modalOpen = false;
  newUser = { nom: '', prenom: '', email: '', password: '', id_role: null };

  editModalOpen = false;
  editUser: any = null;
  currentLang: string = 'fr';
isEnglish: boolean = false;


constructor(
  private AuthService: AuthService,
  private cdr: ChangeDetectorRef,
  private translationService: TranslationService
) {}


 async ngOnInit() {
  const lang = localStorage.getItem('selectedLanguage') || 'fr';

  if (lang === 'en') {
    const keys = Object.keys(this.ui);
    const values = Object.values(this.ui);

    const translated = await this.translationService.translateBatchOptimized(
      values,
      'en'
    );

    keys.forEach((key, i) => {
      this.ui[key as keyof typeof this.ui] = translated[i];
    });
  }

  this.loadUsers();
  this.loadRoles();
}



loadUsers() {
  this.AuthService.getUsers().subscribe({
    next: async (data) => {
      this.users = data;

      const lang = localStorage.getItem('selectedLanguage') || 'fr';
      if (lang !== 'en') {
        this.cdr.detectChanges();
        return;
      }

      // 🧠 Textes EXACTS à traduire
      const texts: string[] = [];

      this.users.forEach(u => {
        if (u.nom) texts.push(u.nom);
        if (u.prenom) texts.push(u.prenom);
        if (u.role) texts.push(u.role);
      });

      if (texts.length === 0) return;

      // 🚀 Traduction batch
      const translated = await this.translationService
        .translateBatchOptimized(texts, 'en');

      // 🔁 Réinjection
      let i = 0;
      this.users.forEach(u => {
        if (u.nom) u.nom = translated[i++];
        if (u.prenom) u.prenom = translated[i++];
        if (u.role) u.role = translated[i++];
      });

      this.cdr.detectChanges(); // 🔥 CRUCIAL
    },
    error: (err) => console.error(err)
  });
}




  loadRoles() {
  this.AuthService.getRoles().subscribe({
    next: async (data) => {
      this.roles = data;

      const lang = localStorage.getItem('selectedLanguage') || 'fr';
      if (lang !== 'en') {
        this.cdr.detectChanges();
        return;
      }

      const labels = this.roles
        .map(r => r.libelle)
        .filter(l => !!l);

      const translated = await this.translationService
        .translateBatchOptimized(labels, 'en');

      this.roles.forEach((r, i) => {
        r.libelle = translated[i];
      });

      this.cdr.detectChanges();
    }
  });
}



  openModal() { this.modalOpen = true; }
  closeModal() { this.modalOpen = false; }

  openEditModal(user: any) {
    this.editModalOpen = true;
    this.editUser = { ...user, password: '' };
  }
  closeEditModal() { this.editModalOpen = false; this.editUser = null; }

saveUser() {
  this.AuthService.addUser(this.newUser).subscribe({
    next: () => {
      this.loadUsers();
      this.closeModal();

      // SweetAlert succès
      Swal.fire({
        icon: 'success',
        title: 'Utilisateur ajouté',
        text: 'Le nouvel utilisateur a été ajouté avec succès !',
        timer: 2000,
        showConfirmButton: false
      });
    },
    error: (err) => {
      // SweetAlert erreur
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible d\'ajouter l\'utilisateur. Veuillez réessayer.',
      });
      console.error('Erreur ajout utilisateur:', err);
    }
  });
}

updateUser() {
  this.AuthService.updateUser(this.editUser.id_user, this.editUser)
    .subscribe({
      next: () => {
        this.loadUsers();
        this.closeEditModal();

        // SweetAlert succès
        Swal.fire({
          icon: 'success',
          title: 'Utilisateur modifié',
          text: 'Les informations de l\'utilisateur ont été mises à jour avec succès !',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de mettre à jour l\'utilisateur. Veuillez réessayer.',
        });
        console.error('Erreur update utilisateur:', err);
      }
    });
}

delete(index: number) {
  const user = this.users[index];

  // Confirmation avant suppression
  Swal.fire({
    title: 'Êtes-vous sûr ?',
    text: `Vous êtes sur le point de supprimer l'utilisateur ${user.nom}.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Oui, supprimer !',
    cancelButtonText: 'Annuler'
  }).then((result) => {
    if (result.isConfirmed) {
      this.AuthService.deleteUser(user.id_user).subscribe({
        next: () => {
          this.loadUsers();
          Swal.fire({
            icon: 'success',
            title: 'Supprimé',
            text: 'L\'utilisateur a été supprimé avec succès !',
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Impossible de supprimer l\'utilisateur. Veuillez réessayer.',
          });
          console.error('Erreur suppression utilisateur:', err);
        }
      });
    }
  });
}
}
