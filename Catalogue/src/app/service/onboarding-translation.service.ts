// onboarding-translation.service.ts
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OnboardingSession } from '../model/onboarding.model';

export interface OnboardingTranslationData {
  sessions: OnboardingSession[];
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingTranslationService {
  private batchApiUrl = 'http://localhost:5001/translate-batch';
  private translationCache = new Map<string, string>();
  private platformId = inject(PLATFORM_ID);
  private isBrowser: boolean;

  // ✅ DICTIONNAIRE DE TRADUCTIONS FIXES POUR ÉVITER LES ERREURS
  private fixedTranslations: { [key: string]: string } = {
    // Titres OnBoarding courants
    'Accueil de nouveau collaborateur': 'New employee welcome',
    'Accueil de nouveaux collaborateurs': 'New employees welcome',
    'Accueil du nouveau collaborateur': 'New employee welcome',
    'Accueil des nouveaux collaborateurs': 'New employees welcome',
    'Intégration de nouveau collaborateur': 'New employee integration',
    'Intégration des nouveaux collaborateurs': 'New employees integration',
    'Onboarding': 'Onboarding',
    'Programme d\'intégration': 'Integration program',
    
    // Populations
    'Nouveau collaborateur': 'New employee',
    'Nouveaux collaborateurs': 'New employees',
    'Tous les collaborateurs': 'All employees',
    'Tous': 'All',
    'Équipe': 'Team',
    'Managers': 'Managers',
    'Direction': 'Management',
    
    // Types d'activités
    'Présentation': 'Presentation',
    'Formation': 'Training',
    'Atelier': 'Workshop',
    'Réunion': 'Meeting',
    'Visite': 'Visit',
    'Pause': 'Break',
    'Déjeuner': 'Lunch',
    'Session de questions': 'Q&A session',
    'Activité de groupe': 'Group activity',
    'Ice breaker': 'Ice breaker',
    'Team building': 'Team building',
    
    // Lieux
    'Salle de réunion': 'Meeting room',
    'Bureau': 'Office',
    'Cafétéria': 'Cafeteria',
    'Salle de formation': 'Training room',
    'En ligne': 'Online',
    'Visioconférence': 'Video conference',
    'À distance': 'Remote',
    
    // Autres expressions courantes
    'Bienvenue': 'Welcome',
    'Accueil': 'Welcome',
    'Présentation de l\'entreprise': 'Company presentation',
    'Visite des locaux': 'Office tour',
    'Rencontre avec l\'équipe': 'Team meeting',
    'Signature des documents': 'Document signing',
    'Configuration du poste': 'Workstation setup',
    'Remise des accès': 'Access delivery'
  };

  constructor(private http: HttpClient) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.loadCacheFromStorage();
    }
  }

  async translateOnboardingData(
    data: OnboardingTranslationData,
    targetLang: string = 'en'
  ): Promise<OnboardingTranslationData> {
    
    if (targetLang === 'fr') {
      return data;
    }

    console.log(`🌐 Starting OnBoarding translation to ${targetLang}...`);
    const startTime = Date.now();

    const textsToTranslate: string[] = [];
    const textMap = new Map<number, { type: string; path: string }>();
    let textIndex = 0;

    data.sessions.forEach((session, sessionIdx) => {
      // Session fields
      this.addText(textsToTranslate, textMap, textIndex++, session.intitule, 'session', `${sessionIdx}.intitule`);
      this.addText(textsToTranslate, textMap, textIndex++, session.planificateur, 'session', `${sessionIdx}.planificateur`);
      this.addText(textsToTranslate, textMap, textIndex++, session.population, 'session', `${sessionIdx}.population`);
      this.addText(textsToTranslate, textMap, textIndex++, session.prerequis, 'session', `${sessionIdx}.prerequis`);

      // Objectifs
      session.objectifs?.forEach((obj, objIdx) => {
        this.addText(textsToTranslate, textMap, textIndex++, obj.libelle, 'objectif', `${sessionIdx}.${objIdx}.libelle`);
      });

      // Jours
      session.jours?.forEach((jour, jourIdx) => {
        this.addText(textsToTranslate, textMap, textIndex++, jour.titre, 'jour', `${sessionIdx}.${jourIdx}.titre`);

        // Activités
        jour.activites?.forEach((act, actIdx) => {
          this.addText(textsToTranslate, textMap, textIndex++, act.titre, 'activite', `${sessionIdx}.${jourIdx}.${actIdx}.titre`);
          this.addText(textsToTranslate, textMap, textIndex++, act.description, 'activite', `${sessionIdx}.${jourIdx}.${actIdx}.description`);
          this.addText(textsToTranslate, textMap, textIndex++, act.lieu, 'activite', `${sessionIdx}.${jourIdx}.${actIdx}.lieu`);
          this.addText(textsToTranslate, textMap, textIndex++, act.animateur, 'activite', `${sessionIdx}.${jourIdx}.${actIdx}.animateur`);
          this.addText(textsToTranslate, textMap, textIndex++, act.type_activite, 'activite', `${sessionIdx}.${jourIdx}.${actIdx}.type_activite`);
        });
      });
    });

    console.log(`📦 Collected ${textsToTranslate.length} texts to translate`);

    const translations = await this.translateBatch(textsToTranslate, targetLang);

    const translatedData: OnboardingTranslationData = { 
      sessions: JSON.parse(JSON.stringify(data.sessions))
    };

    translations.forEach((translated, idx) => {
      const mapping = textMap.get(idx);
      if (!mapping) return;

      const pathParts = mapping.path.split('.');
      const sessionIdx = parseInt(pathParts[0]);
      const rest = pathParts.slice(1);
      
      if (mapping.type === 'session') {
        const field = rest[0] as keyof OnboardingSession;
        if (field !== 'pays') {
          (translatedData.sessions[sessionIdx] as any)[field] = translated;
        }
      } 
      else if (mapping.type === 'objectif') {
        const objIdx = parseInt(rest[0]);
        if (translatedData.sessions[sessionIdx].objectifs) {
          translatedData.sessions[sessionIdx].objectifs![objIdx].libelle = translated;
        }
      }
      else if (mapping.type === 'jour') {
        const jourIdx = parseInt(rest[0]);
        const field = rest[1] as string;
        if (translatedData.sessions[sessionIdx].jours) {
          (translatedData.sessions[sessionIdx].jours![jourIdx] as any)[field] = translated;
        }
      }
      else if (mapping.type === 'activite') {
        const jourIdx = parseInt(rest[0]);
        const actIdx = parseInt(rest[1]);
        const field = rest[2] as string;
        if (translatedData.sessions[sessionIdx].jours?.[jourIdx]?.activites) {
          (translatedData.sessions[sessionIdx].jours![jourIdx].activites[actIdx] as any)[field] = translated;
        }
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ OnBoarding translation complete in ${duration}s`);
    
    if (this.isBrowser) {
      this.saveCacheToStorage();
    }
    return translatedData;
  }

  /**
   * 🔥 TRADUIT UN BATCH DE TEXTES AVEC PRIORITÉ AUX TRADUCTIONS FIXES
   */
  private async translateBatch(texts: string[], targetLang: string): Promise<string[]> {
    const results: string[] = new Array(texts.length);
    const toTranslate: { index: number; text: string }[] = [];
    
    let fixedCount = 0;
    let cachedCount = 0;
    
    texts.forEach((text, index) => {
      if (!text || text.trim() === '') {
        results[index] = text || '';
        return;
      }
      
      // ✅ 1. PRIORITÉ : Vérifier les traductions fixes
      const trimmedText = text.trim();
      if (this.fixedTranslations[trimmedText] && targetLang === 'en') {
        results[index] = this.fixedTranslations[trimmedText];
        fixedCount++;
        console.log(`📌 Fixed translation: "${trimmedText}" → "${this.fixedTranslations[trimmedText]}"`);
        return;
      }
      
      // ✅ 2. Vérifier le cache
      const cacheKey = `${text}_${targetLang}`;
      const cached = this.translationCache.get(cacheKey);
      
      if (cached) {
        results[index] = cached;
        cachedCount++;
      } else {
        toTranslate.push({ index, text });
      }
    });
    
    console.log(`📊 Translation stats:`);
    console.log(`   - Fixed translations: ${fixedCount}`);
    console.log(`   - Cached: ${cachedCount}`);
    console.log(`   - To translate: ${toTranslate.length}`);
    
    if (toTranslate.length === 0) {
      return results;
    }

    // Traduire par chunks de 100 en parallèle
    const chunkSize = 100;
    const chunks: { index: number; text: string }[][] = [];
    
    for (let i = 0; i < toTranslate.length; i += chunkSize) {
      chunks.push(toTranslate.slice(i, i + chunkSize));
    }
    
    console.log(`🔥 Translating ${toTranslate.length} texts in ${chunks.length} parallel batches`);
    
    try {
      const chunkPromises = chunks.map(chunk => 
        this.callBatchAPI(chunk.map(item => item.text), targetLang)
      );
      
      const translatedChunks = await Promise.all(chunkPromises);
      
      // Reconstituer
      let chunkIndex = 0;
      for (const chunk of chunks) {
        const translations = translatedChunks[chunkIndex];
        
        for (let i = 0; i < chunk.length; i++) {
          const originalIndex = chunk[i].index;
          const translated = translations[i];
          results[originalIndex] = translated;
          
          const cacheKey = `${chunk[i].text}_${targetLang}`;
          this.translationCache.set(cacheKey, translated);
        }
        chunkIndex++;
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Batch translation error:', error);
      throw error;
    }
  }

  /**
   * 📡 APPEL API BATCH
   */
  private async callBatchAPI(texts: string[], targetLang: string): Promise<string[]> {
    try {
      const body = { 
        texts: texts, 
        source: 'fr', 
        target: targetLang 
      };
      
      const response = await firstValueFrom(
        this.http.post<{ translations: string[] }>(this.batchApiUrl, body)
      );
      
      return response.translations || texts;
      
    } catch (error) {
      console.error('API batch error:', error);
      return texts;
    }
  }

  /**
   * 🎯 HELPER: Ajoute un texte à traduire
   */
  private addText(
    array: string[], 
    map: Map<number, any>, 
    index: number, 
    text: string | undefined, 
    type: string, 
    path: string
  ): void {
    if (text && text.trim()) {
      array.push(text);
      map.set(index, { type, path });
    } else {
      array.push('');
      map.set(index, { type, path });
    }
  }

  /**
   * 💾 CACHE MANAGEMENT
   */
  private saveCacheToStorage(): void {
    if (!this.isBrowser) return;
    
    try {
      const cacheObject: { [key: string]: string } = {};
      this.translationCache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      localStorage.setItem('onboardingTranslationCache', JSON.stringify(cacheObject));
      console.log(`💾 Cache saved: ${this.translationCache.size} entries`);
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  private loadCacheFromStorage(): void {
    if (!this.isBrowser) return;
    
    try {
      const cached = localStorage.getItem('onboardingTranslationCache');
      if (cached) {
        const cacheObject = JSON.parse(cached);
        Object.entries(cacheObject).forEach(([key, value]) => {
          this.translationCache.set(key, value as string);
        });
        console.log(`📂 Cache loaded: ${this.translationCache.size} entries`);
      }
    } catch (error) {
      console.error('Cache load error:', error);
    }
  }

  clearCache(): void {
    this.translationCache.clear();
    if (this.isBrowser) {
      localStorage.removeItem('onboardingTranslationCache');
    }
    console.log('🗑️ OnBoarding translation cache cleared');
  }
}