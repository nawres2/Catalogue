import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { Formation } from '../model/formation.model';
import { StorageService } from './storage-service'; // ✅ Importer

export interface Pays {
  id_pays: number;
  nom: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormationService {
 
  private apiUrl = 'http://localhost:3000/api';
  formateurs: any[] = [];
  
  constructor(
    private http: HttpClient,
    private storage: StorageService // ✅ Injecter StorageService
  ) { }
 
  getFormations(): Observable<Formation[]> {
    return this.http.get<Formation[]>('http://localhost:3000/api/formations?etat=validee');
  }
  
  // ✅ CORRIGÉ : Utiliser StorageService
  getOnboardingSessions(lang?: string): Observable<any[]> {
    if (!lang) {
      lang = this.storage.getItem('selectedLanguage') || 
             this.storage.getItem('lang', 'fr');
    }
    
    console.log(`🌐 FormationService: Requête OnBoarding avec lang=${lang}`);
    
    return this.http.get<any[]>(`${this.apiUrl}/onboarding/sessionsPay?lang=${lang}`).pipe(
      tap(data => console.log(`✅ Sessions OnBoarding reçues (${lang}):`, data)),
      catchError(err => {
        console.error('❌ Erreur chargement OnBoarding:', err);
        return of([]);
      })
    );
  }

  // ✅ CORRIGÉ : Utiliser StorageService
  getOnboardingDetails(id: number, lang?: string): Observable<any> {
    if (!lang) {
      lang = this.storage.getItem('selectedLanguage') || 
             this.storage.getItem('lang', 'fr');
    }
    
    console.log(`🌐 FormationService: Détails session ${id} avec lang=${lang}`);
    return this.http.get<any>(`${this.apiUrl}/onboarding/${id}/details?lang=${lang}`);
  }
 
  getFormationById(id: number): Observable<Formation> {
    return this.http.get<Formation>(`${this.apiUrl}/formation/${id}`);
  }
  
  addFormation(formation: Formation): Observable<any> {
    return this.http.post(`${this.apiUrl}/FormationAttent`, formation);
  }
  
  loadFormateurs(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/api/formateurs');
  }
  
  getPays(): Observable<Pays[]> {
    return this.http.get<Pays[]>(`${this.apiUrl}/pays`);
  }
  
  // ✅ CORRIGÉ : Utiliser StorageService
  getFormationsByFormateur(etat: 'en_attente' | 'validee' | 'refusee'): Observable<any[]> {
    const params = new HttpParams().set('etat', etat);
   
    const token = this.storage.getItem('token');
    if (!token) {
      throw new Error('Utilisateur non authentifié');
    }
   
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const url = `${this.apiUrl}/formations/formateur`;
   
    return this.http.get<any[]>(url, { params, headers });
  }
 
  updateFormation(id_formation: number, formationData: any, token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(`http://localhost:3000/api/formations/${id_formation}`, formationData, { headers });
  }
 
  deleteFormation(id_formation: number, token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.delete(`http://localhost:3000/api/formations/${id_formation}`, { headers });
  }
 
  getOnboardingFormationsByPays(paysIds: number[]): Observable<Formation[]> {
    const paysParam = paysIds.join(',');
    const params = new HttpParams().set('pays', paysParam);
    return this.http.get<Formation[]>(`${this.apiUrl}/OnBording`, { params });
  }
 
  // ✅ CORRIGÉ : Utiliser StorageService
  createItem(endpoint: string, payload: any): Observable<any> {
    const token = this.storage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
   
    return this.http.post(endpoint, payload, { headers });
  }
  
  getObjectifs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/objectifs`);
  }
 
  getCompetences(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/competences`);
  }
 
  // ✅ CORRIGÉ : Utiliser StorageService
  getAllOnboardingFormations(): Observable<Formation[]> {
    const lang = this.storage.getItem('selectedLanguage') || 
                 this.storage.getItem('lang', 'fr');
    
    console.log(`🌐 getAllOnboardingFormations avec lang=${lang}`);
    
    return this.http.get<Formation[]>(`${this.apiUrl}/formations/onboarding`).pipe(
      map(formations => {
        console.log('🎯 OnBoarding formations reçues:', formations.length);
       
        return formations.map(f => {
          console.log('Formation:', f.intitule, 'Pays:', f.pays);
         
          return {
            ...f,
            objectifs: f.objectifs || [],
            competences: f.competences || [],
            pays: f.pays || []
          };
        });
      }),
      catchError(error => {
        console.error('❌ Erreur chargement OnBoarding:', error);
        return of([]);
      })
    );
  }
}