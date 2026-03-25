import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { initializeDatabase, AppDataSource } from '../config/database';
import { Church, ChurchRite, DataSource } from '../models/Church';
import { MessesInfoScraper } from './MessesInfoScraper';
import { GoogleMapsScraper, GoogleMapsScrapedChurch } from './GoogleMapsScraper';
import { ScrapedChurch } from './BaseScraper';
import {
  calculateCrossSourceConfidence,
  calculateSourceCompleteness,
} from './reliabilityScoring';

interface ScraperCliOptions {
  withMesses: boolean;
  googleOnly: boolean;
  fixtures: boolean;
  limit?: number;
  churchNames: string[];
}

interface GoogleEnrichmentRow {
  churchName: string;
  score: number;
  confirmed: number;
  divergent: number;
  singleSource: number;
  googleRating?: number;
  googleReviews?: number;
}

function parseCliArgs(): ScraperCliOptions {
  const args = process.argv.slice(2);

  const getValue = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    if (index < 0 || index + 1 >= args.length) {
      return undefined;
    }
    return args[index + 1];
  };

  const churchArg = getValue('--church') || getValue('--churches');

  return {
    withMesses: args.includes('--with-messes'),
    googleOnly: args.includes('--google-only'),
    fixtures: args.includes('--fixtures'),
    limit: getValue('--limit') ? Number(getValue('--limit')) : undefined,
    churchNames: churchArg
      ? churchArg
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
      : [],
  };
}

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
      params: {
        q: query,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'GodsPlan/1.0 (contact@godsplan.app)',
      },
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
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
    return;
  }

  church.dataSources.push(source);
}

function computeAverageSourceReliability(church: Church): number {
  if (!church.dataSources?.length) {
    return church.reliabilityScore || 0;
  }

  const sum = church.dataSources.reduce((acc, source) => acc + (source.reliability || 0), 0);
  return Math.round(sum / church.dataSources.length);
}

async function saveChurches(scrapedChurches: ScrapedChurch[], sourceName: string): Promise<void> {
  const churchRepository = AppDataSource.getRepository(Church);

  for (const scraped of scrapedChurches) {
    try {
      let existingChurch = await churchRepository
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
        console.warn(`⚠️ Skipping ${scraped.name}: no coordinates`);
        continue;
      }

      const sourceReliability = Math.min(100, Math.max(0, calculateSourceCompleteness('messes.info', {
        ...(existingChurch || {}),
        name: scraped.name,
        address: scraped.address,
        latitude: coords.lat,
        longitude: coords.lng,
        contact: scraped.contact,
        massSchedules: mapMassSchedules(scraped),
      } as Church)));

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
          existingChurch.photos = [...new Set([...(existingChurch.photos || []), ...scraped.photos])];
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
    } catch (error) {
      console.error(`❌ Failed to save ${scraped.name}:`, error);
    }
  }
}

function churchMatchesTarget(church: Church, names: string[]): boolean {
  if (!names.length) {
    return true;
  }

  const name = church.name.toLowerCase();
  return names.some((target) => name.includes(target.toLowerCase()));
}

function ensureMessesSourceFromCurrentData(church: Church): void {
  const already = church.dataSources?.some((source) => source.name === 'messes.info');
  if (already) {
    return;
  }

  const completeness = calculateSourceCompleteness('messes.info', church);
  upsertDataSource(church, {
    name: 'messes.info',
    lastScraped: new Date(),
    reliability: completeness,
    metadata: {
      inferred: true,
      note: 'Source inferred from existing church record for cross-source scoring',
      massSchedulesCount: church.massSchedules?.length || 0,
    },
  });
}

function mergeGoogleData(church: Church, google: GoogleMapsScrapedChurch): void {
  church.contact = church.contact || {};

  if (!church.contact.phone && google.contact?.phone) {
    church.contact.phone = google.contact.phone;
  }

  if (!church.contact.website && google.contact?.website) {
    church.contact.website = google.contact.website;
  }

  if (!church.contact.email && google.contact?.email) {
    church.contact.email = google.contact.email;
  }

  if (!church.address?.street && google.address.street) {
    church.address.street = google.address.street;
  }
  if (!church.address?.postalCode && google.address.postalCode) {
    church.address.postalCode = google.address.postalCode;
  }
  if (!church.address?.city && google.address.city) {
    church.address.city = google.address.city;
  }

  if (
    (church.latitude === undefined || church.longitude === undefined) &&
    google.latitude !== undefined &&
    google.longitude !== undefined
  ) {
    church.latitude = google.latitude;
    church.longitude = google.longitude;
    church.location = {
      type: 'Point',
      coordinates: [google.longitude, google.latitude],
    };
  }

  if (google.photos?.length) {
    church.photos = [...new Set([...(church.photos || []), ...google.photos])].slice(0, 20);
  }
}

async function enrichWithGoogle(options: ScraperCliOptions): Promise<GoogleEnrichmentRow[]> {
  const churchRepository = AppDataSource.getRepository(Church);

  const qb = churchRepository
    .createQueryBuilder('church')
    .where('church.isActive = :isActive', { isActive: true })
    .orderBy('church.name', 'ASC');

  if (options.limit) {
    qb.take(options.limit);
  }

  const churches = (await qb.getMany()).filter((church) =>
    churchMatchesTarget(church, options.churchNames)
  );

  const googleScraper = new GoogleMapsScraper({ useFixtures: options.fixtures });

  if (!googleScraper.isEnabled()) {
    console.warn('⚠️ Google Maps scraper disabled');
    return [];
  }

  const reportRows: GoogleEnrichmentRow[] = [];

  try {
    for (const church of churches) {
      const google = await googleScraper.enrichChurch(church);
      if (!google) {
        continue;
      }

      ensureMessesSourceFromCurrentData(church);

      const confidence = calculateCrossSourceConfidence(church, google);
      const googleCompleteness = calculateSourceCompleteness('google-maps', church, google);
      const messesCompleteness = calculateSourceCompleteness('messes.info', church);

      mergeGoogleData(church, google);

      const googleReliability = Math.max(
        0,
        Math.min(100, Math.round(googleCompleteness * 0.55 + confidence.score * 0.45))
      );
      const messesReliability = Math.max(
        0,
        Math.min(100, Math.round(messesCompleteness * 0.55 + confidence.score * 0.45))
      );

      upsertDataSource(church, {
        name: 'messes.info',
        reliability: messesReliability,
        lastScraped: new Date(),
        url:
          church.dataSources.find((source) => source.name === 'messes.info')?.url ||
          'https://www.messes.info',
        metadata: {
          completeness: messesCompleteness,
        },
      });

      upsertDataSource(church, {
        name: 'google-maps',
        reliability: googleReliability,
        lastScraped: new Date(),
        url: google.sourceUrl,
        metadata: {
          placeId: google.placeId,
          openingHours: google.openingHours || [],
          rating: google.rating,
          userRatingsTotal: google.userRatingsTotal,
          reviews: (google.reviews || []).slice(0, 3),
          confidence,
          mode: options.fixtures ? 'fixtures' : 'live-scraping',
        },
      });

      church.reliabilityScore = confidence.score;
      church.lastVerified = new Date();

      await churchRepository.save(church);

      reportRows.push({
        churchName: church.name,
        score: confidence.score,
        confirmed: confidence.confirmed,
        divergent: confidence.divergent,
        singleSource: confidence.singleSource,
        googleRating: google.rating,
        googleReviews: google.userRatingsTotal,
      });

      console.log(
        `🔎 ${church.name} | score=${confidence.score} confirmed=${confidence.confirmed} divergent=${confidence.divergent}`
      );
    }

    return reportRows;
  } finally {
    await googleScraper.close();
  }
}

function writeReport(rows: GoogleEnrichmentRow[], options: ScraperCliOptions): void {
  const total = rows.length;
  const avgScore = total
    ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / total)
    : 0;
  const totalDivergences = rows.reduce((sum, row) => sum + row.divergent, 0);

  const tableRows = rows
    .map(
      (row) =>
        `| ${row.churchName} | ${row.score} | ${row.confirmed} | ${row.divergent} | ${row.singleSource} | ${row.googleRating ?? '-'} | ${row.googleReviews ?? '-'} |`
    )
    .join('\n');

  const content = `# Google Enrichment Report\n\n- Date: ${new Date().toISOString()}\n- Mode: ${options.fixtures ? 'fixtures' : 'live Google Maps scraping'}\n- Churches processed: ${total}\n- Average confidence score: ${avgScore}\n- Total divergences: ${totalDivergences}\n\n## Per-church results\n\n| Church | Confidence score | Confirmed fields | Divergences | Single-source fields | Google rating | Google reviews |\n|---|---:|---:|---:|---:|---:|---:|\n${tableRows || '| (none) | - | - | - | - | - | - |'}\n\n## Notes\n\n- Confidence score combines cross-source agreement (Google + messes.info) and unique-source enrichment.\n- Divergences lower the score; confirmed fields raise it.\n- Google-specific data (opening hours, photos, ratings, reviews) is stored under churches.dataSources[].metadata.\n`;

  const reportPath = path.join(process.cwd(), 'GOOGLE_ENRICHMENT_REPORT.md');
  fs.writeFileSync(reportPath, content, 'utf8');
  console.log(`📝 Report written to ${reportPath}`);
}

async function runScrapers(): Promise<void> {
  const options = parseCliArgs();

  console.log('🚀 Starting scraping process...');
  console.log(`⚙️ options: ${JSON.stringify(options)}`);

  await initializeDatabase();

  if (!options.googleOnly && options.withMesses) {
    const messesInfoScraper = new MessesInfoScraper();
    const messesInfoChurches = await messesInfoScraper.scrape();
    await saveChurches(messesInfoChurches, 'messes.info');
  }

  const rows = await enrichWithGoogle(options);
  writeReport(rows, options);

  console.log('✅ Scraping process completed');
}

if (require.main === module) {
  runScrapers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Scraping process failed:', error);
      process.exit(1);
    });
}

export { runScrapers };
