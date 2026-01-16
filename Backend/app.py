"""
Backend Flask ULTRA-RAPIDE avec LibreTranslate
Fichier: backend/app_libretranslate.py
PORT: 5001

UTILISE LibreTranslate sur le port 5000
Traduction par PHRASE COMPLÈTE (pas mot par mot)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import hashlib
import re

app = Flask(__name__)
CORS(app)

# Configuration
LIBRETRANSLATE_URL = "http://localhost:5000"
MAX_WORKERS = 50
BATCH_SIZE = 100
translation_cache = {}

def get_cache_key(text, source, target):
    """Génère une clé de cache unique"""
    content = f"{source}:{target}:{text}"
    return hashlib.md5(content.encode()).hexdigest()

def preprocess_text(text):
    """
    Prétraite le texte pour forcer une traduction par phrase
    Ajoute des marqueurs pour préserver le contexte
    """
    if not text or not text.strip():
        return text
    
    # Nettoyer les espaces multiples
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Ajouter un point à la fin si absent (aide LibreTranslate à comprendre que c'est une phrase)
    if text and text[-1] not in '.!?':
        text = text + '.'
    
    return text

def postprocess_text(text, original):
    """
    Post-traite le texte traduit
    Enlève le point ajouté artificiellement si nécessaire
    """
    if not text:
        return text
    
    # Si l'original n'avait pas de ponctuation finale, enlever le point ajouté
    if original and original[-1] not in '.!?' and text and text[-1] == '.':
        text = text[:-1]
    
    return text.strip()

def translate_single_libretranslate(text, source='fr', target='en'):
    """
    Traduit un texte COMPLET via LibreTranslate
    Force la traduction par phrase entière
    """
    if not text or not text.strip():
        return text
    
    # Vérifier le cache
    cache_key = get_cache_key(text, source, target)
    if cache_key in translation_cache:
        return translation_cache[cache_key]
    
    original_text = text
    preprocessed = preprocess_text(text)
    
    try:
        # ✅ PARAMÈTRES OPTIMISÉS pour traduction par phrase
        response = requests.post(
            f"{LIBRETRANSLATE_URL}/translate",
            json={
                "q": preprocessed,  # Texte prétraité
                "source": source,
                "target": target,
                "format": "text",
                "alternatives": 0,  # Pas d'alternatives (plus rapide)
            },
            timeout=15,  # Timeout plus long pour phrases complexes
            headers={
                'Content-Type': 'application/json'
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            translated = data.get('translatedText', preprocessed)
            
            # Post-traiter
            translated = postprocess_text(translated, original_text)
            
            # Mettre en cache avec le texte ORIGINAL (pas prétraité)
            translation_cache[cache_key] = translated
            
            return translated
        else:
            print(f"❌ LibreTranslate error {response.status_code}: {response.text}")
            return original_text
            
    except requests.exceptions.Timeout:
        print(f"⏱️ Timeout for: {text[:50]}...")
        return original_text
    except Exception as e:
        print(f"❌ Translation error: {str(e)}")
        return original_text

def translate_batch_parallel(texts, source='fr', target='en'):
    """Traduit un batch en parallèle (phrase par phrase)"""
    results = [None] * len(texts)
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_index = {
            executor.submit(translate_single_libretranslate, text, source, target): i 
            for i, text in enumerate(texts)
        }
        
        completed = 0
        total = len(texts)
        
        for future in as_completed(future_to_index):
            index = future_to_index[future]
            try:
                results[index] = future.result()
                completed += 1
                
                if completed % 50 == 0:
                    print(f"   Progress: {completed}/{total} ({completed*100//total}%)")
                    
            except Exception as e:
                print(f"❌ Error at index {index}: {str(e)}")
                results[index] = texts[index]
    
    return results

@app.route('/translate-batch', methods=['POST'])
def translate_batch():
    """
    🚀 ENDPOINT ULTRA-RAPIDE avec LibreTranslate
    Traduit phrase par phrase (pas mot par mot)
    """
    try:
        data = request.json
        texts = data.get('texts', [])
        source = data.get('source', 'fr')
        target = data.get('target', 'en')
        
        if not texts:
            return jsonify({'error': 'No texts provided'}), 400
        
        print(f"\n{'='*70}")
        print(f"🔥 BATCH TRANSLATION (SENTENCE MODE)")
        print(f"   Total texts: {len(texts)}")
        print(f"   Direction: {source} → {target}")
        print(f"   Cache size: {len(translation_cache)} entries")
        
        # Afficher quelques exemples
        if texts:
            print(f"\n   📝 Examples:")
            for i, text in enumerate(texts[:3]):
                if text and text.strip():
                    print(f"      {i+1}. \"{text[:60]}{'...' if len(text) > 60 else ''}\"")
        
        print(f"{'='*70}")
        
        start_time = time.time()
        
        # Séparer cache et non-cache
        cached_count = 0
        to_translate = []
        to_translate_indices = []
        results = [None] * len(texts)
        
        for i, text in enumerate(texts):
            if not text or not text.strip():
                results[i] = text if text else ''
                continue
                
            cache_key = get_cache_key(text, source, target)
            if cache_key in translation_cache:
                results[i] = translation_cache[cache_key]
                cached_count += 1
            else:
                to_translate.append(text)
                to_translate_indices.append(i)
        
        print(f"\n   📦 Cache hits: {cached_count}/{len(texts)}")
        print(f"   🔄 To translate: {len(to_translate)}")
        
        # Traduire en parallèle
        if to_translate:
            print(f"\n   ⚡ Translating {len(to_translate)} sentences...")
            translations = translate_batch_parallel(to_translate, source, target)
            
            # Afficher quelques résultats
            print(f"\n   ✅ Translation samples:")
            for i in range(min(3, len(translations))):
                orig = to_translate[i][:50]
                trans = translations[i][:50]
                print(f"      • \"{orig}...\" → \"{trans}...\"")
            
            for i, translated in enumerate(translations):
                original_index = to_translate_indices[i]
                results[original_index] = translated
        
        duration = time.time() - start_time
        
        print(f"\n   ✅ DONE in {duration:.2f}s")
        print(f"   Speed: {len(texts)/duration:.1f} texts/sec")
        print(f"{'='*70}\n")
        
        return jsonify({
            'translations': results,
            'count': len(results),
            'cached': cached_count,
            'translated': len(to_translate),
            'duration': round(duration, 2)
        })
        
    except Exception as e:
        print(f"❌ Batch error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/translate', methods=['POST'])
def translate():
    """Endpoint single (phrase complète)"""
    try:
        data = request.json
        text = data.get('q', '')
        source = data.get('source', 'fr')
        target = data.get('target', 'en')
        
        if not text:
            return jsonify({'translatedText': ''})
        
        print(f"\n🔄 Single translation:")
        print(f"   IN:  \"{text}\"")
        
        translated = translate_single_libretranslate(text, source, target)
        
        print(f"   OUT: \"{translated}\"")
        
        return jsonify({'translatedText': translated})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/cache/clear', methods=['POST'])
def clear_cache():
    """Vider le cache"""
    global translation_cache
    count = len(translation_cache)
    translation_cache.clear()
    print(f"🗑️ Cache cleared: {count} entries removed")
    return jsonify({'message': 'Cache cleared', 'entries_removed': count})

@app.route('/cache/stats', methods=['GET'])
def cache_stats():
    """Stats du cache"""
    return jsonify({
        'entries': len(translation_cache),
        'memory_usage': f"{len(str(translation_cache)) / 1024:.2f} KB"
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    try:
        response = requests.get(f"{LIBRETRANSLATE_URL}/languages", timeout=2)
        libretranslate_ok = response.status_code == 200
        
        # Test de traduction
        if libretranslate_ok:
            test_response = requests.post(
                f"{LIBRETRANSLATE_URL}/translate",
                json={"q": "Bonjour", "source": "fr", "target": "en"},
                timeout=2
            )
            test_ok = test_response.status_code == 200
        else:
            test_ok = False
            
    except:
        libretranslate_ok = False
        test_ok = False
    
    return jsonify({
        'status': 'ok' if (libretranslate_ok and test_ok) else 'error',
        'flask_port': 5001,
        'libretranslate_url': LIBRETRANSLATE_URL,
        'libretranslate_connected': libretranslate_ok,
        'libretranslate_working': test_ok,
        'cache_entries': len(translation_cache),
        'max_workers': MAX_WORKERS,
        'mode': 'SENTENCE_TRANSLATION'
    })

if __name__ == '__main__':
    print("=" * 70)
    print("🚀 FLASK with LibreTranslate (SENTENCE MODE)")
    print("=" * 70)
    print(f"📊 Configuration:")
    print(f"   - LibreTranslate URL: {LIBRETRANSLATE_URL}")
    print(f"   - Max parallel workers: {MAX_WORKERS}")
    print(f"   - Translation mode: FULL SENTENCE (not word-by-word)")
    print(f"   - Cache: In-memory")
    print(f"\n🌐 Flask Server: http://localhost:5001")
    print(f"🌐 LibreTranslate: {LIBRETRANSLATE_URL}")
    print(f"\n📡 Endpoints:")
    print(f"   - POST   /translate-batch  (batch translation)")
    print(f"   - POST   /translate        (single translation)")
    print(f"   - GET    /health         s  (check status)")
    print(f"   - GET    /cache/stats      (cache statistics)")
    print(f"   - POST   /cache/clear      (clear cache)")
    print(f"\n⚠️  IMPORTANT:")
    print(f"   1. LibreTranslate must be running on port 5000")
    print(f"   2. Start it with: libretranslate --port 5000")
    print(f"   3. Translations are done SENTENCE by SENTENCE (not word by word)")
    print("=" * 70 + "\n")
    
    app.run(debug=True, port=5001, threaded=True, host='0.0.0.0')