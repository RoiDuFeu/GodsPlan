/**
 * liturgySync.ts
 * 
 * Background job to sync liturgy readings from AELF
 * Runs daily to fetch next 7 days of readings
 */

import { AppDataSource } from '../config/database';
import { Liturgy } from '../models/Liturgy';
import { liturgyScraper } from '../scrapers/LiturgyScraper';

export class LiturgySyncJob {
  /**
   * Sync next N days of liturgy (default 7)
   */
  async syncNext(days: number = 7): Promise<void> {
    console.log(`[LiturgySyncJob] Starting sync for next ${days} days...`);
    
    const liturgyRepository = AppDataSource.getRepository(Liturgy);
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < days; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      try {
        // Check if already in DB
        const existing = await liturgyRepository.findOne({
          where: { date: dateStr as any }
        });
        
        const hasEnglishText = existing?.readings?.every((r: { text: string }) => r.text && r.text.length > 0);
        const hasFrenchText = existing?.readingsFr && existing.readingsFr.length > 0;

        if (existing && hasEnglishText && hasFrenchText) {
          console.log(`[LiturgySyncJob] ⏭️  ${dateStr} already synced (EN+FR)`);
          skipCount++;
          continue;
        }

        if (existing) {
          const missing = [];
          if (!hasEnglishText) missing.push('EN');
          if (!hasFrenchText) missing.push('FR');
          console.log(`[LiturgySyncJob] 🔄 ${dateStr} missing ${missing.join('+')}, re-fetching...`);
        }
        
        // Fetch from GitHub API
        const data = await liturgyScraper.fetchDailyLiturgy(dateStr);
        
        if (!data) {
          console.warn(`[LiturgySyncJob] ⚠️  No liturgy data for ${dateStr}`);
          continue;
        }
        
        // Store in DB (upsert)
        let liturgy = await liturgyRepository.findOne({ where: { date: dateStr as any } });

        if (liturgy) {
          liturgy.liturgicalDay = data.liturgicalDay || liturgy.liturgicalDay;
          liturgy.liturgicalDayFr = data.liturgicalDayFr || liturgy.liturgicalDayFr;
          liturgy.liturgicalColor = data.liturgicalColor || liturgy.liturgicalColor;
          if (data.readings.length > 0) liturgy.readings = data.readings;
          if (data.psalm) liturgy.psalm = data.psalm;
          if (data.readingsFr && data.readingsFr.length > 0) liturgy.readingsFr = data.readingsFr;
          if (data.psalmFr) liturgy.psalmFr = data.psalmFr;
          liturgy.usccbLink = data.usccbLink || liturgy.usccbLink;
        } else {
          liturgy = liturgyRepository.create({
            date: dateStr as any,
            liturgicalDay: data.liturgicalDay,
            liturgicalDayFr: data.liturgicalDayFr,
            liturgicalColor: data.liturgicalColor,
            readings: data.readings,
            psalm: data.psalm,
            readingsFr: data.readingsFr,
            psalmFr: data.psalmFr,
            usccbLink: data.usccbLink
          });
        }

        await liturgyRepository.save(liturgy);

        const langStatus = [
          data.readings.length > 0 ? 'EN' : null,
          data.readingsFr && data.readingsFr.length > 0 ? 'FR' : null
        ].filter(Boolean).join('+');
        console.log(`[LiturgySyncJob] ✓ Synced ${dateStr} [${langStatus}] - ${liturgy.liturgicalDay || liturgy.liturgicalDayFr}`);
        successCount++;
        
        // Small delay to be polite to AELF API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.error(`[LiturgySyncJob] ❌ Error syncing ${dateStr}:`, error.message);
      }
    }
    
    console.log(`[LiturgySyncJob] Sync complete: ${successCount} new, ${skipCount} skipped`);
  }
  
  /**
   * Schedule daily sync (call this on server startup)
   */
  scheduleDailySync(): void {
    // Run immediately on startup
    this.syncNext(7).catch(err => {
      console.error('[LiturgySyncJob] Initial sync failed:', err);
    });
    
    // Then run every day at 3 AM
    const DAILY_MS = 24 * 60 * 60 * 1000;
    const THREE_AM = 3;
    
    const scheduleNext = () => {
      const now = new Date();
      const next3AM = new Date(now);
      next3AM.setHours(THREE_AM, 0, 0, 0);
      
      // If we passed 3 AM today, schedule for tomorrow
      if (now.getHours() >= THREE_AM) {
        next3AM.setDate(next3AM.getDate() + 1);
      }
      
      const msUntilNext = next3AM.getTime() - now.getTime();
      
      console.log(`[LiturgySyncJob] Next sync scheduled for ${next3AM.toISOString()}`);
      
      setTimeout(() => {
        this.syncNext(7).catch(err => {
          console.error('[LiturgySyncJob] Scheduled sync failed:', err);
        });
        
        // Schedule next day
        scheduleNext();
      }, msUntilNext);
    };
    
    scheduleNext();
  }
}

// Export singleton
export const liturgySyncJob = new LiturgySyncJob();
