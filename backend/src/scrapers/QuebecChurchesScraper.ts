import axios from 'axios';
import { BaseScraper, ScrapedChurch } from './BaseScraper';

interface WikidataChurch {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  place: {
    id: number;
    name: string;
    countryCode: string | null;
    type: string;
  };
  address: string;
  churches: Array<{
    id: number;
    wikidataChurch: string;
    massesUrl: string | null;
    calendars: any[];
  }>;
  photos: any[];
  updatedAt: string;
  pin: string;
}

interface Diocese {
  id: number;
  name: string;
  gcatholicId: string;
  wikidataChurches: string[];
}

/**
 * Scraper for Catholic churches across all of Quebec province
 * 
 * Data sources:
 * 1. OpenChurch API (primary source for church locations from Wikidata)
 * 2. Diocesan websites (for mass schedules)
 * 3. OpenStreetMap (fallback for coordinates)
 */
export class QuebecChurchesScraper extends BaseScraper {
  // Quebec dioceses with their OpenChurch IDs
  private readonly QUEBEC_DIOCESES = [
    { id: 672512, name: 'Archidiocèse de Montréal' },
    { id: 1365378, name: 'Archidiocèse de Québec' },
    { id: 1128577, name: 'Archidiocèse de Gatineau' },
    { id: 1319681, name: 'Archidiocèse de Sherbrooke' },
    { id: 1175930, name: 'Diocèse de Trois-Rivières' },
    { id: 1348815, name: 'Diocèse de Saint-Jean-Longueuil' },
    { id: 1175929, name: 'Diocèse de Saint-Jérôme' },
    { id: 1128581, name: 'Diocèse de Valleyfield' },
    { id: 1348814, name: 'Diocèse de Joliette' },
    { id: 1348816, name: 'Diocèse de Saint-Hyacinthe' },
    { id: 1319684, name: 'Archidiocèse de Rimouski' },
    { id: 672518, name: 'Diocèse de Chicoutimi' },
    { id: 1319683, name: 'Diocèse de Rouyn-Noranda' },
    { id: 1319685, name: 'Diocèse de Baie-Comeau' },
    { id: 672517, name: 'Diocèse d\'Amos' },
    { id: 1128578, name: 'Diocèse de Gaspé' },
    { id: 1319687, name: 'Diocèse de Hauterive' },
    { id: 1319682, name: 'Diocèse de Nicolet' },
    { id: 1175931, name: 'Diocèse de Mont-Laurier' },
  ];

  private scrapedChurches = new Map<number, ScrapedChurch>();
  private failedChurches: Array<{ id: number; error: string }> = [];
  private diocesesCovered = new Set<string>();

  constructor() {
    super({
      name: 'Quebec Churches',
      baseUrl: 'https://open-church.io',
      rateLimit: 200, // Be respectful to OpenChurch API
    });
  }

  async scrapeChurchList(): Promise<string[]> {
    console.log('📍 Fetching Quebec dioceses from OpenChurch API...\n');

    const allWikidataIds: string[] = [];

    for (const { id, name } of this.QUEBEC_DIOCESES) {
      try {
        const diocese = await this.fetchDiocese(id);
        
        if (diocese && diocese.wikidataChurches.length > 0) {
          console.log(`✅ ${diocese.name}: ${diocese.wikidataChurches.length} churches`);
          this.diocesesCovered.add(diocese.name);
          
          // Extract wikidata IDs from URLs like "/api/wikidata_churches/284716"
          const ids = diocese.wikidataChurches.map(url => {
            const match = url.match(/\/api\/wikidata_churches\/(\d+)/);
            return match ? match[1] : null;
          }).filter(Boolean) as string[];
          
          allWikidataIds.push(...ids);
        } else {
          console.log(`⚠️  ${name}: No data found`);
        }

        // Rate limiting
        await this.sleep(this.config.rateLimit!);
      } catch (error) {
        console.error(`❌ Failed to fetch diocese ${name} (ID: ${id}):`, error);
      }
    }

    console.log(`\n📊 Total churches found: ${allWikidataIds.length}`);
    console.log(`📊 Dioceses covered: ${this.diocesesCovered.size}\n`);

    // Apply limit if env var is set
    const maxChurches = Number(process.env.SCRAPE_MAX_CHURCHES || '0');
    if (Number.isFinite(maxChurches) && maxChurches > 0) {
      console.log(`⚠️  Limiting to ${maxChurches} churches for testing\n`);
      return allWikidataIds.slice(0, maxChurches);
    }

    return allWikidataIds;
  }

  async scrapeChurchDetails(wikidataId: string): Promise<ScrapedChurch | null> {
    try {
      const church = await this.fetchWikidataChurch(wikidataId);

      if (!church) {
        this.failedChurches.push({ id: Number(wikidataId), error: 'Not found' });
        return null;
      }

      // Skip if not in Quebec (basic geographic filter)
      if (!this.isInQuebec(church.latitude, church.longitude)) {
        return null;
      }

      // Parse address
      const address = this.parseAddress(church);

      // Try to infer mass schedules (basic default)
      const massSchedules = this.inferDefaultMassSchedules();

      const scrapedChurch: ScrapedChurch = {
        name: church.name || 'Église sans nom',
        address,
        latitude: church.latitude,
        longitude: church.longitude,
        contact: church.churches[0]?.massesUrl
          ? { website: church.churches[0].massesUrl }
          : undefined,
        massSchedules,
        rites: ['french_paul_vi'], // Default rite for Quebec
        languages: ['French'], // Primary language in Quebec
        description: `Église catholique située à ${church.place.name}`,
        sourceUrl: `https://www.wikidata.org/wiki/Q${church.id}`,
      };

      this.scrapedChurches.set(church.id, scrapedChurch);
      return scrapedChurch;
    } catch (error: any) {
      this.failedChurches.push({
        id: Number(wikidataId),
        error: error?.message || 'Unknown error',
      });
      return null;
    }
  }

  private async fetchDiocese(dioceseId: number): Promise<Diocese | null> {
    const url = `${this.config.baseUrl}/api/dioceses/${dioceseId}`;

    try {
      const response = await this.axios.get(url);
      return response.data as Diocese;
    } catch (error) {
      console.error(`Failed to fetch diocese ${dioceseId}:`, error);
      return null;
    }
  }

  private async fetchWikidataChurch(wikidataId: string): Promise<WikidataChurch | null> {
    const url = `${this.config.baseUrl}/api/wikidata_churches/${wikidataId}`;

    try {
      const response = await this.axios.get(url);
      return response.data as WikidataChurch;
    } catch (error) {
      return null;
    }
  }

  /**
   * Basic geographic filter for Quebec province
   * Quebec bounds (approximate):
   * - Latitude: 45°N to 62°N
   * - Longitude: -79.8°W to -57°W
   */
  private isInQuebec(lat: number, lon: number): boolean {
    return lat >= 45 && lat <= 62 && lon >= -79.8 && lon <= -57;
  }

  private parseAddress(church: WikidataChurch): ScrapedChurch['address'] {
    // Try to extract city from place
    const city = church.place.name || 'Québec';

    // OpenChurch doesn't always have detailed addresses
    const street = church.address || '';

    // Infer postal code from place if available (Quebec format: H0H 0H0)
    // For now, leave empty as we don't have reliable postal code data
    const postalCode = '';

    return {
      street,
      postalCode,
      city,
    };
  }

  /**
   * Default mass schedules for Quebec churches
   * Most churches have weekend masses
   */
  private inferDefaultMassSchedules(): ScrapedChurch['massSchedules'] {
    return [
      {
        dayOfWeek: 0, // Sunday
        time: '10:00',
        rite: 'french_paul_vi',
        language: 'French',
        notes: 'Horaire à confirmer',
      },
    ];
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scraping statistics
   */
  public getStats() {
    return {
      totalChurches: this.scrapedChurches.size,
      failedChurches: this.failedChurches.length,
      diocesesCovered: Array.from(this.diocesesCovered),
      successRate: (
        (this.scrapedChurches.size /
          (this.scrapedChurches.size + this.failedChurches.length)) *
        100
      ).toFixed(2),
    };
  }

  /**
   * Get failed churches for debugging
   */
  public getFailedChurches() {
    return this.failedChurches;
  }
}
