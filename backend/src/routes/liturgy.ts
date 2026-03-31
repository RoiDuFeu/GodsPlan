import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Liturgy } from '../models/Liturgy';
import { liturgyScraper } from '../scrapers/LiturgyScraper';

const router = Router();

/**
 * GET /liturgy/today
 * Get today's liturgy readings
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const liturgy = await getOrFetchLiturgy(today);
    
    if (!liturgy) {
      return res.status(404).json({ error: 'Liturgy not found for today' });
    }
    
    res.json(liturgy);
  } catch (error) {
    console.error('[Liturgy API] Error fetching today:', error);
    res.status(500).json({ error: 'Failed to fetch liturgy' });
  }
});

/**
 * GET /liturgy/sunday
 * Get current or upcoming Sunday's liturgy
 */
router.get('/sunday', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // If today is Sunday, return today's liturgy
    // Otherwise return next Sunday's
    const targetSunday = dayOfWeek === 0 
      ? today.toISOString().split('T')[0]
      : getNextSunday();
    
    const liturgy = await getOrFetchLiturgy(targetSunday);
    
    if (!liturgy) {
      return res.status(404).json({ error: 'Sunday liturgy not found' });
    }
    
    res.json(liturgy);
  } catch (error) {
    console.error('[Liturgy API] Error fetching Sunday:', error);
    res.status(500).json({ error: 'Failed to fetch Sunday liturgy' });
  }
});

/**
 * GET /liturgy/:date
 * Get liturgy for a specific date (YYYY-MM-DD)
 */
router.get('/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const liturgy = await getOrFetchLiturgy(date);
    
    if (!liturgy) {
      return res.status(404).json({ error: 'Liturgy not found for this date' });
    }
    
    res.json(liturgy);
  } catch (error) {
    console.error('[Liturgy API] Error fetching date:', error);
    res.status(500).json({ error: 'Failed to fetch liturgy' });
  }
});

/**
 * POST /liturgy/refresh
 * Manually trigger refresh of liturgy data (admin only in production)
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { date, days = 7 } = req.body;
    
    if (date) {
      // Refresh specific date
      await fetchAndStoreLiturgy(date);
      return res.json({ message: `Liturgy refreshed for ${date}` });
    }
    
    // Refresh next N days
    const refreshedDates = [];
    for (let i = 0; i < days; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      await fetchAndStoreLiturgy(dateStr);
      refreshedDates.push(dateStr);
    }
    
    res.json({ 
      message: `Refreshed ${refreshedDates.length} days`, 
      dates: refreshedDates 
    });
  } catch (error) {
    console.error('[Liturgy API] Error refreshing:', error);
    res.status(500).json({ error: 'Failed to refresh liturgy' });
  }
});

/**
 * Helper: Get liturgy from DB or fetch from AELF if missing
 */
async function getOrFetchLiturgy(date: string): Promise<Liturgy | null> {
  const liturgyRepository = AppDataSource.getRepository(Liturgy);
  
  // Try to get from database
  let liturgy = await liturgyRepository.findOne({ where: { date: date as any } });

  if (!liturgy) {
    // Not in DB, fetch from AELF and store
    console.log(`[Liturgy API] Cache miss for ${date}, fetching from AELF...`);
    liturgy = await fetchAndStoreLiturgy(date);
  }
  
  return liturgy;
}

/**
 * Helper: Fetch from GitHub API and store/update in database
 */
async function fetchAndStoreLiturgy(date: string): Promise<Liturgy | null> {
  const liturgyRepository = AppDataSource.getRepository(Liturgy);
  
  const data = await liturgyScraper.fetchDailyLiturgy(date);
  
  if (!data) {
    return null;
  }
  
  // Check if already exists
  let liturgy = await liturgyRepository.findOne({ where: { date: date as any } });

  if (liturgy) {
    // Update existing
    liturgy.liturgicalDay = data.liturgicalDay;
    liturgy.liturgicalColor = data.liturgicalColor;
    liturgy.readings = data.readings;
    liturgy.psalm = data.psalm;
    liturgy.usccbLink = data.usccbLink;
  } else {
    // Create new
    liturgy = liturgyRepository.create({
      date: date as any,
      liturgicalDay: data.liturgicalDay,
      liturgicalColor: data.liturgicalColor,
      readings: data.readings,
      psalm: data.psalm,
      usccbLink: data.usccbLink
    });
  }
  
  await liturgyRepository.save(liturgy);
  
  console.log(`[Liturgy API] ✓ Stored liturgy for ${date} - ${data.liturgicalDay}`);
  
  return liturgy;
}

/**
 * Helper: Get next Sunday's date
 */
function getNextSunday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : (7 - dayOfWeek);
  
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  
  return nextSunday.toISOString().split('T')[0];
}

export default router;
