import puppeteer, { Browser, Page } from 'puppeteer';
import { Church } from '../models/Church';
import { ScrapedChurch } from './BaseScraper';

export interface GoogleMapsScrapedChurch extends ScrapedChurch {
  placeId?: string;
  googleMapsUrl?: string;
}

interface GoogleMapsScraperOptions {
  useFixtures?: boolean;
  rateLimitMs?: number;
  timeoutMs?: number;
  headless?: boolean;
  maxPhotos?: number;
}

interface RawGoogleMapsData {
  name?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  rating?: number;
  userRatingsTotal?: number;
  photos?: string[];
  website?: string;
  phone?: string;
  placeId?: string;
  mapsUrl?: string;
}

const fixtureData: Record<string, GoogleMapsScrapedChurch> = {
  'notre dame de paris': {
    placeId: 'fixture-notre-dame-paris',
    name: 'Cathédrale Notre-Dame de Paris',
    address: {
      street: '6 Parvis Notre-Dame - Pl. Jean-Paul II',
      postalCode: '75004',
      city: 'Paris',
    },
    latitude: 48.8530204,
    longitude: 2.3499031,
    contact: {
      phone: '+33 1 42 34 56 10',
      website: 'https://www.notredamedeparis.fr',
    },
    openingHours: [
      'lundi: 07:45–19:00',
      'mardi: 07:45–19:00',
      'mercredi: 07:45–19:00',
      'jeudi: 07:45–19:00',
      'vendredi: 07:45–19:00',
      'samedi: 08:15–19:30',
      'dimanche: 08:15–19:30',
    ],
    photos: [
      'https://lh3.googleusercontent.com/p/AF1QipNotreDame1',
      'https://lh3.googleusercontent.com/p/AF1QipNotreDame2',
    ],
    rating: 4.8,
    userRatingsTotal: 57420,
    googleMapsUrl: 'https://maps.google.com/?q=place_id:fixture-notre-dame-paris',
    sourceUrl: 'https://maps.google.com/?q=place_id:fixture-notre-dame-paris',
  },
  'sacre coeur de montmartre': {
    placeId: 'fixture-sacre-coeur-montmartre',
    name: 'Basilique du Sacré-Cœur de Montmartre',
    address: {
      street: '35 Rue du Chevalier de la Barre',
      postalCode: '75018',
      city: 'Paris',
    },
    latitude: 48.8867046,
    longitude: 2.3431043,
    contact: {
      phone: '+33 1 53 41 89 01',
      website: 'https://www.sacre-coeur-montmartre.com',
    },
    openingHours: [
      'lundi: 06:30–22:30',
      'mardi: 06:30–22:30',
      'mercredi: 06:30–22:30',
      'jeudi: 06:30–22:30',
      'vendredi: 06:30–22:30',
      'samedi: 06:30–22:30',
      'dimanche: 06:30–22:30',
    ],
    photos: [
      'https://lh3.googleusercontent.com/p/AF1QipSacreCoeur1',
      'https://lh3.googleusercontent.com/p/AF1QipSacreCoeur2',
      'https://lh3.googleusercontent.com/p/AF1QipSacreCoeur3',
    ],
    rating: 4.7,
    userRatingsTotal: 129874,
    googleMapsUrl: 'https://maps.google.com/?q=place_id:fixture-sacre-coeur-montmartre',
    sourceUrl: 'https://maps.google.com/?q=place_id:fixture-sacre-coeur-montmartre',
  },
};

const normalizeName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export class GoogleMapsScraper {
  private readonly useFixtures: boolean;
  private readonly rateLimitMs: number;
  private readonly timeoutMs: number;
  private readonly headless: boolean;
  private readonly maxPhotos: number;

  private browser: Browser | null = null;
  private page: Page | null = null;
  private lastRequestTs = 0;

  constructor(options: GoogleMapsScraperOptions = {}) {
    this.useFixtures = options.useFixtures ?? process.env.GOOGLE_SCRAPER_USE_FIXTURES === 'true';
    this.rateLimitMs = Number(options.rateLimitMs ?? process.env.GOOGLE_MAPS_RATE_LIMIT_MS ?? 2500);
    this.timeoutMs = Number(options.timeoutMs ?? process.env.SCRAPE_TIMEOUT_MS ?? 45000);
    this.headless = options.headless ?? true;
    this.maxPhotos = Number(options.maxPhotos ?? process.env.GOOGLE_MAPS_MAX_PHOTOS ?? 8);
  }

  isEnabled(): boolean {
    return true;
  }

  async enrichChurch(church: Church): Promise<GoogleMapsScrapedChurch | null> {
    if (this.useFixtures) {
      return this.fromFixtures(church.name);
    }

    const query = this.buildQuery(church);

    try {
      await this.waitForRateLimit();

      const page = await this.getPage();
      
      // 🚀 NEW: Inject consent cookies BEFORE navigation
      await this.bypassConsentWithCookies(page);

      // Build URL with consent parameter
      const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&hl=en`;

      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeoutMs,
      });

      await this.sleep(1200);

      // 🚀 NEW: Try to dismiss consent banner if it appears
      const consentDismissed = await this.tryDismissConsentBanner(page);
      
      if (consentDismissed) {
        console.log(`✅ Consent banner dismissed for "${church.name}"`);
        await this.sleep(800); // Wait for redirect/reload
      }

      if (await this.isConsentOrBlockedPage(page)) {
        console.warn(`⚠️ Google Maps blocked/consent required for "${church.name}"`);
        return null;
      }

      await this.focusFirstSearchResultIfNeeded(page);
      await this.waitForPlacePanel(page);

      const raw = await this.extractRawData(page);

      if (!raw.name && !raw.addressLine) {
        console.warn(`⚠️ Google Maps result not found for ${church.name}`);
        return null;
      }

      const mapped = this.mapRawResult(raw, church.name);
      if (!mapped) {
        return null;
      }

      return mapped;
    } catch (error) {
      console.warn(`⚠️ Google Maps scrape failed for ${church.name}:`, error);
      return null;
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private buildQuery(church: Church): string {
    const parts = [
      church.name,
      church.address?.street,
      church.address?.postalCode,
      church.address?.city,
      'France',
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async getPage(): Promise<Page> {
    if (this.page) {
      return this.page;
    }

    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled', // Hide automation
        ],
      });
    }

    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(this.timeoutMs);
    await this.page.evaluateOnNewDocument('if(!window.__name)window.__name=function(fn){return fn}');

    // Set realistic user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Set additional headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
    });

    return this.page;
  }

  /**
   * 🚀 NEW METHOD: Bypass consent by injecting pre-accepted cookies
   * Strategy A: Most reliable and clean approach
   */
  private async bypassConsentWithCookies(page: Page): Promise<void> {
    try {
      // Multiple cookie strategies to maximize success rate
      const cookies = [
        {
          name: 'CONSENT',
          value: 'YES+cb.20210720-07-p0.en+FX+410',
          domain: '.google.com',
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax' as const,
        },
        {
          name: 'SOCS',
          value: 'CAESHAgBEhJnd3NfMjAyNDA5MTAtMF9SQzIaAmVuIAEaBgiA-LOsBg',
          domain: '.google.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const,
        },
      ];

      await page.setCookie(...cookies);
    } catch (error) {
      console.warn('⚠️ Failed to set consent cookies:', error);
    }
  }

  /**
   * 🚀 NEW METHOD: Try to dismiss consent banner by clicking accept buttons
   * Strategy B: Fallback if cookies don't work
   */
  private async tryDismissConsentBanner(page: Page): Promise<boolean> {
    try {
      // List of possible selectors for consent accept buttons (2026 selectors)
      const acceptSelectors = [
        'button[aria-label*="Accept"]',
        'button[aria-label*="Accepter"]',
        'button:has-text("Accept all")',
        'button:has-text("Tout accepter")',
        'form[action*="consent"] button[type="submit"]',
        '#introAgreeButton',
        'button[jsname="higCR"]', // Google's internal button name
        'div[role="dialog"] button:first-of-type',
      ];

      for (const selector of acceptSelectors) {
        try {
          const button = await page.waitForSelector(selector, { timeout: 2000 });
          if (button) {
            await button.click();
            return true;
          }
        } catch {
          // Try next selector
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTs;
    if (elapsed < this.rateLimitMs) {
      await this.sleep(this.rateLimitMs - elapsed);
    }
    this.lastRequestTs = Date.now();
  }

  private async isConsentOrBlockedPage(page: Page): Promise<boolean> {
    const title = (await page.title()).toLowerCase();
    if (title.includes('before you continue') || title.includes('consent')) {
      return true;
    }

    const url = page.url().toLowerCase();
    if (url.includes('consent.google.com')) {
      return true;
    }

    const body = (
      await page.evaluate(() => {
        const doc = (globalThis as any).document;
        return doc?.body?.innerText || '';
      })
    ).toLowerCase();

    return (
      body.includes('before you continue to google') ||
      body.includes("avant d'accéder à google") ||
      body.includes('unusual traffic')
    );
  }

  private async focusFirstSearchResultIfNeeded(page: Page): Promise<void> {
    const hasMainHeader = await page.$('h1.DUwDvf, h1.fontHeadlineLarge');
    if (hasMainHeader) {
      return;
    }

    const firstResult = await page.$('a.hfpxzc');
    if (!firstResult) {
      return;
    }

    await firstResult.click();
    await this.sleep(1600);
  }

  private async waitForPlacePanel(page: Page): Promise<void> {
    await page
      .waitForSelector('h1.DUwDvf, h1.fontHeadlineLarge, button[data-item-id="address"]', {
        timeout: this.timeoutMs,
      })
      .catch(() => undefined);
  }

  private async extractRawData(page: Page): Promise<RawGoogleMapsData> {
    const name = await this.readTextFromSelectors(page, ['h1.DUwDvf', 'h1.fontHeadlineLarge', 'h1']);

    const addressLine = await this.readTextFromSelectors(page, [
      'button[data-item-id="address"] .fontBodyMedium',
      'button[data-item-id^="address"] .fontBodyMedium',
      'button[data-item-id="address"]',
      'button[data-item-id^="address"]',
    ]);

    const phone = await this.readTextFromSelectors(page, [
      'button[data-item-id^="phone:tel:"] .fontBodyMedium',
      'button[data-item-id="phone"] .fontBodyMedium',
      'button[data-item-id^="phone:tel:"]',
      'button[data-item-id="phone"]',
    ]);

    const website = await this.readHrefFromSelectors(page, [
      'a[data-item-id="authority"]',
      'a[data-item-id^="authority"]',
      'a[data-item-id="oloc"]',
    ]);

    const ratingText = await this.readTextFromSelectors(page, [
      'div.F7nice span[aria-hidden="true"]',
      'span.ceNzKf',
    ]);

    const ratingsCountText = await this.readTextFromSelectors(page, [
      'button[jsaction*="pane.rating.moreReviews"] span',
      'button[jsaction*="pane.rating.moreReviews"]',
      'div.F7nice span:last-child',
    ]);

    const ratingAria = await this.readTextFromSelectors(page, [
      'span[aria-label*="étoile"]',
      'span[aria-label*="star"]',
    ]);

    let rating = this.parseFloatSafe(ratingText);
    let userRatingsTotal = this.parseIntSafe(ratingsCountText);

    if ((!rating || !userRatingsTotal) && ratingAria) {
      const decimal = ratingAria.match(/([0-9]+(?:[,.][0-9]+)?)/);
      const reviews = ratingAria.match(/([0-9\s\u202f\u00a0]+)\s*(avis|reviews?)/i);

      if (!rating && decimal?.[1]) {
        rating = this.parseFloatSafe(decimal[1]);
      }

      if (!userRatingsTotal && reviews?.[1]) {
        userRatingsTotal = this.parseIntSafe(reviews[1]);
      }
    }

    const canonical = await page
      .$eval('link[rel="canonical"]', (node) => (node as any).href || '')
      .catch(() => '');

    const currentUrl = page.url();
    const urls = [currentUrl, canonical].filter(Boolean);

    let latitude: number | undefined;
    let longitude: number | undefined;
    let placeId: string | undefined;

    for (const url of urls) {
      const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        latitude = Number.parseFloat(coordMatch[1]);
        longitude = Number.parseFloat(coordMatch[2]);
      }

      const placeMatch = url.match(/!1s([^!]+)!/) || url.match(/[?&]ftid=([^&]+)/);
      if (placeMatch?.[1]) {
        placeId = decodeURIComponent(placeMatch[1]);
      }
    }

    const openingHours = await page
      .$$eval(
        'table tr, [aria-label*="lundi" i], [aria-label*="monday" i], button[data-item-id="oh"]',
        (nodes) =>
          Array.from(
            new Set(
              nodes
                .map((node) => (node as any).innerText || node.textContent || '')
                .map((text) => String(text).replace(/\s+/g, ' ').trim())
                .filter(Boolean)
                .filter((line) =>
                  /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(
                    line
                  )
                )
                .filter((line) => line.length <= 120)
            )
          ).slice(0, 7)
      )
      .catch(() => [] as string[]);

    const photos = await page
      .$$eval(
        'img',
        (imgs, limit) =>
          Array.from(
            new Set(
              (imgs as any[])
                .map((img) => (img.currentSrc || img.src || '').trim())
                .filter((url) => /googleusercontent\.com/i.test(url) || /ggpht\.com/i.test(url))
                .filter((url) => !/\/maps\/vt\?/i.test(url))
                .map((url) => url.replace(/=w\d+-h\d+(-k-no)?$/i, ''))
            )
          ).slice(0, Number(limit) || 8),
        this.maxPhotos
      )
      .catch(() => [] as string[]);

    return {
      name,
      addressLine,
      latitude,
      longitude,
      openingHours,
      rating,
      userRatingsTotal,
      photos,
      website,
      phone,
      placeId,
      mapsUrl: canonical || currentUrl,
    };
  }

  private async readTextFromSelectors(page: Page, selectors: string[]): Promise<string | undefined> {
    for (const selector of selectors) {
      const text = await page
        .$eval(selector, (node) => ((node as any).innerText || node.textContent || '').trim())
        .catch(() => '');

      const normalized = text.replace(/\s+/g, ' ').trim();
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private async readHrefFromSelectors(page: Page, selectors: string[]): Promise<string | undefined> {
    for (const selector of selectors) {
      const href = await page
        .$eval(selector, (node) => (node as any).href || node.getAttribute?.('href') || '')
        .catch(() => '');

      const normalized = String(href).trim();
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private parseFloatSafe(raw?: string): number | undefined {
    if (!raw) {
      return undefined;
    }

    const normalized = raw.replace(',', '.').replace(/[^0-9.-]/g, '');
    if (!normalized) {
      return undefined;
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseIntSafe(raw?: string): number | undefined {
    if (!raw) {
      return undefined;
    }

    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) {
      return undefined;
    }

    const parsed = Number.parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private mapRawResult(raw: RawGoogleMapsData, fallbackName: string): GoogleMapsScrapedChurch | null {
    const address = this.parseAddress(raw.addressLine || '');
    const name = raw.name || fallbackName;

    if (!name) {
      return null;
    }

    const mapsUrl = raw.mapsUrl || this.buildFallbackMapsUrl(name, address.city);

    const normalizedName = normalizeName(name);
    if (
      mapsUrl.includes('consent.google.com') ||
      normalizedName.includes('avant d acceder a google') ||
      normalizedName.includes('before you continue')
    ) {
      return null;
    }

    return {
      placeId: raw.placeId,
      name,
      address,
      latitude: raw.latitude,
      longitude: raw.longitude,
      contact:
        raw.phone || raw.website
          ? {
              phone: raw.phone,
              website: raw.website,
            }
          : undefined,
      openingHours: raw.openingHours || [],
      photos: raw.photos || [],
      rating: raw.rating,
      userRatingsTotal: raw.userRatingsTotal,
      googleMapsUrl: mapsUrl,
      sourceUrl: mapsUrl,
    };
  }

  private parseAddress(addressLine: string): ScrapedChurch['address'] {
    const compact = addressLine.replace(/\s+/g, ' ').trim();

    if (!compact) {
      return {
        street: '',
        postalCode: '75000',
        city: 'Paris',
      };
    }

    const match = compact.match(/^(.*?)(\d{5})\s+([^,]+)(?:,\s*France)?$/u);

    if (match) {
      return {
        street: match[1].trim().replace(/,$/, ''),
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

  private buildFallbackMapsUrl(name: string, city?: string): string {
    const query = [name, city].filter(Boolean).join(' ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  private fromFixtures(name: string): GoogleMapsScrapedChurch | null {
    const normalized = normalizeName(name);
    const exact = fixtureData[normalized];

    if (exact) {
      return { ...exact };
    }

    const partialKey = Object.keys(fixtureData).find(
      (key) => normalized.includes(key) || key.includes(normalized)
    );

    if (!partialKey) {
      console.warn(`⚠️ No Google Maps fixture found for ${name}`);
      return null;
    }

    return { ...fixtureData[partialKey] };
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
