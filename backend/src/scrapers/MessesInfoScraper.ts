import puppeteer, { Browser, CDPSession, HTTPResponse, Page } from 'puppeteer';
import { BaseScraper, ScrapedChurch, ScraperCallbacks, ScreencastFrame } from './BaseScraper';

interface AnnuaireChurchPayload {
  id: string;
  name?: string;
  address?: string;
  zipcode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface SeedChurchData {
  name: string;
  address: ScrapedChurch['address'];
  latitude?: number;
  longitude?: number;
}

type CelebrationCategory = 'mass' | 'confession' | 'adoration' | 'vespers' | 'lauds' | 'permanence' | 'other';

interface ExtractedSchedule {
  dayOfWeek: number;
  time: string;
  date?: string; // ISO date string (YYYY-MM-DD)
  endTime?: string;
  title: string;
  notes?: string;
  tags: string[];
  category: CelebrationCategory;
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
 * Ile-de-France department name mapping for messes.info URLs
 */
const DEPARTMENT_NAMES: Record<string, string> = {
  '75': 'paris',
  '77': 'seine-et-marne',
  '78': 'yvelines',
  '91': 'essonne',
  '92': 'hauts-de-seine',
  '93': 'seine-saint-denis',
  '94': 'val-de-marne',
  '95': 'val-d-oise',
};

const DEPARTMENT_CITIES: Record<string, string> = {
  '75': 'Paris',
  '77': 'Melun',
  '78': 'Versailles',
  '91': 'Évry',
  '92': 'Nanterre',
  '93': 'Bobigny',
  '94': 'Créteil',
  '95': 'Cergy',
};

/**
 * messes.info scraper using Puppeteer (JS-rendered pages)
 */
const DEFAULT_CONCURRENCY = 4;

export class MessesInfoScraper extends BaseScraper {
  private browser: Browser | null = null;
  private listPage: Page | null = null;
  private pagePool: Page[] = [];
  private pagePoolAvailable: Page[] = [];
  private pagePoolWaiters: Array<(page: Page) => void> = [];
  private cdpSessions: CDPSession[] = [];
  private seedChurches = new Map<string, SeedChurchData>();
  private departments: string[];
  private currentDepartment = '75';
  private _skipDiscovery = false;
  private _staleUrls = new Set<string>();

  constructor(departments: string[] = ['75'], concurrency: number = DEFAULT_CONCURRENCY) {
    super({
      name: 'messes.info',
      baseUrl: 'https://www.messes.info',
      rateLimit: 500,
      concurrency,
    });
    this.departments = departments;
  }

  private callbacks?: ScraperCallbacks;

  set skipDiscovery(value: boolean) {
    this._skipDiscovery = value;
  }

  /**
   * Pre-populate seedChurches from cached DB data so we can skip the
   * expensive annuaire discovery phase on subsequent runs.
   */
  loadCachedUrls(entries: Array<{ url: string; seed: SeedChurchData }>): void {
    for (const entry of entries) {
      if (!this.seedChurches.has(entry.url)) {
        this.seedChurches.set(entry.url, entry.seed);
      }
    }
  }

  /**
   * Returns URLs that were in the cache but returned no usable data
   * during detail scraping (page gone or changed).
   */
  getStaleUrls(): string[] {
    return Array.from(this._staleUrls);
  }

  protected getChurchDisplayName(url: string): string {
    return this.seedChurches.get(url)?.name || url;
  }

  async scrape(callbacks?: ScraperCallbacks): Promise<ScrapedChurch[]> {
    this.callbacks = callbacks;
    try {
      return await super.scrape(callbacks);
    } finally {
      this.callbacks = undefined;
      await this.closeBrowser();
    }
  }

  async scrapeChurchList(): Promise<string[]> {
    // If cache is loaded and discovery is skipped, return cached URLs directly
    if (this._skipDiscovery && this.seedChurches.size > 0) {
      this.emitLog(this.callbacks, {
        level: 'info',
        message: `Using ${this.seedChurches.size} cached URLs, skipping annuaire discovery`,
        phase: 'list',
      });

      let urls = Array.from(this.seedChurches.keys());
      const maxChurches = Number(process.env.SCRAPE_MAX_CHURCHES || '0');
      if (Number.isFinite(maxChurches) && maxChurches > 0) {
        urls = urls.slice(0, maxChurches);
      }
      return urls;
    }

    try {
      const browser = await this.getBrowser();

      // Run departments in parallel (max 3 concurrent to avoid overloading messes.info)
      const DEPT_CONCURRENCY = Math.min(3, this.departments.length);
      const deptQueue = [...this.departments];

      const deptWorker = async () => {
        while (deptQueue.length > 0) {
          if (this.callbacks?.shouldCancel?.()) {
            this.emitLog(this.callbacks, { level: 'warn', message: 'Scraping cancelled by user', phase: 'list' });
            break;
          }

          const departmentCode = deptQueue.shift()!;
          const page = await browser.newPage();
          page.setDefaultTimeout(120000);

          try {
            await this.scrapeDepartment(page, departmentCode);
          } finally {
            await page.close().catch(() => {});
          }
        }
      };

      await Promise.all(Array.from({ length: DEPT_CONCURRENCY }, () => deptWorker()));

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

  private async scrapeDepartment(page: Page, departmentCode: string): Promise<void> {
    const deptName = DEPARTMENT_NAMES[departmentCode] || departmentCode;
    console.log(`📍 Scraping department ${departmentCode} (${deptName})...`);

    const startUrl = `${this.config.baseUrl}/horaires-messes/${departmentCode}-${deptName}`;
    const annuaireUrl = `${this.config.baseUrl}/annuaire/${departmentCode}`;

    this.emitLog(this.callbacks, {
      level: 'info',
      message: `Loading department ${departmentCode} (${deptName})`,
      url: annuaireUrl,
      phase: 'list',
    });

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
        payloads.forEach((payload) => this.storeSeedChurch(payload, departmentCode));
      } catch {
        // ignore payload parsing errors from unrelated gwt calls
      }
    };

    page.on('response', onResponse);

    try {
      await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 120000 });

      await page.goto(annuaireUrl, { waitUntil: 'networkidle2', timeout: 120000 });
      await this.sleep(1500);

      this.emitLog(this.callbacks, {
        level: 'info',
        message: `Department ${departmentCode}: initial page loaded, ${this.seedChurches.size} churches found`,
        phase: 'list',
      });

      // Load additional batches via "Suite ..."
      for (let i = 0; i < 20; i += 1) {
        const beforeCount = this.seedChurches.size;
        const suiteButton = await this.findSuiteButton(page);
        if (!suiteButton) {
          break;
        }

        this.emitLog(this.callbacks, {
          level: 'info',
          message: `Department ${departmentCode}: loading batch ${i + 1}... (${this.seedChurches.size} churches so far)`,
          phase: 'list',
        });

        await page.evaluate((el) => (el as any).click(), suiteButton);
        await this.sleep(1300);

        if (this.seedChurches.size === beforeCount) {
          break;
        }

        this.emitLog(this.callbacks, {
          level: 'info',
          message: `Department ${departmentCode}: batch ${i + 1} loaded, ${this.seedChurches.size} churches total`,
          phase: 'list',
        });
      }
    } finally {
      page.off('response', onResponse);
    }

    this.emitLog(this.callbacks, {
      level: 'success',
      message: `Department ${departmentCode} complete: ${this.seedChurches.size} churches collected`,
      phase: 'list',
    });
    console.log(`📍 Department ${departmentCode}: ${this.seedChurches.size} churches so far`);
  }

  async scrapeChurchDetails(url: string): Promise<ScrapedChurch | null> {
    const seed = this.seedChurches.get(url);
    const page = await this.acquirePage();
    const workerIndex = this.pagePool.indexOf(page);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

      // Emit a manual frame so every worker is visible in the live browser preview
      if (this.callbacks?.onFrame) {
        try {
          const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 40 }) as string;
          this.callbacks.onFrame({
            image: screenshot,
            pageUrl: page.url(),
            workerIndex: workerIndex >= 0 ? workerIndex : 0,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Screenshot is best-effort
        }
      }

      await this.sleep(500 + Math.random() * 500);

      // Expand all collapsed GWT CellTree branches so every day/category is in the DOM
      await this.expandAllTreeNodes(page);

      // Collect schedules across all visible weeks — dedupe by day+date+time+category+title
      const scheduleMap = new Map<string, ExtractedSchedule>();
      let extracted = await this.extractPageData(page);
      const mergeSchedules = (data: ExtractedPageData) => {
        for (const s of data.schedules) {
          const key = `${s.dayOfWeek}|${s.date || ''}|${s.time}|${s.category}|${s.title}`;
          if (!scheduleMap.has(key)) scheduleMap.set(key, s);
        }
      };
      mergeSchedules(extracted);

      // Paginate through additional weeks via "Suite" button if present
      for (let i = 0; i < 8; i += 1) {
        const suiteButton = await this.findSuiteButton(page);
        if (!suiteButton) break;
        try {
          await page.evaluate((el) => (el as any).click(), suiteButton);
        } catch {
          break;
        }
        await this.sleep(1200);
        await this.expandAllTreeNodes(page);
        const next = await this.extractPageData(page);
        const beforeCount = scheduleMap.size;
        mergeSchedules(next);
        if (scheduleMap.size === beforeCount) break; // no new data, stop
        extracted = next; // keep metadata fresh (name/address/etc.)
      }

      extracted = { ...extracted, schedules: Array.from(scheduleMap.values()) };

      const name = extracted.name || seed?.name;
      if (!name) {
        this._staleUrls.add(url);
        return null;
      }

      const address = this.resolveAddress(extracted.addressText, seed);

      const languageSet = new Set<string>();
      const riteSet = new Set<string>();
      const massSchedules: NonNullable<ScrapedChurch['massSchedules']> = [];
      const officeSchedules: NonNullable<ScrapedChurch['officeSchedules']> = [];

      const OFFICE_CATEGORY_MAP: Record<string, 'confession' | 'adoration' | 'vespers' | 'lauds' | 'other'> = {
        confession: 'confession',
        adoration: 'adoration',
        vespers: 'vespers',
        lauds: 'lauds',
        permanence: 'other',
        other: 'other',
      };

      for (const schedule of extracted.schedules) {
        const combined = `${schedule.title} ${schedule.notes || ''} ${schedule.tags.join(' ')}`;
        let language = this.inferLanguage(combined);
        const rite = this.inferRite(combined);

        // Infer language from rite when not explicitly detected
        if (!language) {
          if (rite === 'Tridentine') language = 'Latin';
        }

        if (language) {
          languageSet.add(language);
        }
        riteSet.add(rite);

        if (schedule.category === 'mass') {
          massSchedules.push({
            dayOfWeek: schedule.dayOfWeek,
            time: schedule.time,
            date: schedule.date,
            rite,
            language,
            notes: schedule.notes,
          });
        } else {
          const officeType = OFFICE_CATEGORY_MAP[schedule.category] || 'other';
          officeSchedules.push({
            type: officeType,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.time,
            endTime: schedule.endTime,
            date: schedule.date,
            notes: schedule.notes,
          });
        }
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
        officeSchedules: officeSchedules.length > 0 ? officeSchedules : undefined,
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
          rites: ['Paul VI'],
          languages: ['French'],
          sourceUrl: url,
        };
      }

      this._staleUrls.add(url);
      return null;
    } finally {
      this.releasePage(page);
    }
  }

  /**
   * Expands every collapsed branch in the GWT CellTree so all day headers and
   * celebration entries are materialized in the DOM before extraction.
   * The church detail page starts with most branches collapsed — without this
   * step we only see the handful of entries auto-opened by the widget.
   */
  private async expandAllTreeNodes(page: Page): Promise<void> {
    try {
      await page.evaluate(async () => {
        const doc = (globalThis as any).document;
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

        // GWT CellTree marks collapsed branches with a class containing
        // "cellTreeClosedItem" on the chevron image wrapper. We also check
        // ARIA state as a fallback for any non-GWT widgets.
        const findClosed = (): any[] => {
          const selectors = [
            '[class*="cellTreeClosedItem"]',
            '[role="treeitem"][aria-expanded="false"]',
          ];
          const set = new Set<any>();
          for (const sel of selectors) {
            for (const el of Array.from(doc.querySelectorAll(sel) || [])) {
              set.add(el);
            }
          }
          return Array.from(set);
        };

        for (let i = 0; i < 25; i += 1) {
          const closed = findClosed();
          if (closed.length === 0) break;
          for (const el of closed) {
            try {
              (el as any).click?.();
            } catch {
              // ignore — some nodes may detach mid-iteration
            }
          }
          await sleep(250);
        }
      });
    } catch {
      // Expansion is best-effort; fall through to extraction with whatever is visible
    }
  }

  /**
   * Runs the DOM scraping logic and returns structured page data.
   * Kept as a reusable helper so we can re-extract after expanding the tree
   * and after paginating to additional weeks.
   */
  private async extractPageData(page: Page): Promise<ExtractedPageData> {
    return (await page.evaluate(() => {
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

      const categoryMap: Record<string, string> = {
        messe: 'mass',
        messes: 'mass',
        eucharistie: 'mass',
        confession: 'confession',
        confessions: 'confession',
        réconciliation: 'confession',
        reconciliation: 'confession',
        pénitence: 'confession',
        penitence: 'confession',
        adoration: 'adoration',
        adorations: 'adoration',
        'saint sacrement': 'adoration',
        'saint-sacrement': 'adoration',
        vêpres: 'vespers',
        vepres: 'vespers',
        laudes: 'lauds',
        permanence: 'permanence',
        permanences: 'permanence',
        accueil: 'permanence',
        chapelet: 'other',
        rosaire: 'other',
        prière: 'other',
        priere: 'other',
        office: 'other',
        complies: 'other',
        tierce: 'other',
        sexte: 'other',
        none: 'other',
      };

      const detectCategory = (text: string): string | null => {
        const lower = text.toLowerCase().trim();
        for (const [keyword, category] of Object.entries(categoryMap)) {
          if (lower.includes(keyword)) {
            return category;
          }
        }
        return null;
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
      const EXCLUDED_DOMAINS = [
        'messes.info',
        'google.',
        'wikipedia.org',
        'eglise.catholique.fr',
        'facebook.com',
        'twitter.com',
        'instagram.com',
        'youtube.com',
        'linkedin.com',
        'tiktok.com',
        'apple.com',
        'play.google.com',
        'apps.apple.com',
      ];
      const website =
        websiteCandidates
          .map((a: any) => a.getAttribute('href') || '')
          .find((href: string) => {
            const lower = href.toLowerCase();
            return EXCLUDED_DOMAINS.every((domain) => !lower.includes(domain));
          }) || undefined;

      const schedules: Array<{
        dayOfWeek: number;
        date?: string;
        time: string;
        endTime?: string;
        title: string;
        notes?: string;
        tags: string[];
        category: string;
      }> = [];

      const monthMap: Record<string, number> = {
        janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3,
        mai: 4, juin: 5, juillet: 6, août: 7, aout: 7,
        septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
      };

      let currentCategory: string = 'mass';
      let currentDay: number | null = null;
      let currentDate: string | undefined = undefined;

      const nodes = Array.from(
        doc.querySelectorAll(
          '.com-google-gwt-user-cellview-client-CellTree-Style-cellTreeItemValue > div'
        ) || []
      );

      for (const node of nodes as any[]) {
        if (node.classList?.contains('titre-date')) {
          const headerText = (node.innerText || '').trim().toLowerCase();
          const token = headerText.split(/\s+/u)[0]?.replace('.', '');

          if (token && dayMap[token] !== undefined) {
            currentDay = dayMap[token];
          }

          currentDate = undefined;
          const dateMatch = headerText.match(/(\d{1,2})\s+([a-zéûô]+)(?:\s+(\d{4}))?/u);
          if (dateMatch) {
            const dayNum = parseInt(dateMatch[1], 10);
            const monthName = dateMatch[2];
            const yearStr = dateMatch[3];
            const monthIdx = monthMap[monthName];
            if (monthIdx !== undefined && dayNum >= 1 && dayNum <= 31) {
              const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
              const mm = String(monthIdx + 1).padStart(2, '0');
              const dd = String(dayNum).padStart(2, '0');
              currentDate = `${year}-${mm}-${dd}`;
            }
          }
          continue;
        }

        if (node.classList?.contains('egliseinfo-celebrationtime')) {
          const title =
            node.querySelector('.egliseinfo-celebrationtime-title')?.innerText?.trim() || '';

          const rangeMatch = title.match(
            /(\d{1,2})\s*h\s*(\d{2})\s*[-–àa]\s*(\d{1,2})\s*h\s*(\d{2})/iu
          );
          const singleMatch = title.match(/(\d{1,2})\s*h\s*(\d{2})/iu);

          if (!singleMatch || currentDay === null) {
            continue;
          }

          const hh = singleMatch[1].padStart(2, '0');
          const mm = singleMatch[2].padStart(2, '0');

          let endTime: string | undefined;
          if (rangeMatch) {
            endTime = `${rangeMatch[3].padStart(2, '0')}:${rangeMatch[4].padStart(2, '0')}`;
          }

          const tags = Array.from(
            node.querySelectorAll('.egliseinfo-celebrationtime-tags') || []
          )
            .map((el: any) => el.innerText?.trim())
            .filter(Boolean) as string[];

          const notes =
            node
              .querySelector(
                '.cef-kephas-client-resources-Resources-CSS-egliseInfoCellTreeBody'
              )
              ?.innerText
              ?.trim() || undefined;

          const combinedText = `${title} ${tags.join(' ')} ${notes || ''}`;
          const inferredCategory = detectCategory(combinedText);

          schedules.push({
            dayOfWeek: currentDay,
            date: currentDate,
            time: `${hh}:${mm}`,
            endTime,
            title,
            notes,
            tags,
            category: inferredCategory || currentCategory,
          });
          continue;
        }

        const nodeText = (node.innerText || node.textContent || '').trim();
        if (nodeText.length > 0 && nodeText.length < 100) {
          const detected = detectCategory(nodeText);
          if (detected) {
            currentCategory = detected;
            currentDay = null;
            currentDate = undefined;
          }
        }
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

  private storeSeedChurch(payload: AnnuaireChurchPayload, departmentCode?: string): void {
    const normalizedId = payload.id.startsWith('/') ? payload.id.slice(1) : payload.id;
    const sourceUrl = `${this.config.baseUrl}/lieu/${normalizedId}`;

    if (this.seedChurches.has(sourceUrl)) {
      return;
    }

    const dept = departmentCode || this.currentDepartment;
    const defaultPostal = `${dept}000`;
    const defaultCity = DEPARTMENT_CITIES[dept] || 'Paris';

    this.seedChurches.set(sourceUrl, {
      name: payload.name?.trim() || 'Église inconnue',
      address: {
        street: payload.address?.trim() || '',
        postalCode: payload.zipcode?.trim() || defaultPostal,
        city: payload.city?.trim() || defaultCity,
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

    const defaultPostal = `${this.currentDepartment}000`;
    const defaultCity = DEPARTMENT_CITIES[this.currentDepartment] || 'Paris';

    if (!addressText) {
      return {
        street: '',
        postalCode: defaultPostal,
        city: defaultCity,
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
      postalCode: defaultPostal,
      city: defaultCity,
    };
  }

  private inferRite(text: string): string {
    const content = text.toLowerCase();

    if (
      content.includes('tridentin') ||
      content.includes('missel de 1962') ||
      content.includes('forme extraordinaire')
    ) {
      return 'Tridentine';
    }

    if (content.includes('byzantin')) {
      return 'Byzantine';
    }

    if (content.includes('maronite')) {
      return 'Maronite';
    }

    if (content.includes('arménien') || content.includes('armenien')) {
      return 'Armenian';
    }

    return 'Paul VI';
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
    await this.listPage.evaluateOnNewDocument('if(!window.__name)window.__name=function(fn){return fn}');

    return this.listPage;
  }

  private async initPagePool(): Promise<void> {
    if (this.pagePool.length > 0) return;

    const concurrency = this.config.concurrency || DEFAULT_CONCURRENCY;
    const browser = await this.getBrowser();

    for (let i = 0; i < concurrency; i++) {
      const page = await browser.newPage();
      page.setDefaultTimeout(120000);
      await page.evaluateOnNewDocument('if(!window.__name)window.__name=function(fn){return fn}');
      this.pagePool.push(page);
      this.pagePoolAvailable.push(page);

      // Start CDP screencast for live browser preview
      if (this.callbacks?.onFrame) {
        try {
          const cdp = await page.createCDPSession();
          this.cdpSessions.push(cdp);
          const workerIndex = i;
          cdp.on('Page.screencastFrame', (event: any) => {
            this.callbacks?.onFrame?.({
              image: event.data,
              pageUrl: page.url(),
              workerIndex,
              timestamp: new Date().toISOString(),
            });
            cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
          });
          await cdp.send('Page.startScreencast', {
            format: 'jpeg',
            quality: 40,
            maxWidth: 800,
            maxHeight: 600,
            everyNthFrame: 1,
          });
        } catch {
          // Screencast is best-effort, don't fail scraping
        }
      }
    }
  }

  private async acquirePage(): Promise<Page> {
    await this.initPagePool();

    const page = this.pagePoolAvailable.pop();
    if (page) return page;

    // All pages busy — wait for one to be released
    return new Promise<Page>((resolve) => {
      this.pagePoolWaiters.push(resolve);
    });
  }

  private releasePage(page: Page): void {
    const waiter = this.pagePoolWaiters.shift();
    if (waiter) {
      waiter(page);
    } else {
      this.pagePoolAvailable.push(page);
    }
  }

  /**
   * Scrape a single church by its messes.info URL.
   * This is a lightweight operation — opens a browser, scrapes one page, closes.
   */
  async scrapeSingleChurch(url: string, seed?: SeedChurchData, onFrame?: (data: ScreencastFrame) => void): Promise<ScrapedChurch | null> {
    if (seed) {
      this.seedChurches.set(url, seed);
    }

    if (onFrame) {
      this.callbacks = { ...this.callbacks, onFrame };
    }

    try {
      const result = await this.scrapeChurchDetails(url);
      return result;
    } finally {
      this.callbacks = undefined;
      await this.closeBrowser();
    }
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
      await this.listPage.close().catch(() => {});
      this.listPage = null;
    }

    for (const cdp of this.cdpSessions) {
      await cdp.send('Page.stopScreencast').catch(() => {});
      await cdp.detach().catch(() => {});
    }
    this.cdpSessions = [];

    for (const page of this.pagePool) {
      await page.close().catch(() => {});
    }
    this.pagePool = [];
    this.pagePoolAvailable = [];
    this.pagePoolWaiters = [];

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
