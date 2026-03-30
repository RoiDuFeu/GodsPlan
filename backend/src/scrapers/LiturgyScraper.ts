/**
 * LiturgyScraper.ts
 * 
 * Fetches daily Catholic Mass readings with full text
 * 
 * Two-step process:
 * 1. Get references from catholic-readings-api (GitHub)
 * 2. Scrape full text from USCCB.org
 * 
 * API Coverage: 2025-2026 (EN only, references to USCCB)
 * No rate limits, no API key, hosted on GitHub Pages
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const API_BASE = 'https://cpbjr.github.io/catholic-readings-api';

export interface LiturgyReading {
  title: string;       // e.g., "First Reading", "Gospel"
  reference: string;   // e.g., "Isaiah 42:1-7"
  text: string;        // Full text (not provided by API, only references)
}

export interface DailyLiturgy {
  date: string;              // ISO date (YYYY-MM-DD)
  liturgicalDay: string;     // e.g., "Holy Week"
  liturgicalColor: string;   // e.g., "purple" (not provided by API)
  readings: LiturgyReading[];
  psalm?: {
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
      
      // Now fetch full text from USCCB
      if (data.usccbLink) {
        await this.enrichWithFullText(liturgy, data.usccbLink);
      }
      
      return liturgy;
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`[LiturgyScraper] No liturgy data for date: ${date}`);
      } else {
        console.error('[LiturgyScraper] Error fetching liturgy:', error.message);
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
        
        // Extract text (skip title and reference lines)
        const textLines = lines.slice(1)
          .filter((line: string) => 
            line.trim() && 
            !line.startsWith('[') &&
            !line.includes('Lectionary:') &&
            line.length > 5
          );
        
        const fullText = textLines.join('\n').trim();
        
        if (!fullText) return;
        
        // Match by title
        if (title.toLowerCase().includes('reading 1') || 
            title.toLowerCase().includes('first reading')) {
          const reading = liturgy.readings.find(r => r.title === 'First Reading');
          if (reading) reading.text = fullText;
          
        } else if (title.toLowerCase().includes('reading 2') || 
                   title.toLowerCase().includes('second reading')) {
          const reading = liturgy.readings.find(r => r.title === 'Second Reading');
          if (reading) reading.text = fullText;
          
        } else if (title.toLowerCase().includes('responsorial psalm') ||
                   title.toLowerCase().includes('psalm')) {
          const psalmReading = liturgy.readings.find(r => r.title === 'Psalm');
          if (psalmReading) psalmReading.text = fullText;
          
          // Update psalm object
          if (liturgy.psalm) {
            liturgy.psalm.text = fullText;
            
            // Extract refrain (line starting with R. or R/ or Refrain:)
            const refrainMatch = fullText.match(/^R[.\/]\s*(.+?)$/m);
            if (refrainMatch) {
              liturgy.psalm.refrain = refrainMatch[1].trim();
            }
          }
          
        } else if (title.toLowerCase().includes('gospel')) {
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
