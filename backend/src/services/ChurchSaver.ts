import axios from 'axios';
import { AppDataSource } from '../config/database';
import { Church, ChurchRite, DataSource } from '../models/Church';
import { ScrapedChurch } from '../scrapers/BaseScraper';
import { calculateSourceCompleteness } from '../scrapers/reliabilityScoring';

function mapRite(riteString: string): ChurchRite {
  const mapping: Record<string, ChurchRite> = {
    latin_traditional: ChurchRite.LATIN_TRADITIONAL,
    french_paul_vi: ChurchRite.FRENCH_PAUL_VI,
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
    rite: mapRite(schedule.rite),
    language: schedule.language,
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

  for (let i = 0; i < scrapedChurches.length; i++) {
    const scraped = scrapedChurches[i];
    onProgress?.(i + 1, scrapedChurches.length, scraped.name);

    try {
      const existingChurch = await churchRepository
        .createQueryBuilder('church')
        .where('church.name = :name', { name: scraped.name })
        .andWhere("church.address->>'postalCode' = :postalCode", {
          postalCode: scraped.address.postalCode,
        })
        .getOne();

      let coords =
        scraped.latitude !== undefined && scraped.longitude !== undefined
          ? { lat: scraped.latitude, lng: scraped.longitude }
          : null;

      if (!coords) {
        coords = await geocodeAddress(scraped.address);
      }

      if (!coords) {
        result.skipped++;
        continue;
      }

      const sourceReliability = Math.min(
        100,
        Math.max(
          0,
          calculateSourceCompleteness(sourceName, {
            ...(existingChurch || {}),
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
        },
      };

      if (existingChurch) {
        existingChurch.address = scraped.address;
        existingChurch.latitude = coords.lat;
        existingChurch.longitude = coords.lng;
        existingChurch.location = { type: 'Point', coordinates: [coords.lng, coords.lat] };
        existingChurch.contact = {
          ...existingChurch.contact,
          ...scraped.contact,
        };

        if (scraped.massSchedules?.length) {
          existingChurch.massSchedules = mapMassSchedules(scraped);
        }

        existingChurch.rites =
          scraped.rites?.map(mapRite) || existingChurch.rites || [ChurchRite.FRENCH_PAUL_VI];
        existingChurch.languages =
          scraped.languages || existingChurch.languages || ['French'];

        if (scraped.photos?.length) {
          existingChurch.photos = [
            ...new Set([...(existingChurch.photos || []), ...scraped.photos]),
          ];
        }

        upsertDataSource(existingChurch, sourceEntry);
        existingChurch.reliabilityScore = computeAverageSourceReliability(existingChurch);
        existingChurch.lastVerified = new Date();

        await churchRepository.save(existingChurch);
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
          rites: scraped.rites?.map(mapRite) || [ChurchRite.FRENCH_PAUL_VI],
          languages: scraped.languages || ['French'],
          photos: scraped.photos || [],
          dataSources: [sourceEntry],
          reliabilityScore: sourceEntry.reliability,
          isActive: true,
          lastVerified: new Date(),
        });

        await churchRepository.save(newChurch);
      }

      result.saved++;
    } catch (error) {
      console.error(`Failed to save ${scraped.name}:`, error);
      result.errors++;
    }
  }

  return result;
}
