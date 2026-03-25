# 📸 Guide Visuel - Refonte UX/UI Premium

**Version:** 2.0  
**Date:** 2026-03-17

---

## 🎯 Vue d'ensemble des changements visuels

Cette refonte apporte un design premium avec un spacing généreux, des animations fluides, et une hiérarchie visuelle claire.

---

## 1. **Header Premium**

### Avant (v1.0)
```
┌─────────────────────────────────────────────────────────────┐
│ [🕍] GodsPlan                   [Search...]        [Theme] │
│      Trouvez votre église                                   │
└─────────────────────────────────────────────────────────────┘
```

### Après (v2.0)
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  [🕍]  GodsPlan                                    [Theme]  │
│  ✨    Trouvez votre église à Paris                        │
│                                                              │
│        ┌─────────────────────────────────┐                 │
│        │ 🔍 Rechercher une église...     │  ← shadow-lg    │
│        └─────────────────────────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Changements:**
- Badge circulaire avec gradient + glow effect
- Search bar centrée, grande (max-w-2xl)
- Backdrop blur + padding généreux (py-6)
- Mobile responsive (flex-col sur petit écran)

---

## 2. **ChurchCard avec ScoreBar**

### Avant (v1.0)
```
┌────────────────────────────────────────┐
│ [🕍] Église Saint-Michel               │
│      📍 12 rue de la Paix, 75001      │
│      🏷️ Fiabilité: Moyenne            │
│      📍 0.8 km                         │
└────────────────────────────────────────┘
```

### Après (v2.0)
```
┌────────────────────────────────────────┐
│                                         │
│  [🕍]  Église Saint-Michel              │
│   ✨   (badge circulaire coloré)       │
│                                         │
│  📍 12 rue de la Paix, 75001           │
│                                         │
│  ▓▓▓▓░ 75/100        📍 0.8 km        │
│  └─ ScoreBar visuel   └─ Distance     │
│                                         │
└────────────────────────────────────────┘
         ↑
    Hover: lift + glow + ring
```

**Changements:**
- Icône dans badge circulaire (bg-primary/10)
- **ScoreBar** remplace le badge textuel
- Footer: score à gauche, distance à droite
- Hover: scale(1.02) + translateY(-2px) + shadow-xl + ring-2
- Selected: border-primary + ring-2 + shadow-lg
- Spacing généreux (p-4, space-y-2.5)

---

## 3. **ScoreBar Component (nouveau)**

### Visualisation
```
Score: 85/100
▓▓▓▓▓ 85/100  ← 5 bars vertes (80-100)

Score: 65/100
▓▓▓▓░ 65/100  ← 4 bars lime (60-79)

Score: 45/100
▓▓▓░░ 45/100  ← 3 bars orange (40-59)

Score: 25/100
▓▓░░░ 25/100  ← 2 bars orange foncé (20-39)

Score: 15/100
▓░░░░ 15/100  ← 1 bar rouge (0-19)
```

**Logique:**
- 5 segments (bars) de h-1.5 w-6
- Couleur adaptée au score
- Affichage numérique "/100" à côté

---

## 4. **SearchSidebar avec Separators**

### Avant (v1.0)
```
┌──────────────────────┐
│ [📍 Me localiser]    │
│ ─────────────────    │
│                      │
│ [Card 1]             │
│ [Card 2]             │
│ [Card 3]             │
│                      │
│ ─────────────────    │
│ 3 églises affichées  │
└──────────────────────┘
```

### Après (v2.0)
```
┌──────────────────────┐
│                      │
│ [📍 Me localiser]    │  ← h-12, shadow-sm
│                      │
│ ─────────────────    │
│                      │
│ [Card 1]             │  ← p-4, space-y-2.5
│ ───────              │  ← Separator
│ [Card 2]             │
│ ───────              │
│ [Card 3]             │
│                      │
│ ─────────────────    │
│ 3 églises affichées  │  ← bg-muted/30
│                      │
└──────────────────────┘
```

**Changements:**
- Padding: p-6 (breathing room)
- Gap entre cards: space-y-4
- **Separators** entre chaque card
- Empty state: icon grande + message sympathique
- Footer: bg-muted/30

---

## 5. **ChurchDetail Modal polished**

### Avant (v1.0)
```
┌────────────────────────────────────┐
│ [X]                                │
│ Église Saint-Michel                │
│ 📍 Adresse                         │
│ 🏷️ Fiabilité: Moyenne             │
│                                    │
│ Horaires des messes                │
│ Lundi: 18h00                       │
│ Mardi: 18h00                       │
└────────────────────────────────────┘
```

### Après (v2.0)
```
┌────────────────────────────────────┐
│ [X]                                │
│                                    │
│  [🕍]  Église Saint-Michel          │
│   ✨   (gradient badge h-16 w-16)  │
│                                    │
│  📍 Adresse complète               │
│  🏷️ Fiabilité: Moyenne (75%)      │
│                          [Itinéraire]│
│ ────────────────────────────────   │
│                                    │
│ 📅 Horaires des messes             │
│ ─────────────────────────────────  │
│ │ Lundi      18h00                 │ ← bg-muted/5
│ ─────────────────────────────────  │
│ │ Mardi      18h00                 │ ← bg-background
│ ─────────────────────────────────  │
│                                    │
│ ─────────────────────────────────  │
│ Description...                     │
│                                    │
│ ─────────────────────────────────  │
│ Contact...                         │
└────────────────────────────────────┘
```

**Changements:**
- Header: icon h-16 w-16 avec gradient + shadow-lg
- Content: p-6, space-y-6 entre sections
- Mass schedules: border-2, alternating rows
- **Separators** entre toutes les sections
- Text: leading-relaxed partout

---

## 6. **Map polished**

### Avant (v1.0)
```
┌────────────────────────────────────┐
│ [Map Leaflet sans border]          │
│                                    │
└────────────────────────────────────┘
```

### Après (v2.0)
```
┌────────────────────────────────────┐
│┃                                  ┃│ ← border-2
│┃ [Map Leaflet]                    ┃│
│┃                                  ┃│ ← shadow-lg
│┃                                  ┃│
└────────────────────────────────────┘
      ↑
  rounded-xl + md:m-4
```

**Changements:**
- Card wrapper: border-2, rounded-xl, shadow-lg
- Margin: md:m-4
- Popup: padding p-4, min-w-[220px]

---

## 🎨 Palette de couleurs

### Spacing
- **Padding:** p-4 → p-6 (breathing room)
- **Gap:** space-y-3 → space-y-4
- **Margins:** Généreux partout

### Typographie
- **Headings:** font-semibold, line-height-tight
- **Body:** font-normal, line-height-relaxed
- **Captions:** text-sm text-muted-foreground

### Effects
- **Hover:** scale-[1.02], translateY(-2px), shadow-xl, ring-2
- **Selected:** border-primary, ring-2, shadow-lg
- **Transitions:** duration-200

---

## 📸 Screenshots à prendre (pour Marc)

1. **Header full-width** (desktop + mobile)
2. **Sidebar avec cards** (hover state + selected state)
3. **ScoreBar** (différents scores: 15, 45, 75, 95)
4. **Modal détail** (horaires + sections avec separators)
5. **Map** (avec border + shadow)

---

## 🚀 Comment visualiser

```bash
cd GodsPlan/web
pnpm run dev
```

Puis ouvrir dans le navigateur et tester :
- Hover sur les cards
- Cliquer sur une card (selected state)
- Ouvrir une modal détail
- Tester le responsive (resize window)
- Tester dark/light mode

---

**Artemis** 🌙  
Visual Guide • GodsPlan UX Refonte • 2026-03-17
