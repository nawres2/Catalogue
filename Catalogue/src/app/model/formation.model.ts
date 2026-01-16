// formation.model.ts

export interface Pays {
  id_pays: number;
  nom: string;
}

// ✅ Onboarding Session types
export interface Objectif {
  id_objectif?: number;  // ✅ Optionnel car peut être absent à la création
  libelle: string;
  ordre?: number;
}

export interface Activite {
  id_activite?: number;  // ✅ Optionnel
  heure_debut: string;
  heure_fin: string;
  titre: string;
  description?: string;
  lieu?: string;
  animateur?: string;
  type_activite: string;
  ordre?: number;        // ✅ Optionnel
}

export interface Jour {
  id_jour?: number;      // ✅ Optionnel
  numero_jour: number;
  titre: string;
  date_jour: string;
  activites: Activite[];
}

export interface OnboardingSession {
  id_session?: number;
  intitule: string;
  pays: string;           // ✅ Nom du pays en string
  date_debut: string;
  date_fin: string;
  duree?: string;
  population?: string;
  prerequis?: string;
  planificateur?: string;
  etat?: 'brouillon' | 'validee';  // ✅ Optionnel avec valeur par défaut
  objectifs?: Objectif[];
  jours?: Jour[];
  nombre_jours?: number;
  nombre_activites?: number;
}

// ✅ Formation interface with all required fields
export interface Formation {
  id_formation: number;
  id_formateur: number;
  intitule: string;
  duree: string;
  prerequis: string;
  population: string;
  axe: string;
  axe_code: string;
  parcours: string;
  pays: any[];
  niveau: string;
  type: string;
  formateur: string;
  prestataire: string;
  objectifs: string[];
  competences: string[];
  interne_externe: 'interne' | 'externe';
  source?: 'formation' | 'onboarding_session';  // ✅ AJOUT
  onboarding_data?: {
    id_session: number;
    intitule: string;
    pays: string;
    planificateur: string;
    date_debut: string;
    date_fin: string;
    duree: string;
    population: string;
    prerequis: string;
    etat: string;
    objectifs: any[];
    jours: any[];
    nombre_jours: number;
    nombre_activites: number;
  };
}