import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';

const router = Router();

/**
 * GET /churches-simple
 * List all churches using raw SQL (bypasses TypeORM geography issue)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, limit = 500, offset = 0 } = req.query;
    
    let whereClause = '"isActive" = true';
    const params: any[] = [];
    
    if (city) {
      params.push(`%${city}%`);
      whereClause += ` AND address->>'city' ILIKE $${params.length}`;
    }
    
    const query = `
      SELECT 
        id, name, description, address, latitude, longitude,
        contact, "massSchedules", "officeSchedules", "upcomingEvents",
        rites, languages, accessibility,
        photos, "dataSources", "reliabilityScore", "isActive",
        "createdAt", "updatedAt", "lastVerified"
      FROM churches
      WHERE ${whereClause}
      ORDER BY name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(Number(limit), Number(offset));
    
    const churches = await AppDataSource.query(query, params);
    
    const countQuery = `SELECT COUNT(*) as total FROM churches WHERE ${whereClause}`;
    const countResult = await AppDataSource.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult[0].total);
    
    res.json({
      data: churches,
      meta: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('Error fetching churches:', error);
    res.status(500).json({ error: 'Failed to fetch churches' });
  }
});

/**
 * GET /churches-simple/nearby
 * Find churches near a location using raw SQL
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 5, limit = 20 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required parameters: lat, lng',
      });
    }
    
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusKm = parseFloat(radius as string);
    
    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
      return res.status(400).json({
        error: 'Invalid numeric parameters',
      });
    }
    
    const query = `
      SELECT 
        id, name, description, address, latitude, longitude,
        contact, "massSchedules", "officeSchedules", "upcomingEvents",
        rites, languages, accessibility,
        photos, "dataSources", "reliabilityScore", "isActive",
        "createdAt", "updatedAt", "lastVerified",
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as distance_km
      FROM churches
      WHERE "isActive" = true
        AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY distance_km ASC
      LIMIT $4
    `;
    
    const churches = await AppDataSource.query(query, [
      longitude,
      latitude,
      radiusKm * 1000,
      Number(limit),
    ]);
    
    res.json({
      data: churches,
      meta: {
        center: { latitude, longitude },
        radius: radiusKm,
        count: churches.length,
      },
    });
  } catch (error) {
    console.error('Error fetching nearby churches:', error);
    res.status(500).json({ error: 'Failed to fetch nearby churches' });
  }
});

/**
 * GET /churches-simple/:id
 * Get a specific church by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id, name, description, address, latitude, longitude,
        contact, "massSchedules", "officeSchedules", "upcomingEvents",
        rites, languages, accessibility,
        photos, "dataSources", "reliabilityScore", "isActive",
        "createdAt", "updatedAt", "lastVerified"
      FROM churches
      WHERE id = $1
    `;
    
    const churches = await AppDataSource.query(query, [id]);
    
    if (churches.length === 0) {
      return res.status(404).json({ error: 'Church not found' });
    }
    
    res.json(churches[0]);
  } catch (error) {
    console.error('Error fetching church:', error);
    res.status(500).json({ error: 'Failed to fetch church' });
  }
});

export default router;
