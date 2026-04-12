/**
 * reminderJob.ts
 *
 * Background job to send daily mass reminders to users
 * who have enabled reminders for their subscribed churches.
 * Runs every 30 minutes and matches users whose reminderTime
 * falls within the current 30-minute window.
 */

import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { UserPreferences } from '../models/UserPreferences';
import { Church } from '../models/Church';
import { APNsService } from '../services/APNsService';

export class ReminderJob {
  start(): void {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      this.checkAndSend().catch((err) => {
        console.error('[ReminderJob] Error:', err);
      });
    });
    console.log('[ReminderJob] Scheduled (every 30 min)');
  }

  private async checkAndSend(): Promise<void> {
    const apns = APNsService.getInstance();
    if (!apns.isConfigured) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = now.getMinutes();

    // Build the 30-minute window: e.g., 07:00-07:29 or 07:30-07:59
    const windowStart = `${hh}:${mm < 30 ? '00' : '30'}`;
    const nextHalf = mm < 30 ? 29 : 59;
    const windowEnd = `${hh}:${String(nextHalf).padStart(2, '0')}`;

    // Find users with reminders enabled whose reminderTime is in this window
    const prefs = await AppDataSource.getRepository(UserPreferences)
      .createQueryBuilder('p')
      .where('p."reminderEnabled" = true')
      .andWhere('p."reminderTime" >= :start', { start: windowStart })
      .andWhere('p."reminderTime" <= :end', { end: windowEnd })
      .andWhere(`jsonb_array_length(p."subscribedChurches") > 0`)
      .getMany();

    if (prefs.length === 0) return;

    console.log(`[ReminderJob] ${prefs.length} user(s) to notify in window ${windowStart}-${windowEnd}`);

    const churchRepo = AppDataSource.getRepository(Church);
    const dayOfWeek = now.getDay(); // 0 = Sunday

    for (const pref of prefs) {
      // Find next mass today at any subscribed church
      const churchIds = pref.subscribedChurches;
      if (!churchIds.length) continue;

      const churches = await churchRepo
        .createQueryBuilder('c')
        .where('c.id IN (:...ids)', { ids: churchIds })
        .getMany();

      // Collect today's masses across subscribed churches
      const todayMasses: { churchName: string; time: string }[] = [];
      for (const church of churches) {
        for (const schedule of church.massSchedules || []) {
          if (schedule.dayOfWeek === dayOfWeek) {
            todayMasses.push({ churchName: church.name, time: schedule.time });
          }
        }
      }

      if (todayMasses.length === 0) continue;

      // Sort by time and pick the next upcoming one
      todayMasses.sort((a, b) => a.time.localeCompare(b.time));
      const currentTime = `${hh}:${String(mm).padStart(2, '0')}`;
      const nextMass = todayMasses.find((m) => m.time > currentTime) || todayMasses[0];

      const title = 'Rappel de messe';
      const body = `Messe à ${nextMass.time} — ${nextMass.churchName}`;

      await apns.sendToUser(pref.userId, title, body);
    }
  }
}

export const reminderJob = new ReminderJob();
