import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private apiUrl = 'http://localhost:8080/translate';  // ✅ VÉRIFIEZ CETTE LIGNE
  private currentLanguage$ = new BehaviorSubject<string>('fr');
  private isBrowser: boolean;
  
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      const savedLang = localStorage.getItem('selectedLanguage') || 'fr';
      this.currentLanguage$.next(savedLang);
    }
  }

  translateText(text: string | undefined, targetLang: string): Observable<string> {
    if (!text || targetLang === 'fr') {
      return new Observable(observer => {
        observer.next(text || '');
        observer.complete();
      });
    }

    const body = {
      q: text,
      source: 'fr',
      target: 'en'
    };

    // ✅ Utilisez this.apiUrl partout
    return this.http.post<any>(this.apiUrl, body).pipe(
      map(response => response.translatedText || text)
    );
  }

  async translateArray(texts: string[] | undefined, targetLang: string): Promise<string[]> {
    if (!texts || texts.length === 0 || targetLang === 'fr') {
      return texts || [];
    }

    try {
      const promises = texts.map(text => 
        this.translateText(text, targetLang).toPromise()
      );

      const results = await Promise.all(promises);
      return results.filter((text): text is string => text !== undefined);
    } catch (error) {
      console.error('Error translating array:', error);
      return texts;
    }
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