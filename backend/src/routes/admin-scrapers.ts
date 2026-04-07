import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ScraperRun } from '../models/ScraperRun';
import { scraperRunner } from '../services/ScraperRunner';

const router = Router();

const IDF_DEPARTMENTS = ['75', '77', '78', '91', '92', '93', '94', '95'];

/**
 * GET /admin/scrapers
 * List all registered scrapers with their current status and last run info
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const registry = scraperRunner.getRegistry();
    const runRepo = AppDataSource.getRepository(ScraperRun);

    const scrapers = await Promise.all(
      registry.map(async (entry) => {
        const lastRun = await runRepo.findOne({
          where: { scraperName: entry.name },
          order: { startedAt: 'DESC' },
        });

        // Get success rate from last 10 runs
        const recentRuns = await runRepo.find({
          where: { scraperName: entry.name },
          order: { startedAt: 'DESC' },
          take: 10,
          select: ['status'],
        });

        const successCount = recentRuns.filter((r) => r.status === 'success').length;
        const successRate = recentRuns.length > 0 ? Math.round((successCount / recentRuns.length) * 100) : null;

        return {
          ...entry,
          isRunning: scraperRunner.isRunning(entry.name),
          runningId: scraperRunner.getRunningId(entry.name),
          lastRun: lastRun
            ? {
                id: lastRun.id,
                status: lastRun.status,
                startedAt: lastRun.startedAt,
                completedAt: lastRun.completedAt,
                durationMs: lastRun.durationMs,
                churchesFound: lastRun.churchesFound,
                errorCount: lastRun.errorCount,
                departments: lastRun.departments,
              }
            : null,
          successRate,
        };
      })
    );

    res.json({ scrapers, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to list scrapers:', error);
    res.status(500).json({ error: 'Failed to list scrapers' });
  }
});

/**
 * GET /admin/scrapers/runs/recent
 * Get the most recent runs across all scrapers
 */
router.get('/runs/recent', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const runRepo = AppDataSource.getRepository(ScraperRun);

    const runs = await runRepo.find({
      order: { startedAt: 'DESC' },
      take: limit,
      select: [
        'id', 'scraperName', 'status', 'departments',
        'churchesFound', 'churchesSaved', 'errorCount',
        'startedAt', 'completedAt', 'durationMs',
      ],
    });

    res.json({ runs });
  } catch (error) {
    console.error('Failed to fetch recent runs:', error);
    res.status(500).json({ error: 'Failed to fetch recent runs' });
  }
});

/**
 * GET /admin/scrapers/runs/:id
 * Get full details of a specific run including errors
 */
router.get('/runs/:id', async (req: Request, res: Response) => {
  try {
    const runRepo = AppDataSource.getRepository(ScraperRun);
    const run = await runRepo.findOne({ where: { id: req.params.id } });

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({ run });
  } catch (error) {
    console.error('Failed to fetch run:', error);
    res.status(500).json({ error: 'Failed to fetch run' });
  }
});

/**
 * GET /admin/scrapers/runs/:id/logs
 * SSE endpoint for live scraper logs. Sends buffered logs then streams new ones.
 */
router.get('/runs/:id/logs', async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if run exists
  const runRepo = AppDataSource.getRepository(ScraperRun);
  const run = await runRepo.findOne({ where: { id }, select: ['id', 'status', 'scraperName'] });

  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send existing buffered logs
  const existingLogs = scraperRunner.getLogs(id);
  for (const entry of existingLogs) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  // If the run is already finished and there's no active buffer, send done
  if (!scraperRunner.isRunning(run.scraperName) && existingLogs.length === 0) {
    res.write(`event: done\ndata: ${JSON.stringify({ status: run.status })}\n\n`);
    res.end();
    return;
  }

  // Subscribe to live logs
  const unsubscribe = scraperRunner.subscribe(id, (entry) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  });

  // When the run finishes, the scraper won't be running anymore.
  // Poll briefly to detect completion and send done event.
  const checkDone = setInterval(() => {
    if (!scraperRunner.isRunning(run.scraperName)) {
      res.write(`event: done\ndata: ${JSON.stringify({ status: 'completed' })}\n\n`);
      clearInterval(checkDone);
      unsubscribe();
      res.end();
    }
  }, 2000);

  // Client disconnect
  req.on('close', () => {
    clearInterval(checkDone);
    unsubscribe();
  });
});

/**
 * GET /admin/scrapers/:name/history
 * Paginated run history for a specific scraper
 */
router.get('/:name/history', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    const runRepo = AppDataSource.getRepository(ScraperRun);

    const [runs, total] = await runRepo.findAndCount({
      where: { scraperName: name },
      order: { startedAt: 'DESC' },
      take: limit,
      skip: offset,
      select: [
        'id', 'scraperName', 'status', 'departments',
        'churchesFound', 'churchesSaved', 'errorCount',
        'startedAt', 'completedAt', 'durationMs',
      ],
    });

    res.json({
      runs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch scraper history:', error);
    res.status(500).json({ error: 'Failed to fetch scraper history' });
  }
});

/**
 * POST /admin/scrapers/:name/cancel
 * Cancel a running scraper. The scraper will stop at the next church boundary.
 */
router.post('/:name/cancel', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    if (!scraperRunner.isRunning(name)) {
      return res.status(404).json({ error: `Scraper "${name}" is not currently running` });
    }

    const cancelled = await scraperRunner.cancel(name);
    if (cancelled) {
      res.json({ message: `Cancellation requested for "${name}"` });
    } else {
      res.status(500).json({ error: 'Failed to cancel scraper' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel scraper';
    console.error('Failed to cancel scraper:', error);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/scrapers/runs/:id/results
 * Get per-church results for a specific run (available for 10 minutes after completion)
 */
router.get('/runs/:id/results', async (req: Request, res: Response) => {
  try {
    const results = scraperRunner.getResults(req.params.id);

    if (!results) {
      // Try to return summary from metadata if detailed results expired
      const runRepo = AppDataSource.getRepository(ScraperRun);
      const run = await runRepo.findOne({ where: { id: req.params.id }, select: ['id', 'metadata'] });

      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }

      return res.json({
        results: null,
        summary: (run.metadata as any)?.resultsSummary || null,
        expired: true,
      });
    }

    res.json({ results, expired: false });
  } catch (error) {
    console.error('Failed to fetch run results:', error);
    res.status(500).json({ error: 'Failed to fetch run results' });
  }
});

/**
 * POST /admin/scrapers/:name/trigger
 * Trigger a scraper run. Returns 202 with run ID immediately.
 */
router.post('/:name/trigger', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { departments = [] } = req.body || {};

    if (scraperRunner.isRunning(name)) {
      return res.status(409).json({
        error: `Scraper "${name}" is already running`,
        runId: scraperRunner.getRunningId(name),
      });
    }

    const run = await scraperRunner.trigger(name, departments);

    res.status(202).json({
      message: `Scraper "${name}" started`,
      runId: run.id,
      status: run.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to trigger scraper';
    console.error('Failed to trigger scraper:', error);
    res.status(400).json({ error: message });
  }
});

/**
 * GET /admin/scrapers/coverage/idf
 * Ile-de-France department coverage statistics
 */
router.get('/coverage/idf', async (_req: Request, res: Response) => {
  try {
    const departmentNames: Record<string, string> = {
      '75': 'Paris',
      '77': 'Seine-et-Marne',
      '78': 'Yvelines',
      '91': 'Essonne',
      '92': 'Hauts-de-Seine',
      '93': 'Seine-Saint-Denis',
      '94': 'Val-de-Marne',
      '95': "Val-d'Oise",
    };

    const coverage = await Promise.all(
      IDF_DEPARTMENTS.map(async (dept) => {
        const result = await AppDataSource.query(
          `SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE jsonb_array_length("massSchedules") > 0) as with_schedules,
            COUNT(*) FILTER (WHERE contact->>'phone' IS NOT NULL AND contact->>'phone' != '') as with_phone,
            MAX("updatedAt") as last_updated
          FROM churches
          WHERE "isActive" = true
          AND SUBSTRING(address->>'postalCode', 1, 2) = $1`,
          [dept]
        );

        const row = result[0] || {};

        // Get last scraper run that targeted this department
        const runRepo = AppDataSource.getRepository(ScraperRun);
        const lastRun = await runRepo
          .createQueryBuilder('run')
          .where(':dept = ANY(run.departments)', { dept })
          .andWhere('run.status IN (:...statuses)', { statuses: ['success', 'failed'] })
          .orderBy('run.startedAt', 'DESC')
          .getOne();

        return {
          code: dept,
          name: departmentNames[dept],
          totalChurches: parseInt(row.total) || 0,
          withSchedules: parseInt(row.with_schedules) || 0,
          withPhone: parseInt(row.with_phone) || 0,
          lastUpdated: row.last_updated || null,
          lastScrapedAt: lastRun?.startedAt || null,
          lastScrapeStatus: lastRun?.status || null,
        };
      })
    );

    const totals = coverage.reduce(
      (acc, dept) => ({
        totalChurches: acc.totalChurches + dept.totalChurches,
        withSchedules: acc.withSchedules + dept.withSchedules,
        withPhone: acc.withPhone + dept.withPhone,
      }),
      { totalChurches: 0, withSchedules: 0, withPhone: 0 }
    );

    // Include running scraper info for live updates
    const isScraperRunning = scraperRunner.isRunning('messes.info');
    const runningId = scraperRunner.getRunningId('messes.info');

    res.json({ departments: coverage, totals, isScraperRunning, runningId, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to fetch IDF coverage:', error);
    res.status(500).json({ error: 'Failed to fetch IDF coverage' });
  }
});

export default router;
