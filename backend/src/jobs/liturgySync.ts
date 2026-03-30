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
          where: { date: new Date(dateStr) } 
        });
        
        if (existing) {
          console.log(`[LiturgySyncJob] ⏭️  ${dateStr} already synced`);
          skipCount++;
          continue;
        }
        
        // Fetch bilingual data
        const data = await liturgyScraper.fetchBilingualLiturgy(dateStr);
        
        if (!data.fr && !data.en) {
          console.warn(`[LiturgySyncJob] ⚠️  No liturgy data for ${dateStr}`);
          continue;
        }
        
        // Store in DB
        const liturgy = liturgyRepository.create({
          date: new Date(dateStr),
          liturgicalDay: data.fr?.liturgicalDay || data.en?.liturgicalDay || '',
          liturgicalColor: data.fr?.liturgicalColor || data.en?.liturgicalColor || 'vert',
          readingsFr: data.fr?.readings || [],
          readingsEn: data.en?.readings || [],
          psalmFr: data.fr?.psalm,
          psalmEn: data.en?.psalm
        });
        
        await liturgyRepository.save(liturgy);
        
        console.log(`[LiturgySyncJob] ✓ Synced ${dateStr} - ${liturgy.liturgicalDay}`);
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
