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
    state: string;
    zip: string;
  };
  lat?: number;
  lon?: number;
  website?: string;
  phone?: string;
  denomination?: string;
  religion?: string;
  source: 'IRS' | 'OSM' | 'hybrid';
  matchConfidence?: number;
}

async function importChurches(filePath: string) {
  console.log('🚀 Starting NYC Churches Import...\n');
  
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
  
  console.log('📥 Importing churches...\n');
  
  for (const church of churches) {
    try {
      // Skip if no coordinates (can't display on map)
      if (!church.lat || !church.lon) {
        skipped++;
        continue;
      }
      
      // Check if church already exists (by name + city)
      const existing = await churchRepository.findOne({
        where: {
          name: church.name,
          address: {
            city: church.address.city,
          } as any,
        },
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create new church entity
      const newChurch = churchRepository.create({
        name: church.name,
        description: church.denomination ? `${church.denomination} church` : undefined,
        address: {
          street: church.address.street,
          postalCode: church.address.zip,
          city: church.address.city,
          district: undefined,
        },
        latitude: church.lat,
        longitude: church.lon,
        location: {
          type: 'Point',
          coordinates: [church.lon, church.lat],
        },
        contact: {
          phone: church.phone,
          website: church.website,
        },
        massSchedules: [],
        rites: [],
        languages: [],
        accessibility: {
          wheelchairAccessible: false,
          hearingLoop: false,
          parking: false,
        },
        photos: [],
        dataSources: [
          {
            name: church.source,
            lastScraped: new Date(),
            reliability: church.matchConfidence || (church.source === 'hybrid' ? 80 : church.source === 'OSM' ? 70 : 60),
            metadata: {
              religion: church.religion,
              denomination: church.denomination,
            },
          },
        ],
        reliabilityScore: church.matchConfidence || (church.source === 'hybrid' ? 80 : church.source === 'OSM' ? 70 : 60),
        isActive: true,
      });
      
      await churchRepository.save(newChurch);
      imported++;
      
      if (imported % 100 === 0) {
        console.log(`   ✓ Imported ${imported} churches...`);
      }
    } catch (error) {
      errors++;
      console.error(`   ✗ Error importing "${church.name}":`, error);
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped} (no coordinates or duplicates)`);
  console.log(`   ❌ Errors: ${errors}\n`);
  
  await AppDataSource.destroy();
  console.log('✅ Database connection closed\n');
}

// Run import
const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ Usage: ts-node import-churches.ts <path-to-churches.json>');
  process.exit(1);
}

importChurches(filePath).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
