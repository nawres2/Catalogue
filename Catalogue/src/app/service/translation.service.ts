import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private apiUrl = 'http://localhost:5000/translate';
  private batchApiUrl = 'http://localhost:5000/translate-batch'; // NOUVEAU endpoint batch
  private currentLanguage$ = new BehaviorSubject<string>('fr');
  private isBrowser: boolean;
  
  private translationCache = new Map<string, string>();
  
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      const savedLang = localStorage.getItem('selectedLanguage') || 'fr';
      this.currentLanguage$.next(savedLang);
      this.loadCacheFromStorage();
    }
  }

  /**
   * 🚀 ULTRA-FAST BATCH TRANSLATION (20-50 secondes pour 1600 textes)
   * Utilise un endpoint batch côté serveur
   */
  async translateBatchOptimized(texts: string[], targetLang: string = 'en'): Promise<string[]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    console.log(`⚡ ULTRA-FAST translation: ${texts.length} texts`);
    const startTime = Date.now();
    
    // Séparer les textes en cache et non-cache
    const results: string[] = new Array(texts.length);
    const toTranslate: { index: number; text: string }[] = [];
    
    texts.forEach((text, index) => {
      if (!text || text.trim() === '' || targetLang === 'fr') {
        results[index] = text || '';
        return;
      }
      
      const cacheKey = `${text}_${targetLang}`;
      const cached = this.translationCache.get(cacheKey);
      
      if (cached) {
        results[index] = cached;
      } else {
        toTranslate.push({ index, text });
      }
    });
    
    console.log(`💾 Cache: ${texts.length - toTranslate.length}/${texts.length} hits`);
    
    if (toTranslate.length === 0) {
      console.log(`✅ All from cache in ${Date.now() - startTime}ms`);
      return results;
    }
    
    // Traduire par chunks de 100 textes en PARALLÈLE
    const chunkSize = 100;
    const chunks: { index: number; text: string }[][] = [];
    
    for (let i = 0; i < toTranslate.length; i += chunkSize) {
      chunks.push(toTranslate.slice(i, i + chunkSize));
    }
    
    console.log(`🔥 Translating ${toTranslate.length} texts in ${chunks.length} parallel batches`);
    
    try {
      // Envoyer TOUS les chunks en PARALLÈLE
      const chunkPromises = chunks.map(chunk => 
        this.translateBatch(chunk.map(item => item.text), targetLang)
      );
      
      const translatedChunks = await Promise.all(chunkPromises);
      
      // Reconstituer les résultats
      let chunkIndex = 0;
      let itemIndex = 0;
      
      for (const chunk of chunks) {
        const translations = translatedChunks[chunkIndex];
        
        for (let i = 0; i < chunk.length; i++) {
          const originalIndex = chunk[i].index;
          const translated = translations[i];
          results[originalIndex] = translated;
          
          // Mettre en cache
          const cacheKey = `${chunk[i].text}_${targetLang}`;
          this.translationCache.set(cacheKey, translated);
        }
        
        chunkIndex++;
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Translation complete in ${duration}s`);
      
      this.saveCacheToStorage();
      return results;
      
    } catch (error) {
      console.error('❌ Batch translation error:', error);
      // Fallback: traduire séquentiellement par petits groupes
      return this.translateBatchFallback(texts, targetLang);
    }
  }

  /**
   * 🔥 Traduit un batch de textes via l'API batch
   */
  private async translateBatch(texts: string[], targetLang: string): Promise<string[]> {
    try {
      const body = { 
        texts: texts, 
        source: 'fr', 
        target: targetLang 
      };
      
      const response = await this.http.post<any>(this.batchApiUrl, body).toPromise();
      return response.translations || texts;
      
    } catch (error) {
      // Si l'endpoint batch n'existe pas, utiliser l'ancien système
      console.warn('⚠️ Batch endpoint not available, using individual requests');
      return Promise.all(texts.map(text => this.translateTextAsync(text, targetLang)));
    }
  }

  /**
   * 🔄 Fallback: traduction avec l'ancienne méthode
   */
  private async translateBatchFallback(texts: string[], targetLang: string): Promise<string[]> {
    console.log('🔄 Using fallback translation method');
    const results: string[] = [];
    const chunkSize = 50;
    
    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(text => this.translateTextAsync(text, targetLang))
      );
      results.push(...chunkResults);
    }
    
    return results;
  }

  /**
   * 🚀 Traduit un seul texte avec cache
   */
  async translateTextAsync(text: string | undefined, targetLang: string = 'en'): Promise<string> {
    if (!text || text.trim() === '' || targetLang === 'fr') {
      return text || '';
    }

    const cacheKey = `${text}_${targetLang}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const body = { q: text, source: 'fr', target: targetLang };
      const response = await this.http.post<any>(this.apiUrl, body).toPromise();
      const translated = response.translatedText || text;
      this.translationCache.set(cacheKey, translated);
      return translated;
    } catch (error) {
      console.error('Erreur traduction:', error);
      return text;
    }
  }

  /**
   * 💾 Sauvegarder le cache dans localStorage
   */
  private saveCacheToStorage(): void {
    if (!this.isBrowser) return;
    
    try {
      const cacheObject: { [key: string]: string } = {};
      this.translationCache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      localStorage.setItem('translationCache', JSON.stringify(cacheObject));
      console.log(`💾 Cache saved: ${this.translationCache.size} entries`);
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }

  /**
   * 📂 Charger le cache depuis localStorage
   */
  private loadCacheFromStorage(): void {
    if (!this.isBrowser) return;
    
    try {
      const cached = localStorage.getItem('translationCache');
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

  /**
   * 🎯 Traduit un seul texte (version Observable)
   */
  translateText(text: string | undefined, targetLang: string): Observable<string> {
    if (!text || targetLang === 'fr') {
      return of(text || '');
    }

    const cacheKey = `${text}_${targetLang}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    const body = { q: text, source: 'fr', target: targetLang };

    return this.http.post<any>(this.apiUrl, body).pipe(
      map(response => {
        const translated = response.translatedText || text;
        this.translationCache.set(cacheKey, translated);
        return translated;
      }),
      catchError(error => {
        console.error('Translation error:', error);
        return of(text);
      })
    );
  }

  clearCache() {
    this.translationCache.clear();
    if (this.isBrowser) {
      localStorage.removeItem('translationCache');
    }
    console.log('🗑️ Cache cleared');
  }

  setLanguage(lang: string) {
    this.currentLanguage$.next(lang);
    if (this.isBrowser) {
      localStorage.setItem('selectedLanguage', lang);
    }
  }

  getLanguage(): Observable<string> {
    return this.currentLanguage$.asObservable();
  }

  getCurrentLanguage(): string {
    return this.currentLanguage$.value;
  }
}