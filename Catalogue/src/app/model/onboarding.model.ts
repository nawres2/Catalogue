export interface Objectif {
  libelle: string;
}
 
export interface Activite {
  heure_debut: string;
  heure_fin: string;
  titre: string;
  description?: string;
  lieu?: string;
  animateur?: string;
  type_activite: string;
}
 
export interface Jour {
  numero_jour: number;
  titre: string;
  date_jour: string;
  activites: Activite[];
}
 
export interface OnboardingSession {
  id_session?: number;
  intitule: string;
  pays: string;
  date_debut: string;
  date_fin: string;
  duree?: string;
  population?: string;
  prerequis?: string;
  planificateur?: string;
  etat: 'brouillon' | 'validee';
  objectifs?: Objectif[];
  jours?: Jour[];
  nombre_jours?: number;
  nombre_activites?: number;
}
 