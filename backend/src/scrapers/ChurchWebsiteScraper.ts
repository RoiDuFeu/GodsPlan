/**
 * ChurchWebsiteScraper — Visits individual parish websites to extract
 * mass schedules, confession/adoration times, and events.
 *
 * This is an enrichment scraper: it updates existing Church records,
 * not creates new ones.
 */

import puppeteer, { Browser, CDPSession, Page } from 'puppeteer';
import { Church, OfficeSchedule, MassSchedule, ChurchRite } from '../models/Church';
import { parseSchedules, ParsedScheduleData, ParsedMassSchedule } from './FrenchScheduleParser';
import { ScraperCallbacks, ScraperLogEntry, ScreencastFrame } from './BaseScraper';
import { ConcurrentRateLimiter } from './utils/rateLimiter';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface WebsiteEnrichmentResult {
  churchId: string;
  churchName: string;
  websiteUrl: string;
  massSchedules: MassSchedule[];
  officeSchedules: OfficeSchedule[];
  events: Church['upcomingEvents'];
  subPagesVisited: number;
  confidence: number; // 0-100
}

interface ExtractedPageContent {
  url: string;
  text: string;
  html: string;
  scheduleLinks: string[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_RATE_LIMIT_MS = 3000;
const MAX_SUBPAGES = 3;
const PAGE_TIMEOUT_MS = 30_000;
const ENRICH_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes max per church

const SCHEDULE_LINK_KEYWORDS = [
  'horaire', 'messe', 'célébration', 'celebration',
  'confession', 'réconciliation', 'reconciliation',
  'sacrement', 'liturgie', 'office', 'programme',
  'agenda', 'adoration', 'vêpres', 'vepres',
];

const CONSENT_SELECTORS = [
  'button:has-text("Accepter")',
  'button:has-text("J\'accepte")',
  'button:has-text("Tout accepter")',
  'button:has-text("Accept all")',
  'button:has-text("OK")',
  '[id*="accept"]',
  '[class*="accept"]',
  '[id*="consent"] button',
  '.cc-accept',
  '.cookie-accept',
  '#cookie-accept',
  'button[data-action="accept"]',
];

const SKIP_DOMAINS = [
  'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com',
  'linkedin.com', 'tiktok.com', 'pinterest.com',
];

// ── Scraper Class ───────────────────────────────────────────────────────────

export class ChurchWebsiteScraper {
  private browser: Browser | null = null;
  private pagePool: Page[] = [];
  private pagePoolAvailable: Page[] = [];
  private pagePoolWaiters: Array<(page: Page) => void> = [];
  private cdpSessions: CDPSession[] = [];
  private screenshotCallback?: (data: ScreencastFrame) => void;
  private concurrency: number;
  private rateLimiter: ConcurrentRateLimiter;

  constructor(options?: { concurrency?: number; rateLimitMs?: number }) {
    this.concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
    const rateLimitMs = options?.rateLimitMs
      ?? (Number(process.env.CHURCH_WEBSITE_RATE_LIMIT_MS) || DEFAULT_RATE_LIMIT_MS);
    this.rateLimiter = new ConcurrentRateLimiter(rateLimitMs);
  }

  // ── Browser Management ──────────────────────────────────────────────────

  /**
   * Enable live browser frame streaming via CDP screencast.
   * Must be called before the first `enrichChurch` call.
   */
  enableScreencast(callback: (data: ScreencastFrame) => void): void {
    this.screenshotCallback = callback;
  }

  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
        ],
      });

      // Create page pool: enough pages for concurrent churches + their subpages
      const poolSize = this.concurrency * (1 + MAX_SUBPAGES);
      for (let i = 0; i < poolSize; i++) {
        const page = await this.browser.newPage();
        await page.evaluateOnNewDocument('if(!window.__name)window.__name=function(fn){return fn}');
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );
        await page.setViewport({ width: 1280, height: 800 });
        // Block images, fonts, and media for speed
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const type = req.resourceType();
          if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
            req.abort();
          } else {
            req.continue();
          }
        });
        this.pagePool.push(page);
        this.pagePoolAvailable.push(page);

        // Start CDP screencast only on main worker pages (not subpage slots)
        const pagesPerWorker = 1 + MAX_SUBPAGES;
        const isMainWorkerPage = i % pagesPerWorker === 0;
        if (this.screenshotCallback && isMainWorkerPage) {
          try {
            const cdp = await page.createCDPSession();
            this.cdpSessions.push(cdp);
            const workerIndex = Math.floor(i / pagesPerWorker);
            const cb = this.screenshotCallback;
            cdp.on('Page.screencastFrame', (event: any) => {
              cb({
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
              everyNthFrame: 3,
            });
          } catch {
            // Screencast is best-effort
          }
        }
      }
    }
    return this.browser;
  }

  private async acquirePage(): Promise<Page> {
    const available = this.pagePoolAvailable.pop();
    if (available) return available;

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

  async close(): Promise<void> {
    for (const cdp of this.cdpSessions) {
      await cdp.send('Page.stopScreencast').catch(() => {});
      await cdp.detach().catch(() => {});
    }
    this.cdpSessions = [];

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.pagePool = [];
      this.pagePoolAvailable = [];
    }
  }

  // ── Rate Limiting ───────────────────────────────────────────────────────

  private async rateLimit(): Promise<void> {
    await this.rateLimiter.wait();
  }

  // ── Main Enrichment Method ──────────────────────────────────────────────

  async enrichChurch(
    church: Church,
    callbacks?: ScraperCallbacks,
  ): Promise<WebsiteEnrichmentResult | null> {
    const websiteUrl = church.contact?.website;
    if (!websiteUrl) return null;

    // Skip social media links
    try {
      const urlObj = new URL(websiteUrl);
      if (SKIP_DOMAINS.some((d) => urlObj.hostname.includes(d))) {
        this.emitLog(callbacks, 'info', `Skipping social media: ${websiteUrl}`);
        return null;
      }
    } catch {
      this.emitLog(callbacks, 'warn', `Invalid URL: ${websiteUrl}`);
      return null;
    }

    await this.ensureBrowser();
    const page = await this.acquirePage();

    try {
      const result = await Promise.race([
        this.doEnrichChurch(page, church, websiteUrl, callbacks),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout: enrichment of ${church.name} exceeded ${ENRICH_TIMEOUT_MS / 1000}s`)), ENRICH_TIMEOUT_MS),
        ),
      ]);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.emitLog(callbacks, 'warn', `Error scraping ${websiteUrl}: ${msg}`);
      return null;
    } finally {
      this.releasePage(page);
    }
  }

  private async doEnrichChurch(
    page: Page,
    church: Church,
    websiteUrl: string,
    callbacks?: ScraperCallbacks,
  ): Promise<WebsiteEnrichmentResult | null> {
    // Step 1: Load homepage
    await this.rateLimit();
    const homepage = await this.extractPage(page, websiteUrl);
    if (!homepage) return null;

    // Step 2: Dismiss cookie consent
    await this.dismissConsent(page);

    // Re-extract after consent dismissal (page may have changed)
    const homepageContent = await this.extractPageContent(page);

    // Step 3: Find and visit schedule subpages in parallel
    const scheduleLinks = this.findScheduleLinks(homepageContent.html, websiteUrl);
    const allTexts: string[] = [homepageContent.text];
    let subPagesVisited = 0;

    const subpagePromises = scheduleLinks.slice(0, MAX_SUBPAGES).map(async (link) => {
      await this.rateLimit();
      const subPage = await this.acquirePage();
      try {
        const loaded = await this.extractPage(subPage, link);
        if (loaded) {
          await this.dismissConsent(subPage);
          const content = await this.extractPageContent(subPage);
          return content.text;
        }
        return null;
      } finally {
        this.releasePage(subPage);
      }
    });

    const subResults = await Promise.allSettled(subpagePromises);
    for (const result of subResults) {
      if (result.status === 'fulfilled' && result.value) {
        allTexts.push(result.value);
        subPagesVisited++;
      }
    }

    // Step 4: Parse all collected text
    const combinedText = allTexts.join('\n\n---\n\n');
    const parsed = parseSchedules(combinedText);

    // Step 5: Build enrichment result
    const massSchedules = this.convertMassSchedules(parsed);
    const officeSchedules = this.convertOfficeSchedules(parsed);
    const events = this.convertEvents(parsed);

    const confidence = this.computeConfidence(parsed, subPagesVisited);

    return {
      churchId: church.id,
      churchName: church.name,
      websiteUrl,
      massSchedules,
      officeSchedules,
      events,
      subPagesVisited,
      confidence,
    };
  }

  // ── Page Navigation & Extraction ────────────────────────────────────────

  private async extractPage(page: Page, url: string): Promise<boolean> {
    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: PAGE_TIMEOUT_MS,
      });

      if (!response || response.status() >= 400) {
        return false;
      }

      // Check for redirect to social media
      const finalUrl = page.url();
      if (SKIP_DOMAINS.some((d) => finalUrl.includes(d))) {
        return false;
      }

      // Wait a bit for JS to render
      await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});

      // Emit a manual frame for the live browser preview
      if (this.screenshotCallback) {
        try {
          const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 40 }) as string;
          const workerIndex = this.pagePool.indexOf(page);
          this.screenshotCallback({
            image: screenshot,
            pageUrl: page.url(),
            workerIndex: workerIndex >= 0 ? workerIndex : 0,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Screenshot is best-effort
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async extractPageContent(page: Page): Promise<{ text: string; html: string }> {
    const text = await page.evaluate('document.body ? document.body.innerText : ""');
    const html = await page.evaluate('document.body ? document.body.innerHTML : ""');
    return { text: String(text), html: String(html) };
  }

  private async dismissConsent(page: Page): Promise<void> {
    for (const selector of CONSENT_SELECTORS) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          await new Promise((r) => setTimeout(r, 500));
          return;
        }
      } catch {
        // Selector not found, try next
      }
    }

    // Fallback: try clicking buttons with French consent text
    try {
      await page.evaluate(`
        (function() {
          var buttons = document.querySelectorAll('button, a.btn, [role="button"]');
          var consentTexts = ['accepter', "j'accepte", 'tout accepter', 'ok', 'fermer'];
          for (var i = 0; i < buttons.length; i++) {
            var text = buttons[i].innerText ? buttons[i].innerText.toLowerCase().trim() : '';
            for (var j = 0; j < consentTexts.length; j++) {
              if (text.indexOf(consentTexts[j]) !== -1) {
                buttons[i].click();
                return;
              }
            }
          }
        })()
      `);
    } catch {
      // No consent banner found, that's fine
    }
  }

  // ── Schedule Link Discovery ─────────────────────────────────────────────

  private findScheduleLinks(html: string, baseUrl: string): string[] {
    const links: Array<{ url: string; score: number }> = [];

    // Parse anchor tags from HTML
    const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = anchorRegex.exec(html)) !== null) {
      const href = match[1];
      const linkText = match[2].replace(/<[^>]+>/g, '').toLowerCase().trim();
      const hrefLower = href.toLowerCase();

      let score = 0;
      for (const keyword of SCHEDULE_LINK_KEYWORDS) {
        if (linkText.includes(keyword)) score += 3;
        if (hrefLower.includes(keyword)) score += 2;
      }

      if (score > 0) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          // Only follow links on the same domain
          const baseHost = new URL(baseUrl).hostname;
          const linkHost = new URL(absoluteUrl).hostname;
          if (linkHost === baseHost || linkHost.endsWith('.' + baseHost)) {
            links.push({ url: absoluteUrl, score });
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }

    // Sort by score descending, deduplicate
    links.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    return links
      .filter((l) => {
        if (seen.has(l.url)) return false;
        seen.add(l.url);
        return true;
      })
      .map((l) => l.url);
  }

  // ── Data Conversion ─────────────────────────────────────────────────────

  private convertMassSchedules(parsed: ParsedScheduleData): MassSchedule[] {
    return parsed.massSchedules.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      time: s.time,
      date: s.date,
      rite: this.mapRite(s.rite),
      language: s.language,
      notes: s.notes,
    }));
  }

  private convertOfficeSchedules(parsed: ParsedScheduleData): OfficeSchedule[] {
    return parsed.officeSchedules.map((s) => ({
      type: s.type,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      date: s.date,
      notes: s.notes,
    }));
  }

  private convertEvents(parsed: ParsedScheduleData): Church['upcomingEvents'] {
    return parsed.events
      .filter((e) => e.title && e.date)
      .map((e) => ({
        title: e.title,
        description: e.description,
        date: new Date(e.date!),
        time: e.time,
        type: e.type,
      }));
  }

  private mapRite(rite?: string): ChurchRite {
    if (!rite) return ChurchRite.PAUL_VI;
    const mapping: Record<string, ChurchRite> = {
      // New clean values from detectRite
      'Tridentine': ChurchRite.LATIN_TRADITIONAL,
      'Byzantine': ChurchRite.BYZANTINE,
      'Armenian': ChurchRite.ARMENIAN,
      'Maronite': ChurchRite.MARONITE,
      // Legacy values for existing data
      latin_traditional: ChurchRite.LATIN_TRADITIONAL,
      byzantine: ChurchRite.BYZANTINE,
      armenian: ChurchRite.ARMENIAN,
      maronite: ChurchRite.MARONITE,
    };
    return mapping[rite] || ChurchRite.PAUL_VI;
  }

  // ── Confidence Scoring ──────────────────────────────────────────────────

  private computeConfidence(parsed: ParsedScheduleData, subPagesVisited: number): number {
    let score = 0;

    // Found mass schedules
    if (parsed.massSchedules.length > 0) score += 40;
    if (parsed.massSchedules.length >= 3) score += 10;

    // Found office schedules
    if (parsed.officeSchedules.length > 0) score += 20;

    // Found events
    if (parsed.events.length > 0) score += 10;

    // Visited subpages (means we found schedule-specific pages)
    if (subPagesVisited > 0) score += 15;
    if (subPagesVisited >= 2) score += 5;

    return Math.min(100, score);
  }

  // ── Logging ─────────────────────────────────────────────────────────────

  private emitLog(
    callbacks: ScraperCallbacks | undefined,
    level: ScraperLogEntry['level'],
    message: string,
  ): void {
    callbacks?.onLog?.({
      timestamp: new Date().toISOString(),
      level,
      message,
    });
  }
}
