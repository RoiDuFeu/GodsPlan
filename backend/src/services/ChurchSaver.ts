import axios from 'axios';
import { AppDataSource } from '../config/database';
import { Church, ChurchRite, DataSource, OfficeSchedule } from '../models/Church';
import { ScrapedChurch } from '../scrapers/BaseScraper';
import { calculateSourceCompleteness } from '../scrapers/reliabilityScoring';

function mapRite(riteString: string): ChurchRite {
  const mapping: Record<string, ChurchRite> = {
    // New clean values
    'Tridentine': ChurchRite.LATIN_TRADITIONAL,
    'Paul VI': ChurchRite.PAUL_VI,
    'Byzantine': ChurchRite.BYZANTINE,
    'Armenian': ChurchRite.ARMENIAN,
    'Maronite': ChurchRite.MARONITE,
    // Legacy values for existing data
    latin_traditional: ChurchRite.LATIN_TRADITIONAL,
    french_paul_vi: ChurchRite.PAUL_VI,
    byzantine: ChurchRite.BYZANTINE,
    armenian: ChurchRite.ARMENIAN,
    maronite: ChurchRite.MARONITE,
  };
  return mapping[riteString] || ChurchRite.OTHER;
}

function mapMassSchedules(church: ScrapedChurch): Church['massSchedules'] {
  return (church.massSchedules || []).map((schedule) => ({
    dayOfWeek: schedule.dayOfWeek,
    time: schedule.time,
    date: schedule.date,
    rite: mapRite(schedule.rite),
    language: schedule.language,
    notes: schedule.notes,
  }));
}

function mapOfficeSchedules(church: ScrapedChurch): OfficeSchedule[] {
  return (church.officeSchedules || []).map((schedule) => ({
    type: schedule.type,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    date: schedule.date,
    notes: schedule.notes,
  }));
}

async function geocodeAddress(
  address: ScrapedChurch['address']
): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${address.street}, ${address.postalCode} ${address.city}, France`;
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'GodsPlan/1.0 (contact@godsplan.app)' },
    });

    if (response.data?.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function upsertDataSource(church: Church, source: DataSource): void {
  if (!church.dataSources) {
    church.dataSources = [];
  }
  const existingIndex = church.dataSources.findIndex((item) => item.name === source.name);
  if (existingIndex >= 0) {
    church.dataSources[existingIndex] = source;
  } else {
    church.dataSources.push(source);
  }
}

function computeAverageSourceReliability(church: Church): number {
  if (!church.dataSources?.length) {
    return church.reliabilityScore || 0;
  }
  const sum = church.dataSources.reduce((acc, source) => acc + (source.reliability || 0), 0);
  return Math.round(sum / church.dataSources.length);
}

export interface SaveResult {
  saved: number;
  skipped: number;
  errors: number;
}

export type SaveProgressCallback = (current: number, total: number, churchName: string) => void;

export async function saveChurches(
  scrapedChurches: ScrapedChurch[],
  sourceName: 'messes.info' | 'google-places' | 'google-maps',
  onProgress?: SaveProgressCallback,
): Promise<SaveResult> {
  const churchRepository = AppDataSource.getRepository(Church);
  const result: SaveResult = { saved: 0, skipped: 0, errors: 0 };

  // Phase 1: Bulk-fetch existing churches to avoid N+1 queries
  const existingMap = new Map<string, Church>();
  const CHUNK_SIZE = 200;
  for (let i = 0; i < scrapedChurches.length; i += CHUNK_SIZE) {
    const chunk = scrapedChurches.slice(i, i + CHUNK_SIZE);
    const params: Record<string, string> = {};
    const conditions = chunk.map((c, idx) => {
      params[`name${i + idx}`] = c.name;
      params[`pc${i + idx}`] = c.address.postalCode;
      return `(church.name = :name${i + idx} AND church.address->>'postalCode' = :pc${i + idx})`;
    });

    const existing = await churchRepository
      .createQueryBuilder('church')
      .where(conditions.join(' OR '), params)
      .getMany();

    for (const church of existing) {
      const key = `${church.name}::${church.address.postalCode}`;
      existingMap.set(key, church);
    }
  }

  // Phase 2: Resolve coordinates (geocoding stays sequential — Nominatim 1 req/sec)
  interface ResolvedEntry {
    scraped: ScrapedChurch;
    existing: Church | undefined;
    coords: { lat: number; lng: number };
  }
  const resolved: ResolvedEntry[] = [];

  for (let i = 0; i < scrapedChurches.length; i++) {
    const scraped = scrapedChurches[i];
    onProgress?.(i + 1, scrapedChurches.length, scraped.name);

    const key = `${scraped.name}::${scraped.address.postalCode}`;
    const existing = existingMap.get(key);

    let coords =
      scraped.latitude !== undefined && scraped.longitude !== undefined
        ? { lat: scraped.latitude, lng: scraped.longitude }
        : null;

    if (!coords && existing?.latitude && existing?.longitude) {
      coords = { lat: existing.latitude, lng: existing.longitude };
    }

    if (!coords) {
      coords = await geocodeAddress(scraped.address);
    }

    if (!coords) {
      result.skipped++;
      continue;
    }

    resolved.push({ scraped, existing, coords });
  }

  // Phase 3: Build entities and batch-save
  const SAVE_BATCH = 50;
  const toSave: Church[] = [];

  for (const { scraped, existing, coords } of resolved) {
    try {
      const sourceReliability = Math.min(
        100,
        Math.max(
          0,
          calculateSourceCompleteness(sourceName, {
            ...(existing || {}),
            name: scraped.name,
            address: scraped.address,
            latitude: coords.lat,
            longitude: coords.lng,
            contact: scraped.contact,
            massSchedules: mapMassSchedules(scraped),
          } as Church)
        )
      );

      const sourceEntry: DataSource = {
        name: sourceName,
        url: scraped.sourceUrl,
        lastScraped: new Date(),
        reliability: sourceReliability,
        metadata: {
          massSchedulesCount: scraped.massSchedules?.length || 0,
          officeSchedulesCount: scraped.officeSchedules?.length || 0,
        },
      };

      if (existing) {
        existing.address = scraped.address;
        existing.latitude = coords.lat;
        existing.longitude = coords.lng;
        existing.location = { type: 'Point', coordinates: [coords.lng, coords.lat] };
        existing.contact = {
          ...existing.contact,
          ...scraped.contact,
        };

        if (scraped.massSchedules?.length) {
          existing.massSchedules = mapMassSchedules(scraped);
        }

        if (scraped.officeSchedules?.length) {
          existing.officeSchedules = mapOfficeSchedules(scraped);
        }

        existing.rites =
          scraped.rites?.map(mapRite) || existing.rites || [ChurchRite.PAUL_VI];
        existing.languages =
          scraped.languages || existing.languages || ['French'];

        if (scraped.photos?.length) {
          existing.photos = [
            ...new Set([...(existing.photos || []), ...scraped.photos]),
          ].slice(0, 2);
        }

        upsertDataSource(existing, sourceEntry);
        existing.reliabilityScore = computeAverageSourceReliability(existing);
        existing.lastVerified = new Date();

        toSave.push(existing);
      } else {
        const newChurch = churchRepository.create({
          name: scraped.name,
          description: scraped.description,
          address: scraped.address,
          latitude: coords.lat,
          longitude: coords.lng,
          location: { type: 'Point', coordinates: [coords.lng, coords.lat] },
          contact: scraped.contact,
          massSchedules: mapMassSchedules(scraped),
          officeSchedules: mapOfficeSchedules(scraped),
          rites: scraped.rites?.map(mapRite) || [ChurchRite.PAUL_VI],
          languages: scraped.languages || ['French'],
          photos: (scraped.photos || []).slice(0, 2),
          dataSources: [sourceEntry],
          reliabilityScore: sourceEntry.reliability,
          isActive: true,
          lastVerified: new Date(),
        });

        toSave.push(newChurch);
      }
    } catch (error) {
      console.error(`Failed to prepare ${scraped.name}:`, error);
      result.errors++;
    }
  }

  // Save in batches
  for (let i = 0; i < toSave.length; i += SAVE_BATCH) {
    const batch = toSave.slice(i, i + SAVE_BATCH);
    try {
      await churchRepository.save(batch);
      result.saved += batch.length;
    } catch (error) {
      // Fallback: save individually to isolate failures
      for (const entity of batch) {
        try {
          await churchRepository.save(entity);
          result.saved++;
        } catch (entityError) {
          console.error(`Failed to save ${entity.name}:`, entityError);
          result.errors++;
        }
      }
    }
  }

  return result;
}
