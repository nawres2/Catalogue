"""
Backend Flask pour traduction ultra-rapide
Fichier: backend/app.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator
from concurrent.futures import ThreadPoolExecutor, as_completed

app = Flask(__name__)
CORS(app)  # Permet les requêtes depuis Angular (localhost:4200)

# Configuration
MAX_WORKERS = 50  # Nombre de threads parallèles

def translate_single(text, source='fr', target='en'):
    """Traduit un seul texte"""
    try:
        if not text or text.strip() == '':
            return text
        translator = GoogleTranslator(source=source, target=target)
        return translator.translate(text)
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return text

def translate_chunk(texts, source='fr', target='en'):
    """Traduit plusieurs textes EN PARALLÈLE"""
    results = [None] * len(texts)
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Soumettre toutes les traductions
        future_to_index = {
            executor.submit(translate_single, text, source, target): i 
            for i, text in enumerate(texts)
        }
        
        # Récupérer les résultats
        for future in as_completed(future_to_index):
            index = future_to_index[future]
            try:
                results[index] = future.result()
            except Exception as e:
                print(f"❌ Error at index {index}: {str(e)}")
                results[index] = texts[index]
    
    return results

@app.route('/translate-batch', methods=['POST'])
def translate_batch():
    """
    🚀 ENDPOINT ULTRA-RAPIDE
    POST /translate-batch
    Body: { texts: ["texte1", "texte2", ...], source: "fr", target: "en" }
    Returns: { translations: ["translation1", "translation2", ...] }
    """
    try:
        data = request.json
        texts = data.get('texts', [])
        source = data.get('source', 'fr')
        target = data.get('target', 'en')
        
        if not texts:
            return jsonify({'error': 'No texts provided'}), 400
        
        print(f"🔥 Batch: {len(texts)} texts ({source} → {target})")
        
        # Traduire en parallèle
        translations = translate_chunk(texts, source, target)
        
        print(f"✅ Done: {len(translations)} texts")
        
        return jsonify({
            'translations': translations,
            'count': len(translations)
        })
        
    except Exception as e:
        print(f"❌ Batch error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/translate', methods=['POST'])
def translate():
    """
    Endpoint single (ancien système - gardé pour compatibilité)
    POST /translate
    Body: { q: "texte", source: "fr", target: "en" }
    """
    try:
        data = request.json
        text = data.get('q', '')
        source = data.get('source', 'fr')
        target = data.get('target', 'en')
        
        if not text:
            return jsonify({'translatedText': ''})
        
        translated = translate_single(text, source, target)
        
        return jsonify({'translatedText': translated})
        
    except Exception as e:
        print(f"❌ Translation error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Test si le serveur fonctionne"""
    return jsonify({'status': 'ok', 'message': 'Server is running'})

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Flask Translation Server")
    print("=" * 50)
    print(f"📊 Max parallel workers: {MAX_WORKERS}")
    print(f"🌐 Server: http://localhost:5000")
    print(f"📡 Endpoints:")
    print(f"   - POST /translate-batch (bulk translation)")
    print(f"   - POST /translate (single text)")
    print(f"   - GET  /health (health check)")
    print("=" * 50)
    
    app.run(debug=True, port=5000, threaded=True, host='0.0.0.0')