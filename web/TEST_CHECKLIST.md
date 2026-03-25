# ✅ Test Checklist - GodsPlan Design Upgrade

## 🎨 Theme Switching

- [ ] **Light Mode**
  - [ ] Ouvrir http://localhost:3022
  - [ ] Vérifier background blanc pur
  - [ ] Vérifier texte noir/gris foncé
  - [ ] Vérifier accent violet premium
  - [ ] Map tiles OSM standard

- [ ] **Dark Mode**
  - [ ] Cliquer sur bouton Sun (top right)
  - [ ] Vérifier background gris anthracite
  - [ ] Vérifier texte blanc/gris clair
  - [ ] Vérifier accent violet chaleureux
  - [ ] Map tiles CartoDB Dark

- [ ] **System Mode**
  - [ ] Cliquer 2x pour atteindre mode System
  - [ ] Vérifier suit préférences OS
  - [ ] Changer thème OS → vérifier changement app

- [ ] **Persistence**
  - [ ] Changer de thème
  - [ ] Rafraîchir page (F5)
  - [ ] Vérifier thème conservé
  - [ ] DevTools → Application → Local Storage → `godsplan-ui-theme`

---

## 🗺️ Map Interactions

- [ ] **Navigation basique**
  - [ ] Zoom molette souris
  - [ ] Zoom boutons +/-
  - [ ] Pan (glisser map)
  - [ ] Double-clic pour zoom

- [ ] **Markers églises**
  - [ ] Vérifier markers violets (icône église)
  - [ ] Hover sur marker → scale + shadow
  - [ ] Clic sur marker → sélection + popup

- [ ] **Marker sélectionné**
  - [ ] Clic sur église (liste ou map)
  - [ ] Vérifier marker avec pulse animation
  - [ ] Vérifier ring glow autour
  - [ ] Vérifier popup ouvert

- [ ] **Popups**
  - [ ] Clic sur marker
  - [ ] Vérifier nom église
  - [ ] Vérifier adresse
  - [ ] Vérifier distance (si géolocalisé)
  - [ ] Style cohérent dark/light

---

## 📋 Sidebar / Liste Églises

### Desktop (> 768px)

- [ ] **Layout**
  - [ ] Sidebar 384px fixe à gauche
  - [ ] Border droite visible
  - [ ] Scroll vertical smooth (ScrollArea)

- [ ] **Bouton Géolocalisation**
  - [ ] Visible en haut
  - [ ] Icône MapPinOff (avant géoloc)
  - [ ] Clic → demande permission
  - [ ] Autoriser → Icône MapPin + "Actualiser"
  - [ ] Variant "default" après géoloc

- [ ] **Liste églises**
  - [ ] Cards avec icône église + badge
  - [ ] Hover → lift + shadow
  - [ ] Clic → sélection (border primary + ring)
  - [ ] Selected state visible

- [ ] **Footer stats**
  - [ ] Nombre églises affiché
  - [ ] Séparateur visible

### Mobile (< 768px)

- [ ] **Floating button**
  - [ ] Bouton violet en bas de map
  - [ ] Texte "Liste des églises"
  - [ ] Badge avec nombre
  - [ ] Clic → Sheet monte du bas

- [ ] **Sheet (drawer)**
  - [ ] Monte à 80% hauteur
  - [ ] Contient SearchSidebar
  - [ ] Swipe down pour fermer
  - [ ] Clic extérieur pour fermer
  - [ ] Sélection église → ferme sheet

---

## 🔍 Header & Search

### Desktop

- [ ] **Layout**
  - [ ] Logo + titre "GodsPlan" à gauche
  - [ ] Search bar centrée
  - [ ] Theme toggle à droite
  - [ ] Sticky top avec backdrop blur

- [ ] **Search bar**
  - [ ] Placeholder visible
  - [ ] Icône Search à gauche
  - [ ] Background muted/50
  - [ ] Taper texte → filtre en temps réel
  - [ ] Vider → affiche toutes églises

### Mobile

- [ ] **Header**
  - [ ] Logo + titre
  - [ ] Theme toggle droite
  - [ ] Search bar en bas (full width)

- [ ] **Search**
  - [ ] Placeholder court "Rechercher..."
  - [ ] Filtre temps réel OK

---

## 🏛️ Modal Détails Église

- [ ] **Ouverture**
  - [ ] Clic marker map
  - [ ] Clic card liste
  - [ ] Animation zoom-in

- [ ] **Header modal**
  - [ ] Icône église badge violet
  - [ ] Nom église (2xl font)
  - [ ] Adresse avec icône MapPin
  - [ ] Badge fiabilité coloré
  - [ ] Bouton "Itinéraire" (Navigation2)

- [ ] **Horaires de messes**
  - [ ] Card avec border-2
  - [ ] Titre "Horaires des messes" + icône Calendar
  - [ ] Liste par jour de semaine
  - [ ] Séparateurs entre jours
  - [ ] Icône Clock pour chaque horaire
  - [ ] Rite/Langue en sous-texte (si dispo)

- [ ] **Empty state horaires**
  - [ ] Si pas d'horaires
  - [ ] Icône Clock dans badge muted
  - [ ] Message "Aucun horaire disponible"

- [ ] **Sections additionnelles**
  - [ ] Description (si dispo)
  - [ ] Contact (téléphone, email, site)
  - [ ] Sources données en footer

- [ ] **Scroll modal**
  - [ ] ScrollArea smooth
  - [ ] Header sticky

- [ ] **Fermeture**
  - [ ] Bouton X (top right)
  - [ ] Clic extérieur
  - [ ] Touche Escape

---

## 📍 Géolocalisation

- [ ] **Activation**
  - [ ] Clic bouton "Me localiser"
  - [ ] Popup navigateur (permission)
  - [ ] Autoriser

- [ ] **Résultat**
  - [ ] Marker bleu sur map (cercle pulse)
  - [ ] Popup "Votre position"
  - [ ] Map centrée sur position
  - [ ] Églises triées par distance
  - [ ] Distance affichée sur cards

- [ ] **Actualisation**
  - [ ] Reclic bouton
  - [ ] Position mise à jour
  - [ ] Tri refresh

---

## 🎨 Loading States

- [ ] **Initial load**
  - [ ] Skeletons dans sidebar
  - [ ] 5 cards grises animées
  - [ ] Animation shimmer

- [ ] **Geolocation loading**
  - [ ] Bouton disabled
  - [ ] Spinner Loader2 rotatif
  - [ ] Texte "Localisation en cours..."

---

## 🚫 Empty States

- [ ] **Aucune église trouvée**
  - [ ] Recherche sans résultat
  - [ ] Icône MapPinOff dans badge muted
  - [ ] Titre "Aucune église trouvée"
  - [ ] Message "Essayez de vous localiser..."

---

## 📱 Responsive

### Mobile (< 768px)
- [ ] Header compact
- [ ] Search bar sous logo
- [ ] Map fullscreen
- [ ] Floating button visible
- [ ] Sheet bottom drawer

### Tablet (768px - 1024px)
- [ ] Sidebar 384px
- [ ] Map reste visible
- [ ] Header search inline

### Desktop (> 1024px)
- [ ] Layout optimal
- [ ] Sidebar + Map côte à côte
- [ ] Header search centrée

---

## ♿ Accessibilité

- [ ] **Keyboard navigation**
  - [ ] Tab entre éléments
  - [ ] Enter sur card → sélection
  - [ ] Space sur card → sélection
  - [ ] Esc ferme modal

- [ ] **Focus visible**
  - [ ] Ring sur focus
  - [ ] Contraste suffisant

- [ ] **ARIA labels**
  - [ ] Buttons avec aria-label
  - [ ] Map avec aria-label
  - [ ] Dialog avec aria-modal

---

## 🐛 Tests d'erreurs

- [ ] **API down**
  - [ ] Bloquer réseau (DevTools)
  - [ ] Vérifier message erreur rouge
  - [ ] Pas de crash

- [ ] **Geolocation refusée**
  - [ ] Refuser permission
  - [ ] Vérifier alert
  - [ ] Bouton reset état initial

---

## 🎯 Performance

- [ ] **Transitions smooth**
  - [ ] Theme switch instantané
  - [ ] Card hover fluide
  - [ ] Map pan/zoom réactif
  - [ ] Modal open/close sans lag

- [ ] **Build**
  - [ ] `npm run build` sans erreur
  - [ ] Bundle size raisonnable (<500KB)

---

## ✅ Final Check

- [ ] Pas d'erreurs console
- [ ] Pas de warnings React
- [ ] Toutes features fonctionnelles
- [ ] Design cohérent dark/light
- [ ] Responsive OK
- [ ] Performance OK

---

**Status:** ⬜ Not started | 🔄 In progress | ✅ Complete

**Notes:**
- Tester sur Chrome, Firefox, Safari
- Tester mobile réel (pas que DevTools)
- Vérifier HTTPS en production (geolocation)

---

**Happy testing! 🧪✨**
