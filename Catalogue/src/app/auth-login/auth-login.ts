import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../service/auth-service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, RouterModule],
  templateUrl: './auth-login.html',
  styleUrls: ['./auth-login.css']
})
export class AuthLogin {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@teamwillgroup\.com$/)
        ]
      ],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Hold on',
        text: 'Fill in all fields correctly.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    const { email, password, remember } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (res: any) => {
        // ✅ Sauvegarde du token
        this.authService.saveToken(res.token);

        // ✅ Stocker le rôle de l'utilisateur
        const roleId = res.user.id_role;
        sessionStorage.setItem('userRole', roleId === 1 ? 'admin' : 'formateur');

        // ✅ NOUVEAU : Stocker l'ID utilisateur et ses informations
        sessionStorage.setItem('userId', res.user.id_user.toString());
        sessionStorage.setItem('userName', res.user.nom || '');
        sessionStorage.setItem('userPrenom', res.user.prenom || '');
        sessionStorage.setItem('userEmail', res.user.email || '');

        if (remember) this.authService.saveToken(res.token);

        Swal.fire({
          icon: 'success',
          title: 'Welcome',
          text: 'Login avec succès.',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          // Redirection selon le rôle
          if (roleId === 2) {
            this.router.navigate(['formation']);   // admin
          } else {
            this.router.navigate(['formateur']);  // formateur
          }
        });
      },

      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Access refus',
          text: err.error?.message || 'Email ou mot de passe invalide',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}