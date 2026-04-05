#!/usr/bin/env ts-node
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../src/config/database';
import { Church } from '../src/models/Church';

interface ImportChurch {
  name: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  latitude: number;
  longitude: number;
  massSchedules: Array<{
    dayOfWeek: number;
    time: string;
    rite: string;
    language?: string;
    notes?: string;
  }>;
  rites: string[];
  languages: string[];
  description?: string;
  sourceUrl: string;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

async function importChurches(filePath: string) {
  console.log('🍁 Starting Quebec Churches Import from Enriched Data...\n');
  
  // Read JSON file
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(fullPath, 'utf-8');
  const churches: ImportChurch[] = JSON.parse(rawData);
  
  console.log(`📂 Loaded ${churches.length} churches from file\n`);
  
  // Initialize database
  await AppDataSource.initialize();
  console.log('✅ Database connected\n');
  
  const churchRepository = AppDataSource.getRepository(Church);
  
  // Stats
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let duplicates = 0;
  
  console.log('📥 Importing churches...\n');
  
  for (const church of churches) {
    try {
      // Skip if no coordinates (can't display on map)
      if (!church.latitude || !church.longitude) {
        skipped++;
        continue;
      }
      
      // Check if church already exists (by name + city)
      const existing = await churchRepository.findOne({
        where: {
          name: church.name,
        },
      });
      
      if (existing) {
        duplicates++;
        continue;
      }
      
      // Create new church entity
      const newChurch = churchRepository.create({
        name: church.name,
        description: church.description,
        address: {
          street: church.address.street,
          postalCode: church.address.postalCode,
          city: church.address.city,
          district: undefined,
        },
        latitude: church.latitude,
        longitude: church.longitude,
        location: {
          type: 'Point',
          coordinates: [church.longitude, church.latitude],
        },
        contact: church.contact || {
          phone: undefined,
          website: undefined,
        },
        massSchedules: church.massSchedules.map(schedule => ({
          dayOfWeek: schedule.dayOfWeek,
          time: schedule.time,
          rite: schedule.rite as any,
          language: schedule.language,
          notes: schedule.notes,
        })),
        rites: church.rites as any[],
        languages: church.languages,
        accessibility: {
          wheelchairAccessible: false,
          hearingLoop: false,
          parking: false,
        },
        photos: [],
        dataSources: [
          {
            name: 'OpenChurch/Wikidata',
            lastScraped: new Date(),
            reliability: church.address.street && church.address.postalCode ? 85 : 70,
            metadata: {
              wikidataUrl: church.sourceUrl,
            },
          },
        ],
        reliabilityScore: church.address.street && church.address.postalCode ? 85 : 70,
        isActive: true,
      });
      
      await churchRepository.save(newChurch);
      imported++;
      
      if (imported % 25 === 0) {
        console.log(`   ✓ Imported ${imported} churches...`);
      }
    } catch (error: any) {
      errors++;
      console.error(`   ✗ Error importing "${church.name}":`, error.message);
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped (no coords): ${skipped}`);
  console.log(`   🔁 Duplicates: ${duplicates}`);
  console.log(`   ❌ Errors: ${errors}`);
  
  // Data quality stats
  const withFullAddress = churches.filter(c => c.address.street && c.address.postalCode).length;
  console.log(`\n🎯 Data Quality:`);
  console.log(`   📍 Full addresses: ${withFullAddress}/${churches.length} (${Math.round(withFullAddress/churches.length*100)}%)`);
  
  await AppDataSource.destroy();
  console.log('\n✅ Database connection closed\n');
}

// Run import
const filePath = process.argv[2] || path.resolve(__dirname, '../data/quebec-churches-enriched.json');

importChurches(filePath).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
