import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Church } from '../models/Church';

const router = Router();

/**
 * GET /admin/stats
 * Comprehensive admin statistics for dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const queries = {
      overview: `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE "isActive" = true) as active,
          AVG("reliabilityScore")::numeric(10,1) as avg_reliability
        FROM churches
      `,
      
      coverage: `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as with_gps,
          COUNT(*) FILTER (WHERE jsonb_array_length("massSchedules") > 0) as with_schedules,
          COUNT(*) FILTER (WHERE contact->>'phone' IS NOT NULL AND contact->>'phone' != '') as with_phone,
          COUNT(*) FILTER (WHERE contact->>'website' IS NOT NULL AND contact->>'website' != '') as with_website,
          COUNT(*) FILTER (WHERE array_length(photos, 1) > 0) as with_photos
        FROM churches
      `,
      
      averages: `
        SELECT 
          AVG(jsonb_array_length("massSchedules"))::numeric(10,2) as avg_schedules,
          COALESCE(AVG(array_length(photos, 1)), 0)::numeric(10,1) as avg_photos
        FROM churches
      `,
      
      reliabilityDistribution: `
        SELECT
          COUNT(*) FILTER (WHERE "reliabilityScore" >= 90) as excellent,
          COUNT(*) FILTER (WHERE "reliabilityScore" >= 70 AND "reliabilityScore" < 90) as good,
          COUNT(*) FILTER (WHERE "reliabilityScore" >= 50 AND "reliabilityScore" < 70) as fair,
          COUNT(*) FILTER (WHERE "reliabilityScore" < 50) as poor
        FROM churches
      `,
      
      recentlyUpdated: `
        SELECT 
          id,
          name,
          "reliabilityScore",
          "updatedAt"
        FROM churches
        WHERE "updatedAt" > NOW() - INTERVAL '7 days'
        ORDER BY "updatedAt" DESC
        LIMIT 10
      `
    };

    const overview = await AppDataSource.query(queries.overview);
    const coverage = await AppDataSource.query(queries.coverage);
    const averages = await AppDataSource.query(queries.averages);
    const reliabilityDist = await AppDataSource.query(queries.reliabilityDistribution);
    const recentlyUpdated = await AppDataSource.query(queries.recentlyUpdated);

    const total = parseInt(overview[0].total);
    const totalCoverage = parseInt(coverage[0].total);

    const stats = {
      timestamp: new Date().toISOString(),
      total: total,
      active: parseInt(overview[0].active),
      coverage: {
        gps: {
          count: parseInt(coverage[0].with_gps),
          percent: totalCoverage === 0 ? 0 : Math.round((coverage[0].with_gps / totalCoverage) * 100)
        },
        schedules: {
          count: parseInt(coverage[0].with_schedules),
          percent: totalCoverage === 0 ? 0 : Math.round((coverage[0].with_schedules / totalCoverage) * 100)
        },
        phone: {
          count: parseInt(coverage[0].with_phone),
          percent: totalCoverage === 0 ? 0 : Math.round((coverage[0].with_phone / totalCoverage) * 100)
        },
        website: {
          count: parseInt(coverage[0].with_website),
          percent: totalCoverage === 0 ? 0 : Math.round((coverage[0].with_website / totalCoverage) * 100)
        },
        photos: {
          count: parseInt(coverage[0].with_photos),
          percent: totalCoverage === 0 ? 0 : Math.round((coverage[0].with_photos / totalCoverage) * 100)
        }
      },
      avgSchedulesPerChurch: parseFloat(averages[0].avg_schedules),
      avgReliabilityScore: parseFloat(overview[0].avg_reliability),
      reliabilityDistribution: {
        excellent: parseInt(reliabilityDist[0].excellent),
        good: parseInt(reliabilityDist[0].good),
        fair: parseInt(reliabilityDist[0].fair),
        poor: parseInt(reliabilityDist[0].poor)
      },
      recentlyUpdated: recentlyUpdated.map((row: any) => ({
        id: row.id,
        name: row.name,
        reliabilityScore: parseFloat(row.reliabilityScore),
        updatedAt: row.updatedAt
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

/**
 * GET /admin/churches-map
 * Get all churches with coordinates for map display
 */
router.get('/churches-map', async (req: Request, res: Response) => {
  try {
    const churchRepository = AppDataSource.getRepository(Church);
    
    const churches = await churchRepository
      .createQueryBuilder('church')
      .select([
        'church.id',
        'church.name',
        'church.latitude',
        'church.longitude',
        'church.reliabilityScore',
        'church.contact',
        'church.massSchedules'
      ])
      .where('church.isActive = :isActive', { isActive: true })
      .andWhere('church.latitude IS NOT NULL')
      .andWhere('church.longitude IS NOT NULL')
      .getMany();

    res.json({
      data: churches.map(church => ({
        id: church.id,
        name: church.name,
        lat: church.latitude,
        lng: church.longitude,
        score: church.reliabilityScore,
        schedulesCount: church.massSchedules?.length || 0,
        phone: church.contact?.phone || null
      })),
      meta: {
        total: churches.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching churches for map:', error);
    res.status(500).json({ error: 'Failed to fetch churches map data' });
  }
});

/**
 * POST /admin/scrape
 * Trigger manual scraping (placeholder for now)
 */
router.post('/scrape', async (req: Request, res: Response) => {
  try {
    // TODO: Implement actual scraping trigger
    // For now, just return a mock response
    res.json({
      status: 'queued',
      message: 'Scraping job queued successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering scrape:', error);
    res.status(500).json({ error: 'Failed to trigger scraping' });
  }
});

export default router;
