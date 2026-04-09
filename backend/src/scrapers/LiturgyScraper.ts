/**
 * LiturgyScraper.ts
 *
 * Fetches daily Catholic Mass readings in English AND French
 *
 * English (USCCB):
 * 1. Get references from catholic-readings-api (GitHub)
 * 2. Scrape full text from USCCB.org
 * API Coverage: 2025-2026, no rate limits, no API key
 *
 * French (AELF):
 * 1. Get full readings from AELF API (api.aelf.org)
 * Full text included, no API key needed
 */

import axios from 'axios';

const API_BASE = 'https://cpbjr.github.io/catholic-readings-api';
const AELF_API_BASE = 'https://api.aelf.org/v1';

export interface LiturgyReading {
  title: string;       // e.g., "First Reading", "Gospel"
  reference: string;   // e.g., "Isaiah 42:1-7"
  text: string;        // Full text
}

export interface DailyLiturgy {
  date: string;              // ISO date (YYYY-MM-DD)
  liturgicalDay: string;     // English: e.g., "Holy Week"
  liturgicalDayFr?: string;  // French: e.g., "Jeudi dans l'Octave de Pâques"
  liturgicalColor: string;   // e.g., "purple"
  readings: LiturgyReading[];
  psalm?: {
    reference: string;
    refrain: string;
    text: string;
  };
  readingsFr?: LiturgyReading[];
  psalmFr?: {
    reference: string;
    refrain: string;
    text: string;
  };
  usccbLink: string;        // Official USCCB verification link
}

export class LiturgyScraper {
  /**
   * Fetch daily liturgy from catholic-readings-api
   * @param date - Date in YYYY-MM-DD format (defaults to today)
   */
  async fetchDailyLiturgy(date?: string): Promise<DailyLiturgy | null> {
    try {
      const targetDate = date || this.getTodayISO();
      const [year, month, day] = targetDate.split('-');
      const url = `${API_BASE}/readings/${year}/${month}-${day}.json`;
      
      console.log(`[LiturgyScraper] Fetching ${url}...`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'GodsPlan/1.0 (Catholic church finder app)',
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      const data = response.data;
      
      if (!data || !data.readings) {
        console.warn(`[LiturgyScraper] Invalid response for ${targetDate}`);
        return null;
      }
      
      // Transform API format to our internal format
      const readings: LiturgyReading[] = [];
      
      if (data.readings.firstReading) {
        readings.push({
          title: 'First Reading',
          reference: data.readings.firstReading,
          text: '' // API only provides references, not full text
        });
      }
      
      if (data.readings.psalm) {
        readings.push({
          title: 'Psalm',
          reference: data.readings.psalm,
          text: ''
        });
      }
      
      if (data.readings.secondReading) {
        readings.push({
          title: 'Second Reading',
          reference: data.readings.secondReading,
          text: ''
        });
      }
      
      if (data.readings.gospel) {
        readings.push({
          title: 'Gospel',
          reference: data.readings.gospel,
          text: ''
        });
      }
      
      const psalm = data.readings.psalm ? {
        reference: data.readings.psalm,
        refrain: '',
        text: ''
      } : undefined;
      
      const liturgy: DailyLiturgy = {
        date: targetDate,
        liturgicalDay: data.season || '',
        liturgicalColor: this.getSeasonColor(data.season),
        readings,
        psalm,
        usccbLink: data.usccbLink || ''
      };
      
      console.log(`[LiturgyScraper] ✓ Fetched ${readings.length} readings (references only)`);

      // Fetch full text from USCCB (English)
      if (data.usccbLink) {
        await this.enrichWithFullText(liturgy, data.usccbLink);
      }

      // Fetch French readings from AELF
      await this.fetchAelfReadings(liturgy);

      return liturgy;

    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`[LiturgyScraper] No English liturgy data for date: ${date}`);
      } else {
        console.error('[LiturgyScraper] Error fetching English liturgy:', error.message);
      }

      // Even if English fails, try French-only
      try {
        const targetDate = date || this.getTodayISO();
        const liturgy: DailyLiturgy = {
          date: targetDate,
          liturgicalDay: '',
          liturgicalColor: 'green',
          readings: [],
          usccbLink: ''
        };
        await this.fetchAelfReadings(liturgy);

        if (liturgy.readingsFr && liturgy.readingsFr.length > 0) {
          console.log(`[LiturgyScraper] ✓ French-only fallback succeeded`);
          return liturgy;
        }
      } catch (frError: any) {
        console.error('[LiturgyScraper] French fallback also failed:', frError.message);
      }

      return null;
    }
  }
  
  /**
   * Fetch full text from USCCB markdown and enrich readings
   */
  private async enrichWithFullText(liturgy: DailyLiturgy, usccbLink: string): Promise<void> {
    try {
      console.log(`[LiturgyScraper] Fetching full text from USCCB markdown...`);
      
      // USCCB provides markdown version at .cfm.md
      const markdownUrl = `${usccbLink}.md`;
      
      const response = await axios.get(markdownUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/markdown,text/plain'
        },
        timeout: 15000
      });
      
      const markdown = response.data;
      
      // Parse markdown sections
      // Format: ### Reading 1 \n [Isaiah 42:1-7](...) \n\n text...
      const sections = markdown.split(/^###\s+/m).filter(Boolean);
      
      sections.forEach((section: string) => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        
        // Extract text: skip title, reference links, and USCCB footer junk
        const textLines = lines.slice(1)
          .filter((line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return false;
            if (trimmed.startsWith('[') && trimmed.includes('](')) return false;
            if (trimmed.startsWith('- [')) return false;
            if (trimmed.includes('Lectionary:') || trimmed.includes('Lectionary for Mass')) return false;
            if (trimmed.includes('Copyright') || trimmed.includes('copyright')) return false;
            if (trimmed.includes('SUBSCRIBE') || trimmed.includes('Privacy Policy')) return false;
            if (trimmed.includes('LISTEN PODCAST') || trimmed.includes('VIEW REFLECTION')) return false;
            if (trimmed.includes('En Español') || trimmed.includes('View Calendar')) return false;
            if (trimmed.includes('Daily Readings E-mails') || trimmed.includes('I Agree that')) return false;
            if (trimmed.startsWith('##')) return false;
            if (trimmed.length <= 5) return false;
            return true;
          })
          .map((line: string) => {
            // Strip markdown bold markers and inline links
            return line
              .replace(/\*\*(.*?)\*\*/g, '$1')
              .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
          });

        const fullText = textLines.join('\n').trim();
        
        if (!fullText) return;
        
        // Match by title (USCCB uses Roman numerals: "Reading I", "Reading II")
        // Check "reading ii" before "reading i" since "reading ii" contains "reading i"
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('reading 2') ||
            lowerTitle.includes('reading ii') ||
            lowerTitle.includes('second reading')) {
          const reading = liturgy.readings.find(r => r.title === 'Second Reading');
          if (reading) reading.text = fullText;

        } else if (lowerTitle.includes('reading 1') ||
                   lowerTitle.includes('reading i') ||
                   lowerTitle.includes('first reading')) {
          const reading = liturgy.readings.find(r => r.title === 'First Reading');
          if (reading) reading.text = fullText;
          
        } else if (lowerTitle.includes('responsorial psalm') ||
                   lowerTitle.includes('psalm')) {
          const psalmReading = liturgy.readings.find(r => r.title === 'Psalm');
          if (psalmReading) psalmReading.text = fullText;
          
          // Update psalm object
          if (liturgy.psalm) {
            liturgy.psalm.text = fullText;
            
            // Extract refrain (first line starting with R. or R/)
            const refrainMatch = fullText.match(/^R[.\/]\s*(.+?)$/m);
            if (refrainMatch) {
              liturgy.psalm.refrain = refrainMatch[1].trim()
                .replace(/\*\*(.*?)\*\*/g, '$1');
            }
          }
          
        } else if (lowerTitle.includes('gospel')) {
          const reading = liturgy.readings.find(r => r.title === 'Gospel');
          if (reading) reading.text = fullText;
        }
      });
      
      const enrichedCount = liturgy.readings.filter(r => r.text.length > 0).length;
      console.log(`[LiturgyScraper] ✓ Enriched ${enrichedCount}/${liturgy.readings.length} readings with full text`);
      
    } catch (error: any) {
      console.error('[LiturgyScraper] Failed to fetch full text from USCCB:', error.message);
      // Don't throw - we still have references even if text fetch fails
    }
  }
  
  /**
   * Fetch French readings from AELF API
   */
  private async fetchAelfReadings(liturgy: DailyLiturgy): Promise<void> {
    try {
      const url = `${AELF_API_BASE}/messes/${liturgy.date}/france`;
      console.log(`[LiturgyScraper] Fetching French readings from AELF: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'GodsPlan/1.0 (Catholic church finder app)',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      const data = response.data;
      if (!data?.messes?.[0]?.lectures) {
        console.warn(`[LiturgyScraper] No AELF data for ${liturgy.date}`);
        return;
      }

      const info = data.informations;
      const lectures = data.messes[0].lectures;

      // Set French liturgical day info
      liturgy.liturgicalDayFr = info?.jour_liturgique_nom || '';

      // Map AELF color to our color system (AELF uses French color names)
      if (info?.couleur && !liturgy.liturgicalColor) {
        liturgy.liturgicalColor = this.mapAelfColor(info.couleur);
      }

      const readingsFr: LiturgyReading[] = [];
      let psalmFr: DailyLiturgy['psalmFr'] = undefined;

      for (const lecture of lectures) {
        const text = this.stripHtml(lecture.contenu || '');
        const reference = lecture.ref || '';

        switch (lecture.type) {
          case 'lecture_1':
            readingsFr.push({
              title: 'Première lecture',
              reference,
              text
            });
            break;

          case 'lecture_2':
            readingsFr.push({
              title: 'Deuxième lecture',
              reference,
              text
            });
            break;

          case 'psaume':
            psalmFr = {
              reference,
              refrain: this.stripHtml(lecture.refrain_psalmique || ''),
              text
            };
            readingsFr.push({
              title: 'Psaume',
              reference,
              text
            });
            break;

          case 'evangile':
            readingsFr.push({
              title: 'Évangile',
              reference,
              text
            });
            break;

          default:
            // Other types (sequence, verset_evangile, etc.) — skip
            break;
        }
      }

      liturgy.readingsFr = readingsFr;
      liturgy.psalmFr = psalmFr;

      console.log(`[LiturgyScraper] ✓ Fetched ${readingsFr.length} French readings from AELF`);

    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`[LiturgyScraper] No AELF data for ${liturgy.date}`);
      } else {
        console.error('[LiturgyScraper] Error fetching AELF readings:', error.message);
      }
    }
  }

  /**
   * Strip HTML tags and decode entities from AELF content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&laquo;/g, '«')
      .replace(/&raquo;/g, '»')
      .replace(/&rsquo;/g, '\u2019')
      .replace(/&lsquo;/g, '\u2018')
      .replace(/&rdquo;/g, '\u201D')
      .replace(/&ldquo;/g, '\u201C')
      .replace(/&ndash;/g, '\u2013')
      .replace(/&mdash;/g, '\u2014')
      .replace(/&hellip;/g, '\u2026')
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Map AELF French color names to our standard color system
   */
  private mapAelfColor(couleur: string): string {
    switch (couleur.toLowerCase()) {
      case 'blanc': return 'white';
      case 'vert': return 'green';
      case 'violet': return 'purple';
      case 'rouge': return 'red';
      case 'rose': return 'rose';
      default: return 'green';
    }
  }

  /**
   * Map liturgical season to color
   */
  private getSeasonColor(season: string = ''): string {
    const lowerSeason = season.toLowerCase();
    
    if (lowerSeason.includes('advent') || lowerSeason.includes('lent')) return 'purple';
    if (lowerSeason.includes('christmas') || lowerSeason.includes('easter')) return 'white';
    if (lowerSeason.includes('holy week')) return 'purple';
    if (lowerSeason.includes('pentecost')) return 'red';
    
    return 'green'; // Ordinary Time default
  }
  
  /**
   * Fetch next Sunday's liturgy
   */
  async fetchNextSundayLiturgy(): Promise<DailyLiturgy | null> {
    const nextSunday = this.getNextSunday();
    return this.fetchDailyLiturgy(nextSunday);
  }
  
  /**
   * Fetch current week's Sunday liturgy
   */
  async fetchCurrentSundayLiturgy(): Promise<DailyLiturgy | null> {
    const currentSunday = this.getCurrentOrPreviousSunday();
    return this.fetchDailyLiturgy(currentSunday);
  }
  
  /**
   * Get today's date in ISO format (YYYY-MM-DD)
   */
  private getTodayISO(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  /**
   * Get next Sunday's date
   */
  getNextSunday(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : (7 - dayOfWeek);
    
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    
    return nextSunday.toISOString().split('T')[0];
  }
  
  /**
   * Get current Sunday (or previous if not Sunday today)
   */
  private getCurrentOrPreviousSunday(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
    
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - daysSinceSunday);
    
    return sunday.toISOString().split('T')[0];
  }
}

// Export singleton instance
export const liturgyScraper = new LiturgyScraper();
