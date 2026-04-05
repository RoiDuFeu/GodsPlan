#!/usr/bin/env node
/**
 * 🔄 Import ML-Enriched Churches to Database
 * 
 * Imports churches enriched by ml-extractor.py into GodsPlan Postgres DB
 * 
 * Usage:
 *   npx tsx scripts/4-import-ml-enriched.ts data/enriched.json
 *   npx tsx scripts/4-import-ml-enriched.ts data/enriched.json --dry-run
 */

import { AppDataSource, initializeDatabase } from '../src/config/database';
import { Church, ChurchRite } from '../src/models/Church';
import fs from 'fs';
import path from 'path';

// Helper: Detect event type from description
function detectEventType(description: string): string {
  const lower = description.toLowerCase();
  
  if (lower.includes('concert')) return 'concert';
  if (lower.includes('pèlerinage') || lower.includes('pelerin')) return 'pilgrimage';
  if (lower.includes('procession')) return 'procession';
  if (lower.includes('conférence') || lower.includes('conference')) return 'conference';
  if (lower.includes('retraite')) return 'retreat';
  if (lower.includes('adoration')) return 'adoration';
  if (lower.includes('veillée') || lower.includes('veillee')) return 'vigil';
  if (lower.includes('festival') || lower.includes('fête')) return 'festival';
  
  return 'other';
}

interface MLEnrichedChurch {
  name: string;
  source_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  priest_name?: string;
  mass_times: Array<{
    day?: string;
    time: string;
    context: string;
  }>;
  confession_times: string[];
  upcoming_events: Array<{
    date?: string;
    description: string;
  }>;
  extraction_confidence: number;
  extracted_at: string;
  
  // Additional data from messesinfo or other sources
  city?: string;
  latitude?: number;
  longitude?: number;
  postal_code?: string;
  street?: string;
}

// Map French day names to day numbers (0 = Sunday)
const DAY_MAP: Record<string, number> = {
  'Dimanche': 0,
  'Lundi': 1,
  'Mardi': 2,
  'Mercredi': 3,
  'Jeudi': 4,
  'Vendredi': 5,
  'Samedi': 6,
};

async function importEnrichedChurches(filePath: string, dryRun: boolean = false) {
  console.log('=' .repeat(70));
  console.log('🔄 ML-Enriched Churches Import');
  console.log('=' .repeat(70));
  console.log();
  
  // Read input file
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(fullPath, 'utf-8');
  const enrichedChurches: MLEnrichedChurch[] = JSON.parse(rawData);
  
  console.log(`📂 Loaded ${enrichedChurches.length} churches from ${filePath}`);
  console.log();
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No database changes will be made');
    console.log();
  } else {
    // Initialize database
    await initializeDatabase();
  }
  
  const churchRepo = AppDataSource.getRepository(Church);
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const enriched of enrichedChurches) {
    try {
      // Skip low-confidence extractions
      if (enriched.extraction_confidence < 0.4) {
        console.log(`⏭️  Skipping "${enriched.name}" (confidence: ${(enriched.extraction_confidence * 100).toFixed(0)}%)`);
        skipped++;
        continue;
      }
      
      // Required fields validation (city OR postal_code, coordinates optional)
      if (!enriched.city && !enriched.postal_code) {
        console.log(`⏭️  Skipping "${enriched.name}" (missing city and postal_code)`);
        skipped++;
        continue;
      }
      
      if (dryRun) {
        console.log(`✅ [DRY RUN] Would import: ${enriched.name} (${enriched.city})`);
        console.log(`   Confidence: ${(enriched.extraction_confidence * 100).toFixed(0)}%`);
        console.log(`   Contact: ${enriched.phone || 'N/A'} | ${enriched.email || 'N/A'}`);
        console.log(`   Mass times: ${enriched.mass_times.length}`);
        console.log();
        created++;
        continue;
      }
      
      // Find existing church by name + city
      let church = await churchRepo.findOne({
        where: {
          name: enriched.name,
          address: { city: enriched.city } as any,
        },
      });
      
      const isNew = !church;
      
      if (!church) {
        church = new Church();
      }
      
      // Update basic info
      church.name = enriched.name;
      
      // Address
      church.address = {
        street: enriched.street || enriched.address || '',
        postalCode: enriched.postal_code || '',
        city: enriched.city,
      };
      
      // Coordinates (use existing if not provided)
      if (enriched.latitude && enriched.longitude) {
        church.latitude = enriched.latitude;
        church.longitude = enriched.longitude;
        church.location = {
          type: 'Point',
          coordinates: [enriched.longitude, enriched.latitude],
        };
      }
      
      // Contact info (merge with existing)
      church.contact = {
        ...church.contact,
        phone: enriched.phone || church.contact?.phone,
        email: enriched.email || church.contact?.email,
        website: enriched.source_url || church.contact?.website,
      };
      
      // Mass schedule (convert from ML format to TypeORM format)
      if (enriched.mass_times.length > 0) {
        const massSchedules = enriched.mass_times
          .filter(m => m.day) // Only keep entries with day
          .map(massTime => ({
            dayOfWeek: DAY_MAP[massTime.day!] ?? -1,
            time: massTime.time,
            rite: ChurchRite.FRENCH_PAUL_VI, // Default rite
            notes: `Extracted from ${enriched.source_url || 'website'}`,
          }))
          .filter(m => m.dayOfWeek !== -1); // Remove invalid days
        
        // Merge with existing schedule (deduplicate)
        const existingSchedules = church.massSchedules || [];
        const existingKeys = new Set(
          existingSchedules.map(m => `${m.dayOfWeek}_${m.time}`)
        );
        
        const newSchedules = massSchedules.filter(
          m => !existingKeys.has(`${m.dayOfWeek}_${m.time}`)
        );
        
        church.massSchedules = [...existingSchedules, ...newSchedules];
      }
      
      // Upcoming events (structured field)
      if (enriched.upcoming_events && enriched.upcoming_events.length > 0) {
        const events = enriched.upcoming_events.map(evt => {
          // Parse date (simplified - enhance as needed)
          const dateStr = evt.date || '';
          const eventDate = new Date(); // Placeholder - needs proper parsing
          
          return {
            title: evt.description?.split(':')[1]?.trim() || evt.description || 'Événement',
            description: evt.description,
            date: eventDate,
            type: detectEventType(evt.description || ''),
            metadata: { extracted_from: enriched.source_url },
          };
        });
        
        // Merge with existing events (deduplicate by title+date)
        const existingEvents = church.upcomingEvents || [];
        const existingKeys = new Set(
          existingEvents.map(e => `${e.title}_${e.date}`)
        );
        
        const newEvents = events.filter(
          e => !existingKeys.has(`${e.title}_${e.date}`)
        );
        
        church.upcomingEvents = [...existingEvents, ...newEvents];
      }
      
      // Data source tracking
      const mlSource = {
        name: 'ml_extractor_v1',
        url: enriched.source_url,
        lastScraped: new Date(enriched.extracted_at),
        reliability: Math.round(enriched.extraction_confidence * 100),
        metadata: {
          priest_name: enriched.priest_name,
          confession_times: enriched.confession_times,
        },
      };
      
      // Update or add ML source
      const existingSources = church.dataSources || [];
      const existingSourceIdx = existingSources.findIndex(
        s => s.name === 'ml_extractor_v1'
      );
      
      if (existingSourceIdx >= 0) {
        existingSources[existingSourceIdx] = mlSource;
        church.dataSources = existingSources;
      } else {
        church.dataSources = [...existingSources, mlSource];
      }
      
      // Update reliability score (average of all sources)
      const sources = church.dataSources || [];
      church.reliabilityScore = sources.length > 0
        ? Math.round(sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length)
        : 0;
      
      // Mark as verified
      church.lastVerified = new Date();
      
      // Save
      await churchRepo.save(church);
      
      if (isNew) {
        console.log(`✅ Created: ${church.name} (${church.address.city})`);
        console.log(`   Confidence: ${(enriched.extraction_confidence * 100).toFixed(0)}% | Mass times: ${church.massSchedules.length}`);
        created++;
      } else {
        console.log(`🔄 Updated: ${church.name} (${church.address.city})`);
        console.log(`   Confidence: ${(enriched.extraction_confidence * 100).toFixed(0)}% | Mass times: ${church.massSchedules.length}`);
        updated++;
      }
      
    } catch (error) {
      console.error(`❌ Error importing "${enriched.name}":`, error);
      errors++;
    }
  }
  
  console.log();
  console.log('=' .repeat(70));
  console.log('📊 Import Summary');
  console.log('=' .repeat(70));
  console.log(`  ✅ Created: ${created}`);
  console.log(`  🔄 Updated: ${updated}`);
  console.log(`  ⏭️  Skipped: ${skipped} (low confidence or missing data)`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log();
  
  const successRate = ((created + updated) / enrichedChurches.length * 100).toFixed(1);
  console.log(`  📈 Success rate: ${successRate}%`);
  console.log();
  
  if (!dryRun) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(`
Usage:
  npx tsx scripts/4-import-ml-enriched.ts <json-file> [--dry-run]

Examples:
  npx tsx scripts/4-import-ml-enriched.ts data/enriched.json
  npx tsx scripts/4-import-ml-enriched.ts data/enriched.json --dry-run

Options:
  --dry-run    Preview import without making changes
  `);
  process.exit(0);
}

const filePath = args[0];
const dryRun = args.includes('--dry-run');

importEnrichedChurches(filePath, dryRun)
  .then(() => {
    console.log('✅ Import completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
