# 📸 Screenshots Guide - GodsPlan Design Upgrade

## Comment capturer le design premium

### Préparation

1. **Démarrer le serveur**
   ```bash
   cd GodsPlan/web
   npm run dev
   ```

2. **Ouvrir dans navigateur**
   - URL: http://localhost:3022
   - Browser: Chrome (meilleur rendu)
   - Résolution: 1920x1080 (desktop) ou DevTools mobile

3. **Charger les données**
   - Attendre le chargement des églises
   - Optionnel: se géolocaliser pour voir les distances

---

## 📸 Screenshots essentiels

### 1. **Light Mode - Vue d'ensemble**
**Objectif:** Montrer le design clair complet

**Steps:**
1. Activer Light mode (si pas déjà)
2. Zoom navigateur: 100%
3. Liste églises visible (sidebar gauche)
4. Map centrée sur Paris avec markers visibles
5. Aucune église sélectionnée

**Capture:**
- Fullscreen (F11)
- Screenshot: `light-mode-overview.png`

**Éléments à capturer:**
- Header avec logo + search + theme toggle (Sun icon)
- Sidebar avec liste églises (3-4 cards visibles)
- Map avec plusieurs markers violets
- Footer stats

---

### 2. **Dark Mode - Vue d'ensemble**
**Objectif:** Montrer le design sombre élégant

**Steps:**
1. Clic sur bouton Sun → Dark mode
2. Même composition que Light
3. Vérifier map tiles dark (CartoDB)

**Capture:**
- Screenshot: `dark-mode-overview.png`

**Éléments à capturer:**
- Header avec Moon icon
- Sidebar avec cards sur fond sombre
- Map dark tiles
- Contraste colors violet chaleureux

---

### 3. **Light Mode - Église sélectionnée**
**Objectif:** Montrer interaction sélection

**Steps:**
1. Light mode
2. Clic sur une église (liste ou map)
3. Vérifier marker pulse + ring
4. Map centrée sur église
5. Popup ouvert

**Capture:**
- Screenshot: `light-mode-selected.png`

**Éléments à capturer:**
- Card sélectionnée (border primary + ring)
- Marker sélectionné (pulse animation - capture au bon moment)
- Popup map ouvert

---

### 4. **Dark Mode - Modal Détails**
**Objectif:** Montrer le modal élégant

**Steps:**
1. Dark mode
2. Clic sur une église avec horaires de messes
3. Modal ouvert
4. Scroll pour voir horaires

**Capture:**
- Screenshot: `dark-mode-modal.png`

**Éléments à capturer:**
- Header modal avec icône église badge
- Nom + adresse
- Badge fiabilité
- Bouton "Itinéraire"
- Tableau horaires de messes
- Background blur (modal overlay)

---

### 5. **Mobile - Sheet List**
**Objectif:** Montrer responsive mobile

**Steps:**
1. DevTools (F12) → Toggle device toolbar
2. Device: iPhone 13 Pro (ou similaire)
3. Vertical orientation
4. Clic sur floating button "Liste des églises"
5. Sheet ouvert à 80%

**Capture:**
- Screenshot: `mobile-sheet.png`

**Éléments à capturer:**
- Header compact
- Map en arrière-plan
- Sheet drawer bottom
- Liste églises dans sheet
- Bouton géolocalisation visible

---

### 6. **Mobile - Modal Détails**
**Objectif:** Montrer modal responsive

**Steps:**
1. Mobile view (DevTools)
2. Sélectionner une église
3. Modal ouvert fullscreen

**Capture:**
- Screenshot: `mobile-modal.png`

**Éléments à capturer:**
- Modal adapté mobile (max-h-90vh)
- Header modal
- Horaires scroll
- Bouton fermer (X)

---

### 7. **Theme Toggle Animation** (optionnel)
**Objectif:** Montrer transition smooth

**Steps:**
1. Outil capture vidéo (OBS, QuickTime, etc.)
2. Clic sur theme toggle
3. Capturer transition (2-3 sec)

**Capture:**
- Video GIF: `theme-toggle.gif`

**Éléments à capturer:**
- Changement couleurs smooth
- Icon rotation (Sun → Moon)
- Map tiles switch

---

### 8. **Loading State**
**Objectif:** Montrer skeleton loaders

**Steps:**
1. DevTools → Network tab
2. Throttling: Slow 3G
3. Rafraîchir page
4. Capturer pendant loading

**Capture:**
- Screenshot: `loading-state.png`

**Éléments à capturer:**
- Skeleton cards (5 grises)
- Animation shimmer
- Bouton géoloc disabled

---

### 9. **Empty State**
**Objectif:** Montrer message élégant

**Steps:**
1. Search bar: taper "xxxnonexistantxxx"
2. Vérifier empty state

**Capture:**
- Screenshot: `empty-state.png`

**Éléments à capturer:**
- Icône MapPinOff dans badge
- Titre "Aucune église trouvée"
- Message centré

---

### 10. **Hover States** (optionnel)
**Objectif:** Montrer micro-interactions

**Steps:**
1. Hover sur card église (sans cliquer)
2. Vérifier lift + shadow
3. Screenshot rapide

**Capture:**
- Screenshot: `hover-state.png`

**Éléments à capturer:**
- Card élevée (-translate-y-0.5)
- Shadow élargie
- Couleur icône changée (primary)

---

## 🎨 Tips pour belles captures

### Composition
- Centrer les éléments importants
- Montrer plusieurs features simultanément
- Éviter trop d'espace vide

### Données
- Sélectionner églises avec noms courts/lisibles
- Afficher églises avec horaires (pour modal)
- Géolocaliser pour montrer distances

### Qualité
- Résolution HD minimum (1920x1080)
- PNG pour screenshots (pas de compression)
- Noms fichiers explicites

### Dark Mode
- Augmenter légèrement luminosité écran (meilleur rendu photos)
- Vérifier contraste texte visible

---

## 📁 Organisation fichiers

Créer dossier:
```
GodsPlan/web/screenshots/
├── light-mode-overview.png
├── dark-mode-overview.png
├── light-mode-selected.png
├── dark-mode-modal.png
├── mobile-sheet.png
├── mobile-modal.png
├── loading-state.png
├── empty-state.png
├── hover-state.png (optionnel)
└── theme-toggle.gif (optionnel)
```

---

## 🛠️ Outils recommandés

### Desktop
- **macOS:** Cmd+Shift+4 (sélection)
- **Windows:** Win+Shift+S (Snipping Tool)
- **Linux:** Flameshot, Spectacle

### Video/GIF
- **macOS:** QuickTime → Record Screen
- **Multi-platform:** OBS Studio
- **GIF:** ScreenToGif, Gifox

### Browser DevTools
- **Chrome DevTools:** Device toolbar (Cmd+Shift+M)
- **Responsive modes:** iPhone, iPad, custom
- **Screenshots DevTools:** Cmd+Shift+P → "Capture screenshot"

---

## 📝 Checklist finale

- [ ] 2 screenshots overview (light + dark)
- [ ] 2 screenshots interaction (selected + modal)
- [ ] 2 screenshots mobile (sheet + modal)
- [ ] 1 screenshot loading state
- [ ] 1 screenshot empty state
- [ ] Optionnel: video theme toggle
- [ ] Optionnel: hover state
- [ ] Fichiers organisés dans `/screenshots`
- [ ] Noms explicites

---

**Prêt pour le portfolio ! 📸✨**
