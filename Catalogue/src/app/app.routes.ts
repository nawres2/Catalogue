import { Routes } from '@angular/router';
import { Catalogue } from './catalogue/catalogue';
import { formation } from './formation/formation';
import { AuthLogin } from './auth-login/auth-login';
import { RequestFormation } from './request-formation/request-formation';
import { GestUser } from './gest-user/gest-user';
import { AdminGuard } from './admin.guard';
import { LayoutComponent } from './layout/layout';

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
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', component: GestUser },
      { path: 'formation', component: formation },
      { 
        path: 'formation_demande', 
        component: RequestFormation,
        runGuardsAndResolvers: 'always' // ✅ Force le rechargement
      }
    ],
    runGuardsAndResolvers: 'always' // ✅ Force aussi au niveau du layout
  },

  // fallback
  { path: '**', redirectTo: '' }
];