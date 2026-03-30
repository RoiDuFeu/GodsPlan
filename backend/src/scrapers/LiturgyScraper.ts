/**
 * LiturgyScraper.ts
 * 
 * Dual-language scraper for Catholic liturgy readings (FR + EN)
 * Sources:
 * - FR: AELF.org (Association Épiscopale Liturgique Francophone)
 * - EN: USCCB.org (United States Conference of Catholic Bishops)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface LiturgyReading {
  title: string;
  reference: string;
  text: string;
}

export interface DailyLiturgy {
  date: string;
  liturgicalDay: string;
  liturgicalColor: string;
  readings: LiturgyReading[];
  psalm?: {
    reference: string;
    refrain: string;
    text: string;
  };
}

export interface BilingualLiturgy {
  date: string;
  fr: DailyLiturgy | null;
  en: DailyLiturgy | null;
}

export class LiturgyScraper {
  /**
   * Fetch liturgy in both languages
   */
  async fetchBilingualLiturgy(date?: string): Promise<BilingualLiturgy> {
    const targetDate = date || this.getTodayISO();
    
    const [fr, en] = await Promise.all([
      this.fetchFrenchLiturgy(targetDate),
      this.fetchEnglishLiturgy(targetDate)
    ]);
    
    return { date: targetDate, fr, en };
  }
  
  /**
   * Fetch French liturgy from AELF.org
   */
  async fetchFrenchLiturgy(date: string): Promise<DailyLiturgy | null> {
    try {
      const [year, month, day] = date.split('-');
      const url = `https://www.aelf.org/${year}-${month}-${day}/romain/messe`;
      
      console.log(`[LiturgyScraper FR] Fetching ${url}...`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      
      const liturgicalDay = $('.jour-liturgique').first().text().trim() || 
                           $('h1').first().text().trim() || '';
      
      const readings: LiturgyReading[] = [];
      let psalmData = null;
      
      // AELF structure: .block-single-messe contains readings
      $('.block-single-messe .lecture, .lecture').each((i, elem) => {
        const $section = $(elem);
        
        const title = $section.find('h3, .lecture-title').first().text().trim();
        const reference = $section.find('.ref, .lecture-reference').first().text().trim();
        
        const textParts: string[] = [];
        $section.find('p.contenu, .lecture-text p, .texte p').each((_, p) => {
          const text = $(p).text().trim();
          if (text && text.length > 5) textParts.push(text);
        });
        
        const text = textParts.join('\n\n');
        
        if (text.length > 20 && title) {
          if (title.toLowerCase().includes('psaume')) {
            const refrain = $section.find('.antienne, .refrain').first().text().trim();
            psalmData = { reference, refrain, text };
          }
          
          readings.push({ title, reference, text });
        }
      });
      
      if (readings.length === 0) {
        console.warn(`[LiturgyScraper FR] No readings found for ${date}`);
        return null;
      }
      
      console.log(`[LiturgyScraper FR] ✓ ${readings.length} readings`);
      
      return {
        date,
        liturgicalDay,
        liturgicalColor: 'vert',
        readings,
        psalm: psalmData || undefined
      };
      
    } catch (error: any) {
      console.error('[LiturgyScraper FR] Error:', error.message);
      return null;
    }
  }
  
  /**
   * Fetch English liturgy from USCCB.org
   */
  async fetchEnglishLiturgy(date: string): Promise<DailyLiturgy | null> {
    try {
      const [year, month, day] = date.split('-');
      const url = `https://bible.usccb.org/bible/readings/${month}${day}${year.slice(2)}.cfm`;
      
      console.log(`[LiturgyScraper EN] Fetching ${url}...`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      
      const liturgicalDay = $('h1.page-title').first().text().trim() ||
                           $('.b-lectionary h2').first().text().trim() || '';
      
      const readings: LiturgyReading[] = [];
      let psalmData = null;
      
      // USCCB structure: .content-body contains readings
      $('.content-body .address, .reading').each((i, elem) => {
        const $section = $(elem);
        
        const title = $section.find('h3, .address-title').first().text().trim() ||
                     `Reading ${i + 1}`;
        const reference = $section.find('.bibleref, .reftxt').first().text().trim();
        
        const textParts: string[] = [];
        $section.find('.body p, .text p').each((_, p) => {
          const text = $(p).text().trim();
          if (text && text.length > 5) textParts.push(text);
        });
        
        const text = textParts.join('\n\n');
        
        if (text.length > 20 && title) {
          if (title.toLowerCase().includes('psalm')) {
            const refrain = $section.find('.refrain, .response').first().text().trim();
            psalmData = { reference, refrain, text };
          }
          
          readings.push({ title, reference, text });
        }
      });
      
      if (readings.length === 0) {
        console.warn(`[LiturgyScraper EN] No readings found for ${date}`);
        return null;
      }
      
      console.log(`[LiturgyScraper EN] ✓ ${readings.length} readings`);
      
      return {
        date,
        liturgicalDay,
        liturgicalColor: 'green',
        readings,
        psalm: psalmData || undefined
      };
      
    } catch (error: any) {
      console.error('[LiturgyScraper EN] Error:', error.message);
      return null;
    }
  }
  
  private getTodayISO(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  getNextSunday(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : (7 - dayOfWeek);
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toISOString().split('T')[0];
  }
}

export const liturgyScraper = new LiturgyScraper();
