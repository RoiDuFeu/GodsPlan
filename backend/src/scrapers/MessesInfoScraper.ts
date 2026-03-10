import { BaseScraper, ScrapedChurch } from './BaseScraper';

/**
 * Scraper for messes.info - Catholic mass schedules in France
 */
export class MessesInfoScraper extends BaseScraper {
  constructor() {
    super({
      name: 'messes.info',
      baseUrl: 'https://www.messes.info',
      rateLimit: 2000, // Be respectful: 2s between requests
    });
  }

  /**
   * Scrape list of church URLs in Paris
   */
  async scrapeChurchList(): Promise<string[]> {
    const churchUrls: string[] = [];
    
    try {
      // Paris departement code is 75
      const $ = await this.fetchPage('/horaires-messes/75-paris');
      
      // Find all church links
      $('a[href*="/horaires-messes/"]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && href.includes('/horaires-messes/') && !href.endsWith('/75-paris')) {
          const fullUrl = href.startsWith('http') ? href : `${this.config.baseUrl}${href}`;
          if (!churchUrls.includes(fullUrl)) {
            churchUrls.push(fullUrl);
          }
        }
      });
      
      return churchUrls;
    } catch (error) {
      console.error('Failed to scrape church list from messes.info:', error);
      return [];
    }
  }

  /**
   * Scrape detailed information for a specific church
   */
  async scrapeChurchDetails(url: string): Promise<ScrapedChurch | null> {
    try {
      const $ = await this.fetchPage(url);
      
      // Extract church name
      const name = $('h1').first().text().trim();
      if (!name) {
        console.warn(`No name found for ${url}`);
        return null;
      }
      
      // Extract address
      const addressText = $('.adresse, .address, [itemprop="address"]')
        .first()
        .text()
        .trim();
      
      const address = this.parseAddress(addressText);
      
      // Extract contact information
      const phone = $('a[href^="tel:"]').first().text().trim() || undefined;
      const email = $('a[href^="mailto:"]').first().text().trim() || undefined;
      const website = $('a[href^="http"]')
        .filter((_, el) => {
          const href = $(el).attr('href');
          return href && !href.includes('messes.info');
        })
        .first()
        .attr('href');
      
      // Extract mass schedules
      const massSchedules = this.parseMassSchedules($);
      
      // Extract rites and languages
      const rites = this.parseRites($);
      const languages = this.parseLanguages($);
      
      const church: ScrapedChurch = {
        name,
        address,
        contact: phone || email || website ? { phone, email, website } : undefined,
        massSchedules,
        rites,
        languages,
        sourceUrl: url,
      };
      
      return church;
    } catch (error) {
      console.error(`Failed to scrape details from ${url}:`, error);
      return null;
    }
  }

  /**
   * Parse address string into structured format
   */
  private parseAddress(addressText: string): ScrapedChurch['address'] {
    const lines = addressText.split('\n').map((l) => l.trim()).filter(Boolean);
    
    // Try to extract postal code and city
    const postalCodeMatch = addressText.match(/(\d{5})\s+([A-Za-zÀ-ÿ\s-]+)/);
    
    return {
      street: lines[0] || '',
      postalCode: postalCodeMatch?.[1] || '75000',
      city: postalCodeMatch?.[2]?.trim() || 'Paris',
    };
  }

  /**
   * Parse mass schedules from the page
   */
  private parseMassSchedules($: cheerio.CheerioAPI): ScrapedChurch['massSchedules'] {
    const schedules: ScrapedChurch['massSchedules'] = [];
    
    // Look for schedule tables or lists
    $('.horaires, .schedule, table').each((_, element) => {
      $(element).find('tr, li').each((_, row) => {
        const text = $(row).text().trim();
        
        // Try to extract day and time
        const dayMatch = text.match(/(Dimanche|Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi)/i);
        const timeMatch = text.match(/(\d{1,2}[h:]\d{2})/g);
        
        if (dayMatch && timeMatch) {
          const dayOfWeek = this.dayNameToNumber(dayMatch[1]);
          
          timeMatch.forEach((time) => {
            schedules?.push({
              dayOfWeek,
              time: time.replace('h', ':'),
              rite: 'french_paul_vi', // Default, can be refined
              language: 'French',
            });
          });
        }
      });
    });
    
    return schedules;
  }

  /**
   * Parse rites mentioned on the page
   */
  private parseRites($: cheerio.CheerioAPI): string[] {
    const rites: string[] = [];
    const pageText = $('body').text().toLowerCase();
    
    if (pageText.includes('latin') || pageText.includes('forme extraordinaire')) {
      rites.push('latin_traditional');
    }
    if (pageText.includes('paul vi') || pageText.includes('forme ordinaire')) {
      rites.push('french_paul_vi');
    }
    if (pageText.includes('byzantin')) {
      rites.push('byzantine');
    }
    
    return rites.length > 0 ? rites : ['french_paul_vi'];
  }

  /**
   * Parse languages from the page
   */
  private parseLanguages($: cheerio.CheerioAPI): string[] {
    const languages: string[] = ['French']; // Default
    const pageText = $('body').text().toLowerCase();
    
    if (pageText.includes('anglais') || pageText.includes('english')) {
      languages.push('English');
    }
    if (pageText.includes('espagnol') || pageText.includes('spanish')) {
      languages.push('Spanish');
    }
    if (pageText.includes('polonais') || pageText.includes('polish')) {
      languages.push('Polish');
    }
    
    return languages;
  }

  /**
   * Convert day name to day number (0 = Sunday)
   */
  private dayNameToNumber(dayName: string): number {
    const days: { [key: string]: number } = {
      dimanche: 0,
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6,
    };
    
    return days[dayName.toLowerCase()] ?? 0;
  }
}
