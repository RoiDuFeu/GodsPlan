#!/usr/bin/env ts-node
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../src/config/database';
import { Church, ChurchRite } from '../src/models/Church';
import { QuebecChurchesScraper } from '../src/scrapers/QuebecChurchesScraper';

interface ImportStats {
  totalScraped: number;
  imported: number;
  skipped: number;
  errors: number;
  duplicates: number;
}

async function importQuebecChurches(options: {
  saveJson?: boolean;
  dryRun?: boolean;
  limit?: number;
}) {
  const { saveJson = true, dryRun = false, limit } = options;

  console.log('🍁 Starting Quebec Churches Import\n');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '💾 LIVE IMPORT'}`);
  console.log(`Save JSON: ${saveJson ? 'Yes' : 'No'}`);
  if (limit) console.log(`Limit: ${limit} churches`);
  console.log('='.repeat(60));
  console.log();

  // Set limit if provided
  if (limit) {
    process.env.SCRAPE_MAX_CHURCHES = limit.toString();
  }

  // Step 1: Scrape churches
  console.log('🔍 Step 1: Scraping churches from OpenChurch API...\n');
  
  const scraper = new QuebecChurchesScraper();
  const churches = await scraper.scrape();

  const stats = scraper.getStats();
  console.log('\n📊 Scraping Results:');
  console.log(`   ✅ Successfully scraped: ${stats.totalChurches}`);
  console.log(`   ❌ Failed: ${stats.failedChurches}`);
  console.log(`   📈 Success rate: ${stats.successRate}%`);
  console.log(`   🏛️  Dioceses covered: ${stats.diocesesCovered.length}`);
  console.log(`      ${stats.diocesesCovered.join(', ')}`);
  console.log();

  // Step 2: Save to JSON
  if (saveJson) {
    const timestamp = new Date().toISOString().split('T')[0];
    const jsonPath = path.join(
      __dirname,
      `../data/quebec-churches-${timestamp}.json`
    );

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(jsonPath, JSON.stringify(churches, null, 2));
    console.log(`💾 Saved to: ${jsonPath}\n`);
  }

  if (dryRun) {
    console.log('🔍 DRY RUN - Skipping database import\n');
    return;
  }

  // Step 3: Import to database
  console.log('📥 Step 2: Importing to PostgreSQL...\n');

  await AppDataSource.initialize();
  console.log('✅ Database connected\n');

  const churchRepository = AppDataSource.getRepository(Church);

  const importStats: ImportStats = {
    totalScraped: churches.length,
    imported: 0,
    skipped: 0,
    errors: 0,
    duplicates: 0,
  };

  for (const church of churches) {
    try {
      // Skip if no coordinates
      if (!church.latitude || !church.longitude) {
        importStats.skipped++;
        continue;
      }

      // Check for duplicates (by name + city)
      const existing = await churchRepository.findOne({
        where: {
          name: church.name,
          address: {
            city: church.address.city,
          } as any,
        },
      });

      if (existing) {
        importStats.duplicates++;
        continue;
      }

      // Create new church entity
      const newChurch = new Church();
      newChurch.name = church.name;
      newChurch.description = church.description;
      newChurch.address = {
        street: church.address.street,
        postalCode: church.address.postalCode,
        city: church.address.city,
        district: church.address.district,
      };
      newChurch.latitude = church.latitude;
      newChurch.longitude = church.longitude;
      newChurch.location = {
        type: 'Point',
        coordinates: [church.longitude, church.latitude],
      };
      newChurch.contact = church.contact;
      newChurch.massSchedules = (church.massSchedules || []).map(schedule => ({
        ...schedule,
        rite: schedule.rite as ChurchRite,
      }));
      newChurch.rites = (church.rites || ['french_paul_vi']).map(
        rite => rite as ChurchRite
      );
      newChurch.languages = church.languages || ['French'];
      newChurch.accessibility = {
        wheelchairAccessible: false,
        hearingLoop: false,
        parking: false,
      };
      newChurch.photos = church.photos || [];
      newChurch.dataSources = [
        {
          name: 'OpenChurch/Wikidata',
          url: church.sourceUrl,
          lastScraped: new Date(),
          reliability: 70,
          metadata: {
            wikidataId: church.sourceUrl?.match(/Q(\d+)/)?.[1],
          },
        },
      ];
      newChurch.reliabilityScore = 70;
      newChurch.isActive = true;

      await churchRepository.save(newChurch);
      importStats.imported++;

      if (importStats.imported % 50 === 0) {
        console.log(`   ✓ Imported ${importStats.imported} churches...`);
      }
    } catch (error: any) {
      importStats.errors++;
      console.error(`   ✗ Error importing "${church.name}":`, error?.message || error);
    }
  }

  await AppDataSource.destroy();

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total scraped:     ${importStats.totalScraped}`);
  console.log(`✅ Imported:        ${importStats.imported}`);
  console.log(`🔄 Duplicates:      ${importStats.duplicates}`);
  console.log(`⏭️  Skipped:         ${importStats.skipped} (no coordinates)`);
  console.log(`❌ Errors:          ${importStats.errors}`);
  console.log('='.repeat(60));
  console.log();

  // Show failed churches if any
  const failedChurches = scraper.getFailedChurches();
  if (failedChurches.length > 0 && failedChurches.length <= 20) {
    console.log('⚠️  Failed to scrape:');
    failedChurches.forEach(({ id, error }) => {
      console.log(`   - Wikidata ID ${id}: ${error}`);
    });
    console.log();
  } else if (failedChurches.length > 20) {
    console.log(`⚠️  ${failedChurches.length} churches failed to scrape (too many to list)\n`);
  }

  console.log('✅ Quebec churches import completed!\n');
}

// CLI
const args = process.argv.slice(2);
const options: {
  saveJson?: boolean;
  dryRun?: boolean;
  limit?: number;
} = {
  saveJson: !args.includes('--no-json'),
  dryRun: args.includes('--dry-run'),
};

const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  options.limit = parseInt(args[limitIndex + 1], 10);
}

if (args.includes('--help')) {
  console.log(`
Usage: ts-node import-quebec-churches.ts [options]

Options:
  --dry-run       Scrape only, don't import to database
  --no-json       Don't save JSON file
  --limit N       Limit to N churches (for testing)
  --help          Show this help message

Examples:
  # Test with 10 churches
  ts-node import-quebec-churches.ts --dry-run --limit 10

  # Full import
  ts-node import-quebec-churches.ts

  # Scrape only, save JSON
  ts-node import-quebec-churches.ts --dry-run
  `);
  process.exit(0);
}

importQuebecChurches(options).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
