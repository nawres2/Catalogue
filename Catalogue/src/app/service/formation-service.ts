import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { Formation } from '../model/formation.model';
export interface Pays {
  id_pays: number;
  nom: string;
}
@Injectable({
  providedIn: 'root'
})
export class FormationService {

  private apiUrl = 'http://localhost:3000/api';  // Your backend API base URL
formateurs: any[] = [];
  constructor(private http: HttpClient) { }

  getFormations(): Observable<Formation[]> {
    return this.http.get<Formation[]>(`${this.apiUrl}/formations`);
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
getFormationsByFormateur(etat: 'en_attente' | 'validee' | 'refusee'): Observable<any[]> {
  const params = new HttpParams().set('etat', etat);
  
  const token = localStorage.getItem('token'); // must match how you stored it
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

  // DELETE a formation
  deleteFormation(id_formation: number, token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.delete(`http://localhost:3000/api/formations/${id_formation}`, { headers });
  }

  getOnboardingFormationsByPays(paysIds: number[]): Observable<Formation[]> {
  const paysParam = paysIds.join(',');
  const params = new HttpParams().set('pays', paysParam);
  return this.http.get<Formation[]>(`${this.apiUrl}/OnBording`, { params });
}



createItem(endpoint: string, payload: any): Observable<any> {
  const token = localStorage.getItem('token') || '';
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

// ✅ Ajoutez cette méthode dans votre FormationService

getAllOnboardingFormations(): Observable<Formation[]> {
  return this.http.get<Formation[]>(`${this.apiUrl}/formations/onboarding`).pipe(
    map(formations => {
      console.log('🎯 OnBoarding formations reçues:', formations.length);
      
      // Enrichir chaque formation avec objectifs et compétences
      return formations.map(f => {
        console.log('Formation:', f.intitule, 'Pays:', f.pays);
        
        return {
          ...f,
          objectifs: f.objectifs || [],
          competences: f.competences || [],
          pays: f.pays || []  // ✅ S'assurer que pays est bien présent
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


