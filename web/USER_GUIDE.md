# 📖 GodsPlan - Guide d'utilisation

## 🎨 Changer de thème (Dark/Light Mode)

### Comment changer de thème ?

Cliquez sur le bouton **Soleil/Lune** en haut à droite du Header.

**Cycle des thèmes:**
1. ☀️ **Light** (Clair) → Click
2. 🌙 **Dark** (Sombre) → Click
3. 💻 **System** (Auto) → Click
4. ↺ Retour à Light

**Thème "System" (Auto):**
- Suit automatiquement les préférences de votre OS
- Si votre système est en mode sombre → affiche le dark mode
- Si votre système est en mode clair → affiche le light mode

**Sauvegarde:**
- Votre préférence est sauvegardée localement (localStorage)
- Persiste entre les sessions
- Clé de stockage: `godsplan-ui-theme`

---

## 🗺️ Utiliser la carte

### Navigation
- **Zoom:** Molette souris ou boutons +/- en haut à gauche
- **Pan:** Clic gauche + glisser
- **Clic sur marker:** Ouvre le popup info + sélectionne l'église

### Markers
- 📍 **Marker église** (violet) - Cliquez pour sélectionner
- 📍 **Marker utilisateur** (pulse bleu) - Votre position (après géolocalisation)

### Interactions
- **Hover sur marker** → Scale + shadow (feedback visuel)
- **Marker sélectionné** → Pulse animation + ring glow
- **Popup** → Infos rapides (nom, adresse, distance)

---

## 📋 Liste des églises

### Desktop
- Sidebar fixe à gauche (384px)
- Scroll vertical avec ScrollArea custom

### Mobile
- Bouton flottant **"Liste des églises"** en bas de la map
- Sheet (drawer) qui monte du bas (80% hauteur écran)
- Swipe down pour fermer

### Features
- **Recherche** - Header search bar (filtre en temps réel)
- **Géolocalisation** - Bouton "Me localiser" (demande permission)
- **Sélection** - Clic sur card → centre map + ouvre modal détails
- **Empty state** - Message si aucune église trouvée

---

## 🏛️ Détails d'une église

### Ouvrir le modal
- Clic sur marker map
- Clic sur card dans la liste

### Contenu
- **Nom + adresse** - Header avec icône église
- **Badge fiabilité** - Score de confiance des données
- **Bouton "Itinéraire"** - Ouvre Google Maps Directions
- **Horaires de messes** - Tableau par jour de la semaine (si disponibles)
- **Contact** - Téléphone, email, site web (si disponibles)
- **Sources** - Provenance des données

### Fermer le modal
- Clic sur bouton X (top right)
- Clic en dehors du modal
- Touche Escape (clavier)

---

## 📍 Géolocalisation

### Activer
1. Clic sur bouton **"Me localiser"** (Sidebar)
2. Autoriser l'accès à la position (popup navigateur)
3. ✅ Position détectée → Marker bleu sur map + églises triées par distance

### Actualiser
- Recliquer sur le bouton → Met à jour votre position

### Sans géolocalisation
- Liste affiche toutes les églises de Paris
- Pas de tri par distance

---

## 🔍 Recherche

### Desktop
- Search bar centrée dans le Header
- Placeholder: "Rechercher une église à Paris..."

### Mobile
- Search bar en bas du Header (full width)
- Placeholder: "Rechercher..."

### Fonctionnement
- Filtre en temps réel (pas de submit)
- Cherche dans: nom église, adresse (rue, code postal, ville)
- Case-insensitive
- Vide la recherche → Affiche toutes les églises

---

## ⌨️ Raccourcis clavier (à venir)

Prochainement:
- `/` - Focus search bar
- `Esc` - Fermer modal/sheet
- `↑↓` - Navigation liste églises
- `Enter` - Ouvrir détails église sélectionnée

---

## 📱 Responsive Breakpoints

- **Mobile:** < 768px
  - Sidebar → Sheet (bottom drawer)
  - Search bar en bas du header
  - Map fullscreen
  
- **Tablet:** 768px - 1024px
  - Sidebar 384px fixe
  - Search bar inline dans header
  
- **Desktop:** > 1024px
  - Sidebar 384px fixe
  - Search bar centrée
  - Layout optimal

---

## ♿ Accessibilité

### Navigation clavier
- `Tab` - Naviguer entre éléments interactifs
- `Enter` / `Space` - Activer boutons/cards
- `Esc` - Fermer modals/dialogs

### Screen readers
- Labels ARIA sur tous les boutons
- Semantic HTML (header, main, aside)
- Roles ARIA (dialog, button, search)

### Contraste
- WCAG AA+ compliant
- Testé en dark et light mode

---

## 🐛 Problèmes courants

### La géolocalisation ne fonctionne pas
- ✅ Vérifiez que votre navigateur supporte la géolocalisation
- ✅ Autorisez l'accès à la position (popup navigateur)
- ✅ En HTTPS uniquement (localhost OK)

### Le thème ne change pas
- ✅ Effacez le localStorage: `localStorage.removeItem('godsplan-ui-theme')`
- ✅ Rechargez la page

### Les markers ne s'affichent pas
- ✅ Vérifiez la console (erreurs Leaflet)
- ✅ API fonctionnelle ? (Network tab)

### La carte est blanche/vide
- ✅ Vérifiez la connexion internet (tiles OpenStreetMap)
- ✅ Attendez quelques secondes (chargement tiles)

---

## 🎯 Tips & Tricks

1. **Thème auto** - Laissez en mode "System" pour suivre vos préférences OS
2. **Géolocalisation** - Autorisez une fois pour toujours (mémorisation navigateur)
3. **Recherche rapide** - Tapez code postal (ex: "75001") pour filtrer par arrondissement
4. **Mobile** - Utilisez le bouton flottant plutôt que de chercher la sidebar
5. **Itinéraire** - Le bouton ouvre directement Google Maps avec directions

---

**Bon voyage spirituel ! 🙏✨**
