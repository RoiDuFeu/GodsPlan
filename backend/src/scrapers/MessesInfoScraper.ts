import puppeteer, { Browser, HTTPResponse, Page } from 'puppeteer';
import { BaseScraper, ScrapedChurch } from './BaseScraper';

interface AnnuaireChurchPayload {
  id: string;
  name?: string;
  address?: string;
  zipcode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface SeedChurchData {
  name: string;
  address: ScrapedChurch['address'];
  latitude?: number;
  longitude?: number;
}

interface ExtractedSchedule {
  dayOfWeek: number;
  time: string;
  title: string;
  notes?: string;
  tags: string[];
}

interface ExtractedPageData {
  name: string;
  pageText: string;
  addressText?: string;
  phoneText?: string;
  email?: string;
  website?: string;
  schedules: ExtractedSchedule[];
}

/**
 * messes.info scraper using Puppeteer (JS-rendered pages)
 */
export class MessesInfoScraper extends BaseScraper {
  private browser: Browser | null = null;
  private listPage: Page | null = null;
  private detailPage: Page | null = null;
  private seedChurches = new Map<string, SeedChurchData>();

  constructor() {
    super({
      name: 'messes.info',
      baseUrl: 'https://www.messes.info',
      rateLimit: 500,
    });
  }

  async scrape(): Promise<ScrapedChurch[]> {
    try {
      return await super.scrape();
    } finally {
      await this.closeBrowser();
    }
  }

  async scrapeChurchList(): Promise<string[]> {
    const departmentCode = '75';
    const startUrl = `${this.config.baseUrl}/horaires-messes/${departmentCode}-paris`;
    const annuaireUrl = `${this.config.baseUrl}/annuaire/${departmentCode}`;

    try {
      const page = await this.getListPage();

      const onResponse = async (response: HTTPResponse) => {
        if (!response.url().includes('/gwtRequest')) {
          return;
        }

        const postData = response.request().postData() || '';
        if (!postData.includes(`"${departmentCode}"`)) {
          return;
        }

        try {
          const body = await response.text();
          const payloads = this.extractAnnuairePayloads(body);
          payloads.forEach((payload) => this.storeSeedChurch(payload));
        } catch {
          // ignore payload parsing errors from unrelated gwt calls
        }
      };

      page.on('response', onResponse);

      try {
        // Required URL from task
        await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 120000 });

        // Practical source for all Paris churches
        await page.goto(annuaireUrl, { waitUntil: 'networkidle2', timeout: 120000 });
        await this.sleep(1500);

        // Load additional batches via "Suite ..."
        for (let i = 0; i < 20; i += 1) {
          const beforeCount = this.seedChurches.size;
          const suiteButton = await this.findSuiteButton(page);
          if (!suiteButton) {
            break;
          }

          await page.evaluate((el) => (el as any).click(), suiteButton);
          await this.sleep(1300);

          if (this.seedChurches.size === beforeCount) {
            break;
          }
        }
      } finally {
        page.off('response', onResponse);
      }

      let urls = Array.from(this.seedChurches.keys());

      const maxChurches = Number(process.env.SCRAPE_MAX_CHURCHES || '0');
      if (Number.isFinite(maxChurches) && maxChurches > 0) {
        urls = urls.slice(0, maxChurches);
      }

      return urls;
    } catch (error) {
      console.error('Failed to scrape church list from messes.info:', error);
      return [];
    }
  }

  async scrapeChurchDetails(url: string): Promise<ScrapedChurch | null> {
    const seed = this.seedChurches.get(url);

    try {
      const page = await this.getDetailPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
      await this.sleep(900);

      const extracted = (await page.evaluate(() => {
        const doc = (globalThis as any).document;

        const dayMap: Record<string, number> = {
          dim: 0,
          dimanche: 0,
          lun: 1,
          lundi: 1,
          mar: 2,
          mardi: 2,
          mer: 3,
          mercredi: 3,
          jeu: 4,
          jeudi: 4,
          ven: 5,
          vendredi: 5,
          sam: 6,
          samedi: 6,
        };

        const rawName =
          doc.querySelector('h1')?.textContent?.trim() || doc.title || '';
        const name = rawName.replace(/\s+-\s+\d{5}.*$/u, '').trim();

        const pageText = doc.body?.innerText || '';

        const addressText =
          doc.querySelector('a.infos-pratique-adresse')?.innerText?.trim() ||
          undefined;

        const phoneText =
          pageText.match(/T[eé]l\.?\s*:?[\s\u00A0]*([+\d][\d\s().-]{7,})/iu)?.[1]?.trim() ||
          undefined;

        const email =
          doc
            .querySelector('a[href^="mailto:"]')
            ?.getAttribute('href')
            ?.replace('mailto:', '')
            ?.trim() || undefined;

        const websiteCandidates = Array.from(doc.querySelectorAll('a[href^="http"]') || []);
        const website =
          websiteCandidates
            .map((a: any) => a.getAttribute('href') || '')
            .find((href: string) => {
              const lower = href.toLowerCase();
              return (
                !lower.includes('messes.info') &&
                !lower.includes('google.') &&
                !lower.includes('wikipedia.org')
              );
            }) || undefined;

        const nodes = Array.from(
          doc.querySelectorAll(
            '.com-google-gwt-user-cellview-client-CellTree-Style-cellTreeItemValue > div'
          ) || []
        );

        const schedules: ExtractedSchedule[] = [];
        let currentDay: number | null = null;

        for (const node of nodes as any[]) {
          if (node.classList?.contains('titre-date')) {
            const token = (node.innerText || '')
              .trim()
              .toLowerCase()
              .split(/\s+/u)[0]
              ?.replace('.', '');

            if (token && dayMap[token] !== undefined) {
              currentDay = dayMap[token];
            }
            continue;
          }

          if (!node.classList?.contains('egliseinfo-celebrationtime')) {
            continue;
          }

          const title =
            node.querySelector('.egliseinfo-celebrationtime-title')?.innerText?.trim() || '';
          const timeMatch = title.match(/(\d{1,2})\s*h\s*(\d{2})/iu);

          if (!timeMatch || currentDay === null) {
            continue;
          }

          const hh = timeMatch[1].padStart(2, '0');
          const mm = timeMatch[2].padStart(2, '0');

          const tags = Array.from(node.querySelectorAll('.egliseinfo-celebrationtime-tags') || [])
            .map((el: any) => el.innerText?.trim())
            .filter(Boolean) as string[];

          const notes =
            node
              .querySelector(
                '.cef-kephas-client-resources-Resources-CSS-egliseInfoCellTreeBody'
              )
              ?.innerText
              ?.trim() || undefined;

          schedules.push({
            dayOfWeek: currentDay,
            time: `${hh}:${mm}`,
            title,
            notes,
            tags,
          });
        }

        return {
          name,
          pageText,
          addressText,
          phoneText,
          email,
          website,
          schedules,
        };
      })) as ExtractedPageData;

      const name = extracted.name || seed?.name;
      if (!name) {
        return null;
      }

      const address = this.resolveAddress(extracted.addressText, seed);

      const languageSet = new Set<string>();
      const riteSet = new Set<string>();
      const massSchedules: NonNullable<ScrapedChurch['massSchedules']> = [];

      for (const schedule of extracted.schedules) {
        const combined = `${schedule.title} ${schedule.notes || ''} ${schedule.tags.join(' ')}`;
        const language = this.inferLanguage(combined);
        const rite = this.inferRite(combined);

        if (language) {
          languageSet.add(language);
        }
        riteSet.add(rite);

        massSchedules.push({
          dayOfWeek: schedule.dayOfWeek,
          time: schedule.time,
          rite,
          language,
          notes: schedule.notes,
        });
      }

      const pageLanguage = this.inferLanguage(extracted.pageText);
      if (pageLanguage) {
        languageSet.add(pageLanguage);
      }

      riteSet.add(this.inferRite(extracted.pageText));

      return {
        name,
        address,
        latitude: seed?.latitude,
        longitude: seed?.longitude,
        contact:
          extracted.phoneText || extracted.email || extracted.website
            ? {
                phone: extracted.phoneText,
                email: extracted.email,
                website: extracted.website,
              }
            : undefined,
        massSchedules,
        rites: Array.from(riteSet),
        languages: languageSet.size > 0 ? Array.from(languageSet) : ['French'],
        sourceUrl: url,
      };
    } catch (error) {
      console.error(`Failed to scrape details from ${url}:`, error);

      if (seed) {
        return {
          name: seed.name,
          address: seed.address,
          latitude: seed.latitude,
          longitude: seed.longitude,
          massSchedules: [],
          rites: ['french_paul_vi'],
          languages: ['French'],
          sourceUrl: url,
        };
      }

      return null;
    }
  }

  private extractAnnuairePayloads(body: string): AnnuaireChurchPayload[] {
    try {
      const parsed = JSON.parse(body) as {
        O?: Array<{ P?: Partial<AnnuaireChurchPayload> }>;
      };

      if (!Array.isArray(parsed.O)) {
        return [];
      }

      const rows: AnnuaireChurchPayload[] = [];

      for (const item of parsed.O) {
        const payload = item?.P;
        if (!payload || typeof payload.id !== 'string') {
          continue;
        }

        rows.push({
          id: payload.id,
          name: payload.name,
          address: payload.address,
          zipcode: payload.zipcode,
          city: payload.city,
          latitude: typeof payload.latitude === 'number' ? payload.latitude : undefined,
          longitude: typeof payload.longitude === 'number' ? payload.longitude : undefined,
        });
      }

      return rows;
    } catch {
      return [];
    }
  }

  private storeSeedChurch(payload: AnnuaireChurchPayload): void {
    const normalizedId = payload.id.startsWith('/') ? payload.id.slice(1) : payload.id;
    const sourceUrl = `${this.config.baseUrl}/lieu/${normalizedId}`;

    if (this.seedChurches.has(sourceUrl)) {
      return;
    }

    this.seedChurches.set(sourceUrl, {
      name: payload.name?.trim() || 'Église inconnue',
      address: {
        street: payload.address?.trim() || '',
        postalCode: payload.zipcode?.trim() || '75000',
        city: payload.city?.trim() || 'Paris',
      },
      latitude: payload.latitude,
      longitude: payload.longitude,
    });
  }

  private resolveAddress(
    addressText: string | undefined,
    seed: SeedChurchData | undefined
  ): ScrapedChurch['address'] {
    if (seed) {
      return seed.address;
    }

    if (!addressText) {
      return {
        street: '',
        postalCode: '75000',
        city: 'Paris',
      };
    }

    const compact = addressText.replace(/\s+/gu, ' ').trim();
    const match = compact.match(/^(.*?)(\d{5})\s+([^,]+)(?:,\s*France)?$/u);

    if (match) {
      return {
        street: match[1].trim(),
        postalCode: match[2],
        city: match[3].trim(),
      };
    }

    return {
      street: compact,
      postalCode: '75000',
      city: 'Paris',
    };
  }

  private inferRite(text: string): string {
    const content = text.toLowerCase();

    if (
      content.includes('tridentin') ||
      content.includes('missel de 1962') ||
      content.includes('forme extraordinaire')
    ) {
      return 'latin_traditional';
    }

    if (content.includes('byzantin')) {
      return 'byzantine';
    }

    return 'french_paul_vi';
  }

  private inferLanguage(text: string): string | undefined {
    const content = text.toLowerCase();

    if (content.includes('français') || content.includes('french')) {
      return 'French';
    }
    if (content.includes('anglais') || content.includes('english')) {
      return 'English';
    }
    if (content.includes('espagnol') || content.includes('spanish')) {
      return 'Spanish';
    }
    if (content.includes('italien') || content.includes('italian')) {
      return 'Italian';
    }
    if (content.includes('portugais') || content.includes('portuguese')) {
      return 'Portuguese';
    }
    if (content.includes('latin')) {
      return 'Latin';
    }

    return undefined;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    return this.browser;
  }

  private async getListPage(): Promise<Page> {
    if (this.listPage) {
      return this.listPage;
    }

    const browser = await this.getBrowser();
    this.listPage = await browser.newPage();
    this.listPage.setDefaultTimeout(120000);

    return this.listPage;
  }

  private async getDetailPage(): Promise<Page> {
    if (this.detailPage) {
      return this.detailPage;
    }

    const browser = await this.getBrowser();
    this.detailPage = await browser.newPage();
    this.detailPage.setDefaultTimeout(120000);

    return this.detailPage;
  }

  private async findSuiteButton(
    page: Page
  ): Promise<import('puppeteer').ElementHandle<any> | null> {
    const buttons = await page.$$('button.gwt-Button');

    for (const button of buttons) {
      const label = await button.evaluate((el) => el.textContent?.trim() || '');
      if (label.toLowerCase().startsWith('suite')) {
        return button;
      }
    }

    return null;
  }

  private async closeBrowser(): Promise<void> {
    if (this.listPage) {
      await this.listPage.close();
      this.listPage = null;
    }

    if (this.detailPage) {
      await this.detailPage.close();
      this.detailPage = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
