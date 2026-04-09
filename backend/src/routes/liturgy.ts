import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Liturgy } from '../models/Liturgy';
import { liturgyScraper } from '../scrapers/LiturgyScraper';

const router = Router();

/**
 * Format liturgy response based on requested language.
 * ?lang=fr  → French readings only
 * ?lang=en  → English readings only
 * (default) → Both languages
 */
function formatLiturgyResponse(liturgy: Liturgy, lang?: string) {
  const base = {
    id: liturgy.id,
    date: liturgy.date,
    liturgicalColor: liturgy.liturgicalColor,
    createdAt: liturgy.createdAt,
    updatedAt: liturgy.updatedAt,
  };

  if (lang === 'fr') {
    return {
      ...base,
      liturgicalDay: liturgy.liturgicalDayFr || liturgy.liturgicalDay,
      readings: liturgy.readingsFr || [],
      psalm: liturgy.psalmFr || null,
    };
  }

  if (lang === 'en') {
    return {
      ...base,
      liturgicalDay: liturgy.liturgicalDay,
      readings: liturgy.readings,
      psalm: liturgy.psalm || null,
      usccbLink: liturgy.usccbLink,
    };
  }

  // Default: return both
  return {
    ...base,
    liturgicalDay: liturgy.liturgicalDay,
    liturgicalDayFr: liturgy.liturgicalDayFr,
    readings: liturgy.readings,
    psalm: liturgy.psalm || null,
    readingsFr: liturgy.readingsFr || [],
    psalmFr: liturgy.psalmFr || null,
    usccbLink: liturgy.usccbLink,
  };
}

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

    res.json(formatLiturgyResponse(liturgy, req.query.lang as string));
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

    const targetSunday = dayOfWeek === 0
      ? today.toISOString().split('T')[0]
      : getNextSunday();

    const liturgy = await getOrFetchLiturgy(targetSunday);

    if (!liturgy) {
      return res.status(404).json({ error: 'Sunday liturgy not found' });
    }

    res.json(formatLiturgyResponse(liturgy, req.query.lang as string));
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const liturgy = await getOrFetchLiturgy(date);

    if (!liturgy) {
      return res.status(404).json({ error: 'Liturgy not found for this date' });
    }

    res.json(formatLiturgyResponse(liturgy, req.query.lang as string));
  } catch (error) {
    console.error('[Liturgy API] Error fetching date:', error);
    res.status(500).json({ error: 'Failed to fetch liturgy' });
  }
});

/**
 * POST /liturgy/refresh
 * Manually trigger refresh of liturgy data
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { date, days = 7 } = req.body;

    if (date) {
      await fetchAndStoreLiturgy(date);
      return res.json({ message: `Liturgy refreshed for ${date}` });
    }

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
 * Helper: Get liturgy from DB or fetch if missing/incomplete
 */
async function getOrFetchLiturgy(date: string): Promise<Liturgy | null> {
  const liturgyRepository = AppDataSource.getRepository(Liturgy);

  let liturgy = await liturgyRepository.findOne({ where: { date: date as any } });

  if (!liturgy) {
    console.log(`[Liturgy API] Cache miss for ${date}, fetching...`);
    liturgy = await fetchAndStoreLiturgy(date);
  } else {
    const missingEnglish = liturgy.readings.some(r => !r.text || r.text.length === 0);
    const missingFrench = !liturgy.readingsFr || liturgy.readingsFr.length === 0;

    if (missingEnglish || missingFrench) {
      const missing = [missingEnglish ? 'EN' : null, missingFrench ? 'FR' : null].filter(Boolean).join('+');
      console.log(`[Liturgy API] Re-fetching ${date} (missing ${missing})...`);
      liturgy = await fetchAndStoreLiturgy(date) ?? liturgy;
    }
  }

  return liturgy;
}

/**
 * Helper: Fetch from scraper and store/update in database
 */
async function fetchAndStoreLiturgy(date: string): Promise<Liturgy | null> {
  const liturgyRepository = AppDataSource.getRepository(Liturgy);

  const data = await liturgyScraper.fetchDailyLiturgy(date);

  if (!data) {
    return null;
  }

  let liturgy = await liturgyRepository.findOne({ where: { date: date as any } });

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
      date: date as any,
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
  console.log(`[Liturgy API] ✓ Stored liturgy for ${date} [${langStatus}]`);

  return liturgy;
}

function getNextSunday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : (7 - dayOfWeek);

  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);

  return nextSunday.toISOString().split('T')[0];
}

export default router;
