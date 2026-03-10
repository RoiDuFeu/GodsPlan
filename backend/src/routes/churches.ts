import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Church } from '../models/Church';

const router = Router();

/**
 * GET /churches
 * List all churches with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { city, rite, limit = 50, offset = 0 } = req.query;
    
    const churchRepository = AppDataSource.getRepository(Church);
    const queryBuilder = churchRepository.createQueryBuilder('church');
    
    if (city) {
      queryBuilder.andWhere("church.address->>'city' ILIKE :city", {
        city: `%${city}%`,
      });
    }
    
    if (rite) {
      queryBuilder.andWhere(':rite = ANY(church.rites)', { rite });
    }
    
    queryBuilder
      .select([
        'church.id',
        'church.name',
        'church.description',
        'church.address',
        'church.latitude',
        'church.longitude',
        'church.contact',
        'church.massSchedules',
        'church.rites',
        'church.languages',
        'church.accessibility',
        'church.photos',
        'church.dataSources',
        'church.reliabilityScore',
        'church.isActive',
        'church.createdAt',
        'church.updatedAt',
        'church.lastVerified',
      ])
      .where('church.isActive = :isActive', { isActive: true })
      .orderBy('church.name', 'ASC')
      .skip(Number(offset))
      .take(Number(limit));
    
    const [churches, total] = await queryBuilder.getManyAndCount();
    
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
 * GET /churches/nearby
 * Find churches near a location (latitude, longitude, radius in km)
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
    
    const churchRepository = AppDataSource.getRepository(Church);
    
    // PostGIS query to find churches within radius
    const churches = await churchRepository
      .createQueryBuilder('church')
      .select([
        'church.id',
        'church.name',
        'church.description',
        'church.address',
        'church.latitude',
        'church.longitude',
        'church.contact',
        'church.massSchedules',
        'church.rites',
        'church.languages',
        'church.accessibility',
        'church.photos',
        'church.dataSources',
        'church.reliabilityScore',
        'church.isActive',
        'church.createdAt',
        'church.updatedAt',
        'church.lastVerified',
      ])
      .where('church.isActive = :isActive', { isActive: true })
      .andWhere(
        `ST_DWithin(
          church.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        {
          lat: latitude,
          lng: longitude,
          radius: radiusKm * 1000, // Convert km to meters
        }
      )
      .orderBy(
        `ST_Distance(
          church.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'ASC'
      )
      .setParameters({ lat: latitude, lng: longitude })
      .take(Number(limit))
      .getMany();
    
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
 * GET /churches/:id
 * Get a specific church by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const churchRepository = AppDataSource.getRepository(Church);
    const church = await churchRepository.findOne({ where: { id } });
    
    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }
    
    res.json(church);
  } catch (error) {
    console.error('Error fetching church:', error);
    res.status(500).json({ error: 'Failed to fetch church' });
  }
});

export default router;
