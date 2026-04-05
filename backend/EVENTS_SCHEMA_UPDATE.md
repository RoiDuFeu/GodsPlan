# 🎉 Church Events Schema Update

## Changement

**Ajout d'un champ dédié pour les événements** (concerts, pèlerinages, processions, etc.)

### Avant ❌

```typescript
// Événements stockés dans metadata non-structuré
church.dataSources[0].metadata.upcoming_events = [
  {
    date: "15 avril",
    description: "Concert de musique sacrée à 20h00"
  }
];
```

**Problèmes:**
- Pas requêtable SQL
- Pas de typage
- Mélangé avec metadata de scraping
- Dates en string (non parsées)

### Après ✅

```typescript
// Nouveau champ structuré
church.upcomingEvents: ChurchEvent[] = [
  {
    title: "Concert de musique sacrée",
    description: "Concert de musique sacrée à 20h00",
    date: new Date("2026-04-15"),
    time: "20:00",
    type: "concert",
    metadata: { extracted_from: "https://..." }
  }
];
```

**Avantages:**
- ✅ Requêtable SQL (WHERE type = 'concert')
- ✅ Typé (TypeScript + DB)
- ✅ Dates parsées (tri, filtres)
- ✅ Séparé de metadata scraping

---

## Interface TypeScript

```typescript
export interface ChurchEvent {
  title: string;
  description?: string;
  date: Date; // Event date
  time?: string; // HH:MM format (optional)
  type: string; // concert, pilgrimage, procession, conference, etc.
  location?: string; // If different from church address
  contact?: string;
  registrationUrl?: string;
  isFree?: boolean;
  price?: number;
  metadata?: Record<string, unknown>;
}
```

---

## Types d'événements détectés

**Auto-détection par mots-clés:**
- `concert` → Concert de musique sacrée
- `pilgrimage` → Pèlerinage
- `procession` → Procession mariale
- `conference` → Conférence
- `retreat` → Retraite spirituelle
- `adoration` → Adoration eucharistique
- `vigil` → Veillée
- `festival` → Festival, fête patronale
- `other` → Autres événements

---

## Migration BDD

### Auto-migration TypeORM

**Avec `synchronize: true` (dev):**

TypeORM va automatiquement ajouter la colonne:

```sql
ALTER TABLE churches 
ADD COLUMN "upcomingEvents" jsonb DEFAULT '[]'::jsonb;
```

### Migration manuelle (prod)

Si `synchronize: false`, créer migration:

```bash
npx typeorm migration:create src/migrations/AddUpcomingEvents
```

```typescript
// src/migrations/XXX-AddUpcomingEvents.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUpcomingEvents implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE churches 
      ADD COLUMN IF NOT EXISTS "upcomingEvents" jsonb DEFAULT '[]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE churches 
      DROP COLUMN IF EXISTS "upcomingEvents";
    `);
  }
}
```

Puis:
```bash
npx typeorm migration:run
```

---

## Mise à jour script import

### Avant

```typescript
// Stockage dans metadata
metadata: {
  upcoming_events: enriched.upcoming_events
}
```

### Après

```typescript
// Extraction + structuration
if (enriched.upcoming_events && enriched.upcoming_events.length > 0) {
  const events = enriched.upcoming_events.map(evt => ({
    title: evt.description?.split(':')[1]?.trim() || evt.description,
    description: evt.description,
    date: parseEventDate(evt.date), // Parsing amélioré
    type: detectEventType(evt.description),
    metadata: { extracted_from: enriched.source_url }
  }));
  
  church.upcomingEvents = [...church.upcomingEvents, ...events];
}
```

---

## Requêtes SQL possibles

### Églises avec concerts ce mois

```sql
SELECT 
  c.name,
  c.address->>'city' as city,
  evt->>'title' as event_title,
  evt->>'date' as event_date
FROM churches c,
  jsonb_array_elements(c."upcomingEvents") as evt
WHERE 
  evt->>'type' = 'concert'
  AND (evt->>'date')::timestamp >= NOW()
  AND (evt->>'date')::timestamp < NOW() + INTERVAL '1 month'
ORDER BY (evt->>'date')::timestamp;
```

### Stats événements par type

```sql
SELECT 
  evt->>'type' as event_type,
  COUNT(*) as count
FROM churches c,
  jsonb_array_elements(c."upcomingEvents") as evt
GROUP BY evt->>'type'
ORDER BY count DESC;
```

### Églises avec événements à venir (7 jours)

```sql
SELECT 
  c.name,
  c.contact->>'website' as website,
  COUNT(evt) as upcoming_count
FROM churches c,
  jsonb_array_elements(c."upcomingEvents") as evt
WHERE (evt->>'date')::timestamp BETWEEN NOW() AND NOW() + INTERVAL '7 days'
GROUP BY c.id, c.name, c.contact
HAVING COUNT(evt) > 0
ORDER BY upcoming_count DESC;
```

---

## API Routes (TODO)

### GET /api/churches/:id/events

```typescript
// routes/churches.ts
router.get('/:id/events', async (req, res) => {
  const { id } = req.params;
  const { type, upcoming } = req.query;
  
  const church = await churchRepo.findOne({
    where: { id },
    select: ['upcomingEvents']
  });
  
  let events = church.upcomingEvents;
  
  // Filter by type
  if (type) {
    events = events.filter(e => e.type === type);
  }
  
  // Filter upcoming only
  if (upcoming === 'true') {
    const now = new Date();
    events = events.filter(e => new Date(e.date) >= now);
  }
  
  // Sort by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  res.json(events);
});
```

### GET /api/events (global)

```typescript
router.get('/events', async (req, res) => {
  const { type, city, upcoming, limit = 50 } = req.query;
  
  const query = churchRepo.createQueryBuilder('church');
  
  // Filter by city
  if (city) {
    query.where("church.address->>'city' ILIKE :city", { city: `%${city}%` });
  }
  
  const churches = await query.getMany();
  
  // Flatten events
  const allEvents = churches.flatMap(church => 
    church.upcomingEvents.map(event => ({
      ...event,
      churchId: church.id,
      churchName: church.name,
      churchCity: church.address.city
    }))
  );
  
  // Filter
  let filtered = allEvents;
  
  if (type) {
    filtered = filtered.filter(e => e.type === type);
  }
  
  if (upcoming === 'true') {
    const now = new Date();
    filtered = filtered.filter(e => new Date(e.date) >= now);
  }
  
  // Sort and limit
  filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  res.json(filtered.slice(0, Number(limit)));
});
```

---

## Frontend (React/Next.js)

### Component: UpcomingEvents

```tsx
// components/UpcomingEvents.tsx
interface Event {
  title: string;
  description?: string;
  date: string;
  time?: string;
  type: string;
}

export function UpcomingEvents({ churchId }: { churchId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    fetch(`/api/churches/${churchId}/events?upcoming=true`)
      .then(res => res.json())
      .then(setEvents);
  }, [churchId]);
  
  return (
    <div className="upcoming-events">
      <h3>Événements à venir</h3>
      {events.map((event, i) => (
        <div key={i} className="event-card">
          <span className="event-type">{event.type}</span>
          <h4>{event.title}</h4>
          <p className="event-date">
            {new Date(event.date).toLocaleDateString('fr-FR')}
            {event.time && ` à ${event.time}`}
          </p>
          {event.description && <p>{event.description}</p>}
        </div>
      ))}
    </div>
  );
}
```

---

## Amélioration parsing dates

### ML extractor

**Actuellement:** Extraction brute `"15 avril"`

**TODO:** Parser en vraie date

```python
# Dans ml-extractor.py
import re
from datetime import datetime

MONTHS_FR = {
    'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4,
    'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8,
    'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
}

def parse_french_date(date_str: str) -> Optional[str]:
    """Parse '15 avril' → '2026-04-15'"""
    match = re.search(r'(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)', date_str, re.IGNORECASE)
    
    if match:
        day = int(match.group(1))
        month = MONTHS_FR[match.group(2).lower()]
        year = datetime.now().year
        
        # If date already passed this year, use next year
        event_date = datetime(year, month, day)
        if event_date < datetime.now():
            event_date = datetime(year + 1, month, day)
        
        return event_date.isoformat()
    
    return None
```

---

## Prochaines étapes

### Immédiat
- [x] Ajouter champ `upcomingEvents` au model
- [x] Mettre à jour script import
- [x] Doc (ce fichier)
- [ ] Tester migration auto (TypeORM synchronize)
- [ ] Vérifier import d'événements depuis ML extractor

### Next sprint
- [ ] Améliorer parsing dates françaises
- [ ] API routes `/api/events`
- [ ] Frontend component
- [ ] Filtering par type/ville/date

---

**Créé:** 2026-04-05  
**Status:** 🟢 Schema updated, ready to test  
**Migration:** Auto (synchronize) ou manuelle selon config
