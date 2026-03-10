import { initializeDatabase, AppDataSource } from '../config/database';
import { Church, ChurchRite } from '../models/Church';
import { MessesInfoScraper } from './MessesInfoScraper';
import { ScrapedChurch } from './BaseScraper';

/**
 * Calculate reliability score based on data completeness and sources
 */
function calculateReliabilityScore(church: ScrapedChurch, sourceName: string): number {
  let score = 0;
  
  // Base score for having a source
  score += 20;
  
  // Address completeness
  if (church.address.street) score += 10;
  if (church.address.postalCode) score += 10;
  if (church.address.city) score += 10;
  
  // Geographic coordinates
  if (church.latitude && church.longitude) score += 15;
  
  // Contact information
  if (church.contact?.phone) score += 5;
  if (church.contact?.email) score += 5;
  if (church.contact?.website) score += 5;
  
  // Mass schedules
  if (church.massSchedules && church.massSchedules.length > 0) {
    score += Math.min(20, church.massSchedules.length * 2);
  }
  
  return Math.min(100, score);
}

/**
 * Map scraped rite string to ChurchRite enum
 */
function mapRite(riteString: string): ChurchRite {
  const mapping: { [key: string]: ChurchRite } = {
    latin_traditional: ChurchRite.LATIN_TRADITIONAL,
    french_paul_vi: ChurchRite.FRENCH_PAUL_VI,
    byzantine: ChurchRite.BYZANTINE,
    armenian: ChurchRite.ARMENIAN,
    maronite: ChurchRite.MARONITE,
  };
  
  return mapping[riteString] || ChurchRite.OTHER;
}

/**
 * Geocode an address using a free API (Nominatim OpenStreetMap)
 */
async function geocodeAddress(address: ScrapedChurch['address']): Promise<{ lat: number; lng: number } | null> {
  try {
    const axios = require('axios');
    const query = `${address.street}, ${address.postalCode} ${address.city}, France`;
    
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'GodsPlan/1.0 (contact@godsplan.app)',
      },
    });
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}

/**
 * Save or update scraped churches in the database
 */
async function saveChurches(scrapedChurches: ScrapedChurch[], sourceName: string): Promise<void> {
  const churchRepository = AppDataSource.getRepository(Church);
  
  for (const scraped of scrapedChurches) {
    try {
      // Try to find existing church by name and address
      let existingChurch = await churchRepository
        .createQueryBuilder('church')
        .where("church.name = :name", { name: scraped.name })
        .andWhere("church.address->>'postalCode' = :postalCode", {
          postalCode: scraped.address.postalCode,
        })
        .getOne();
      
      // Geocode if needed
      let coords = scraped.latitude && scraped.longitude
        ? { lat: scraped.latitude, lng: scraped.longitude }
        : null;
      
      if (!coords) {
        console.log(`🗺️  Geocoding ${scraped.name}...`);
        coords = await geocodeAddress(scraped.address);
        if (coords) {
          console.log(`✅ Geocoded: ${coords.lat}, ${coords.lng}`);
        }
      }
      
      if (!coords) {
        console.warn(`⚠️  Skipping ${scraped.name}: no coordinates`);
        continue;
      }
      
      const dataSource = {
        name: sourceName,
        url: scraped.sourceUrl,
        lastScraped: new Date(),
        reliability: calculateReliabilityScore(scraped, sourceName),
      };
      
      if (existingChurch) {
        // Update existing church
        existingChurch.address = scraped.address;
        existingChurch.latitude = coords.lat;
        existingChurch.longitude = coords.lng;
        existingChurch.location = `POINT(${coords.lng} ${coords.lat})`;
        existingChurch.contact = scraped.contact;
        existingChurch.massSchedules = scraped.massSchedules || [];
        existingChurch.rites = scraped.rites?.map(mapRite) || [ChurchRite.FRENCH_PAUL_VI];
        existingChurch.languages = scraped.languages || ['French'];
        
        // Update or add data source
        const sourceIndex = existingChurch.dataSources.findIndex(
          (s) => s.name === sourceName
        );
        if (sourceIndex >= 0) {
          existingChurch.dataSources[sourceIndex] = dataSource;
        } else {
          existingChurch.dataSources.push(dataSource);
        }
        
        // Recalculate reliability score
        existingChurch.reliabilityScore = Math.round(
          existingChurch.dataSources.reduce((sum, s) => sum + s.reliability, 0) /
            existingChurch.dataSources.length
        );
        
        existingChurch.lastVerified = new Date();
        
        await churchRepository.save(existingChurch);
        console.log(`📝 Updated: ${scraped.name}`);
      } else {
        // Create new church
        const newChurch = churchRepository.create({
          name: scraped.name,
          description: scraped.description,
          address: scraped.address,
          latitude: coords.lat,
          longitude: coords.lng,
          location: `POINT(${coords.lng} ${coords.lat})`,
          contact: scraped.contact,
          massSchedules: scraped.massSchedules || [],
          rites: scraped.rites?.map(mapRite) || [ChurchRite.FRENCH_PAUL_VI],
          languages: scraped.languages || ['French'],
          photos: scraped.photos || [],
          dataSources: [dataSource],
          reliabilityScore: dataSource.reliability,
          isActive: true,
          lastVerified: new Date(),
        });
        
        await churchRepository.save(newChurch);
        console.log(`✨ Created: ${scraped.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to save ${scraped.name}:`, error);
    }
  }
}

/**
 * Main scraping orchestrator
 */
async function runScrapers(): Promise<void> {
  console.log('🚀 Starting scraping process...');
  
  try {
    await initializeDatabase();
    
    // Run Messes.info scraper
    const messesInfoScraper = new MessesInfoScraper();
    const messesInfoChurches = await messesInfoScraper.scrape();
    await saveChurches(messesInfoChurches, 'messes.info');
    
    // TODO: Add more scrapers here (Diocèse de Paris, etc.)
    
    console.log('✅ Scraping process completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Scraping process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runScrapers();
}

export { runScrapers };
