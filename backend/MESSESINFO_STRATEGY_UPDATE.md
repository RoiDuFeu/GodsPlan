# 🔄 MessesInfo.fr - Mise à jour de stratégie

**Date:** 2026-04-05  
**Découverte:** MessesInfo.fr est une Single Page Application (SPA) JavaScript

---

## ❌ Problème initial

Le parser HTML développé ne peut pas extraire les données car:

1. **Le site est une SPA** (Single Page Application)
   - Tout le contenu est chargé dynamiquement via JavaScript
   - Le HTML brut ne contient que `<div id='cef-root'></div>`
   - Données affichées uniquement après exécution JS client-side

2. **Pas d'API publique documentée**
   - `/api/v2/search` n'existe pas (retourne HTML error page)
   - Les données sont probablement dans le JavaScript compilé (GWT)

3. **Redirection de domaine**
   - `messesinfo.fr` → `messes.info` (301)
   - HTTPS non accessible, HTTP uniquement

---

## ✅ Solutions possibles

### Option 1: Browser automation (Puppeteer/Playwright) ⭐ **RECOMMANDÉ**

**Avantage:** Fonctionne même avec JavaScript, bypass des protections  
**Inconvénient:** Plus lent (~3-4s/page), consomme plus de ressources

**Implémentation:**

```bash
# Déjà disponible dans le projet
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend
npm install puppeteer  # Si pas déjà installé
```

**Script à créer:**

```javascript
// scripts/1-scrape-messesinfo-puppeteer.js
const puppeteer = require('puppeteer');

async function scrapeMessesInfo(city, limit = 20) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Naviguer vers la page recherche
  await page.goto(`https://messes.info/annuaire/?search=${city}`, {
    waitUntil: 'networkidle2'
  });
  
  // Attendre que le contenu JS soit chargé
  await page.waitForSelector('.church-item, .result-item, [data-church]', { timeout: 10000 });
  
  // Extraire les données
  const churches = await page.evaluate(() => {
    const results = [];
    const items = document.querySelectorAll('.church-item, .result-item');
    
    items.forEach(item => {
      const name = item.querySelector('h2, .name')?.textContent?.trim();
      const address = item.querySelector('.address')?.textContent?.trim();
      const url = item.querySelector('a')?.href;
      
      if (name && url) {
        results.push({ name, address, url });
      }
    });
    
    return results;
  });
  
  await browser.close();
  return churches;
}

// Usage
scrapeMessesInfo('Paris', 10).then(console.log);
```

**ETA:** 2-3h (inspection UI + sélecteurs CSS + détails par église)

---

### Option 2: Reverse-engineer l'API mobile 🔍

**Contexte:** Le site mentionne une app mobile (iOS/Android)

```html
<meta name="smartbanner:button-url-google" 
      content="https://play.google.com/store/apps/details?id=cef.messesinfo&hl=fr">
```

**Approche:**

1. Installer l'app Android/iOS
2. Intercepter les requêtes réseau (Burp Suite, Charles Proxy, mitmproxy)
3. Identifier les endpoints API utilisés
4. Reproduire en Python

**Avantage:** API directe = rapide + structuré  
**Inconvénient:** Peut être authentifié, rate-limité, non public

**ETA:** 4-6h (reverse engineering + test + implémentation)

---

### Option 3: Utiliser l'API publique diocésaine 🏛️

**Contexte:** Chaque diocèse a son propre site avec des données structurées

Exemples:
- **Paris:** https://www.diocese-paris.net
- **Lyon:** https://lyon.catholique.fr
- **Marseille:** https://marseille.catholique.fr

**Avantage:** HTML plus simple, souvent avec RSS/calendriers  
**Inconvénient:** Structure différente par diocèse (103 diocèses en France!)

**Stratégie:**

1. Parser les **5-10 plus gros diocèses** (couvrent 40% des paroisses)
2. Créer un template par diocèse
3. Laisser les petits diocèses pour plus tard

**ETA:** 6-8h (templates multiples + tests)

---

### Option 4: Scraping Google avec ML extractor 🤖

**Idée:** Contourner messesinfo.fr complètement

**Workflow:**

```
1. Google Search: "église paris horaires messe"
   → Récupère sites officiels des églises

2. ML Extractor (déjà prêt!)
   → Parse chaque site pour extraire:
   - Nom, adresse, contact
   - Horaires de messes
   - Événements
   
3. Import BDD
```

**Avantage:** Données directement depuis sources officielles (meilleure qualité)  
**Inconvénient:** Google API payante après 100 req/jour (gratuit en dessous)

**ETA:** 2h (déjà 80% prêt, juste besoin de Google Search API)

---

## 🎯 Recommandation finale

### Plan A: **Puppeteer + ML Extractor** (hybride)

1. **Puppeteer pour messesinfo.fr:**
   - Extraire liste d'églises (nom, ville, code postal)
   - Pas besoin d'horaires détaillés (trop complexe)
   
2. **Google Search pour URLs de sites:**
   - Trouver site officiel de chaque église
   
3. **ML Extractor pour enrichissement:**
   - Parser sites officiels (déjà fonctionnel!)
   - Extraire contact, horaires, événements

**Timeline:**

| Étape | Durée | Description |
|-------|-------|-------------|
| 1. Puppeteer listing | 2h | Scrape noms/villes depuis messes.info |
| 2. Google Search URLs | 1h | API pour trouver sites officiels |
| 3. ML Enrichment | 1h | Batch processing (déjà prêt) |
| 4. Import BDD | 2h | Script TypeScript |
| **Total** | **6h** | Pipeline complet end-to-end |

**Avantages:**

- ✅ Combine le meilleur des 3 mondes
- ✅ ML Extractor déjà validé (haute précision)
- ✅ Données fraîches depuis sites officiels
- ✅ Pas de dépendance sur structure messesinfo.fr

---

### Plan B: **Diocèses uniquement** (rapide mais limité)

Si besoin de résultats rapides pour un MVP:

1. Parser **diocèse de Paris** uniquement (300-400 paroisses)
2. Enrichir avec ML Extractor
3. Scale aux autres diocèses plus tard

**Timeline:** 3-4h pour Paris only

---

## 🚀 Prochaine action immédiate

**Recommandation:** **Plan A (Puppeteer + ML Extractor)**

**Livrable attendu:**

```json
[
  {
    "name": "Église Saint-Sulpice",
    "city": "Paris",
    "postal_code": "75006",
    "messesinfo_url": "https://messes.info/eglise/...",
    "official_website": "https://www.stsulpice.com",  // ← Google Search
    "phone": "01 42 34 59 98",                         // ← ML Extractor
    "email": "contact@stsulpice.com",                  // ← ML Extractor
    "mass_times": [...],                               // ← ML Extractor
    "confidence": 0.87
  }
]
```

**Script à créer:**

```bash
scripts/
├── 1-scrape-messesinfo-puppeteer.js  # Liste d'églises (nom/ville)
├── 2-find-websites-google.py         # URLs sites officiels
└── 3-enrich-ml.sh                    # ML Extractor (déjà prêt)
```

---

## 📊 Comparaison des options

| Option | Complexité | Vitesse | Qualité données | Coût API | Maintenance |
|--------|------------|---------|-----------------|----------|-------------|
| **Puppeteer seul** | Moyenne | Lente | Moyenne | 0€ | Haute (SPA fragile) |
| **API mobile** | Haute | Rapide | Haute | 0€ | Faible (si stable) |
| **Diocèses** | Haute | Moyenne | Haute | 0€ | Très haute (103!) |
| **Plan A (hybride)** | Moyenne | Moyenne | **Très haute** | ~5€/mois | Moyenne |
| **ML Extractor only** | Faible | Lente | **Très haute** | 5€/mois | **Faible** |

---

## 💡 Insight clé

**messesinfo.fr est une base de données d'URLs**, pas de données riches.

→ **Mieux vaut parser les sites officiels directement** (ML Extractor)

→ messesinfo.fr sert juste à découvrir quelles églises existent

---

## ✅ Décision finale

**Abandonner** le parser HTML pur (non fonctionnel sur SPA)

**Implémenter** Plan A (Puppeteer listing + Google Search + ML Extractor)

**ETA production:** 6-8h de dev

---

**Créé par:** Artemis  
**Date:** 2026-04-05 03:15 UTC  
**Statut:** ⚠️ STRATEGY PIVOT REQUIRED
