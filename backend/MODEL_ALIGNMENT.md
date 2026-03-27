# Model Alignment - Church.ts

## Changements effectués (2026-03-27)

### 1. Interface `DataSource`
**Avant :**
```typescript
interface DataSource {
  name: string;
  url?: string;
  lastScraped: Date;
  reliability: number;
  metadata?: Record<string, unknown>;
}
```

**Après :**
```typescript
interface DataSource {
  type: string;           // ✅ Renommé de "name" → "type"
  url?: string;           // ✅ Inchangé
  scrapedAt: Date;        // ✅ Renommé de "lastScraped" → "scrapedAt"
  reliability: number;    // ✅ Conservé (usage interne, pas exposé en API)
  metadata?: Record<string, unknown>;  // ✅ Inchangé
}
```

### 2. Interface `MassSchedule`
**Avant :**
```typescript
interface MassSchedule {
  dayOfWeek: number;
  time: string;
  rite: ChurchRite;
  language?: string;
  notes?: string;  // ❌ Pluriel
}
```

**Après :**
```typescript
interface MassSchedule {
  dayOfWeek: number;
  time: string;
  rite?: ChurchRite;  // ✅ Maintenant optionnel
  language?: string;
  note?: string;      // ✅ Singulier, aligné avec frontend
}
```

### 3. Documentation TSDoc
Ajouté des commentaires sur :
- `DataSource` : structure attendue par le frontend + note sur `reliability` (interne)
- `MassSchedule` : format attendu par le frontend
- `latitude/longitude` : note sur la conversion decimal → string en API
- `massSchedules`, `rites`, `languages`, `dataSources` : contexte et usage

## Compatibilité

### ✅ Pas de breaking changes pour TypeORM
- Les renommages sont au niveau **interface TypeScript uniquement**
- Les décorateurs `@Column` restent inchangés
- Les noms de colonnes en DB restent identiques
- Les migrations existantes ne sont **pas affectées**

### ✅ Cohérence avec le frontend
- `DataSource.type` (au lieu de `name`)
- `DataSource.scrapedAt` (au lieu de `lastScraped`)
- `MassSchedule.note` (au lieu de `notes`)
- `MassSchedule.rite` est maintenant optionnel

### 🔄 À faire côté API
La couche API devra transformer :
- `latitude/longitude` : `number` → `string`
- `dataSources[].scrapedAt` : `Date` → ISO string
- Filtrer `dataSources[].reliability` avant de l'exposer (ou le garder si utile)

## Coordination avec autres sub-agents
- **API layer** : doit mapper ces champs correctement
- **Scrapers** : doivent utiliser `type` et `scrapedAt` dès maintenant
- **Frontend types** : déjà alignés, aucune action requise
