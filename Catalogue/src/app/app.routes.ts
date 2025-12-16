import { Routes } from '@angular/router';
import { Catalogue } from './catalogue/catalogue';
import { formation } from './formation/formation';
import { AuthLogin } from './auth-login/auth-login';
import { GestUser } from './gest-user/gest-user';
import { AdminGuard } from './admin.guard';
import { Layout } from './layout/layout';

export const routes: Routes = [

  // 🔹 ROUTES WITHOUT SIDEBAR
  {
    path: 'catalogue',
    component: Catalogue
  },
  {
    path: 'login',
    component: AuthLogin
  },

  // 🔹 ROUTES WITH SIDEBAR (LAYOUT)
 {
  path: '',
  component: Layout,
  children: [
    { path: '', redirectTo: 'users', pathMatch: 'full' },
    { path: 'users', component: GestUser },
    { path: 'formation', component: formation }
  ]
},

  // fallback
  { path: '**', redirectTo: '' }
];
