import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Formation {
  id_formation?: number;
  intitule: string;
  axe: string;
  axe_code?: string;
  niveau: string;
  population?: string;
  prerequis?: string;
  description?: string;
  interne_externe?: string;
  id_formateur?: number;
  etat?: string;
  nom_formateur?: string;
  prenom_formateur?: string;
  objectifs?: Objectif[];
  competences?: Competence[];
}

export interface Objectif {
  id_objectif: number;
  libelle: string;
}

export interface Competence {
  id_competence: number;
  libelle: string;
}

export interface Formateur {
  id_user: number;
  nom: string;
  prenom: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormationService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getFormationRequests(): Observable<Formation[]> {
    return this.http.get<Formation[]>(`${this.apiUrl}/formations/attente`);
  }

  getFormationDetails(idFormation: number): Observable<Formation> {
    return this.http.get<Formation>(`${this.apiUrl}/formations/${idFormation}/details`);
  }

  validerFormation(idFormation: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${idFormation}/valider`, {});
  }

  refuserFormation(idFormation: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${idFormation}/refuser`, {});
  }

  getFormateurs(): Observable<Formateur[]> {
    return this.http.get<Formateur[]>(`${this.apiUrl}/formateurs`);
  }
}
