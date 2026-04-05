#!/usr/bin/env node
/**
 * 📤 Export Existing Churches for ML Enrichment
 * 
 * Exports churches from GodsPlan DB in format ready for ML extractor
 * 
 * Usage:
 *   npx tsx scripts/0-export-churches-for-enrichment.ts --output data/churches_to_enrich.json
 *   npx tsx scripts/0-export-churches-for-enrichment.ts --city Paris
 *   npx tsx scripts/0-export-churches-for-enrichment.ts --region "Île-de-France"
 */

import { AppDataSource, initializeDatabase } from '../src/config/database';
import { Church } from '../src/models/Church';
import fs from 'fs';
import path from 'path';

interface ExportOptions {
  city?: string;
  region?: string;
  department?: string;
  limit?: number;
  onlyWithoutContact?: boolean;
}

async function exportChurches(options: ExportOptions, outputPath: string) {
  console.log('=' .repeat(70));
  console.log('📤 Export Churches for Enrichment');
  console.log('=' .repeat(70));
  console.log();
  
  await initializeDatabase();
  
  const churchRepo = AppDataSource.getRepository(Church);
  
  // Build query
  const query = churchRepo.createQueryBuilder('church');
  
  if (options.city) {
    query.andWhere("church.address->>'city' ILIKE :city", { city: `%${options.city}%` });
  }
  
  if (options.department) {
    query.andWhere("church.address->>'postalCode' LIKE :dept", { dept: `${options.department}%` });
  }
  
  if (options.onlyWithoutContact) {
    query.andWhere(
      "(church.contact->>'phone' IS NULL OR church.contact->>'email' IS NULL)"
    );
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  const churches = await query.getMany();
  
  console.log(`📊 Found ${churches.length} churches`);
  console.log();
  
  // Transform to ML extractor input format
  const exportData = churches.map(church => ({
    name: church.name,
    city: church.address.city,
    street: church.address.street,
    postal_code: church.address.postalCode,
    latitude: Number(church.latitude),
    longitude: Number(church.longitude),
    
    // Existing data (for comparison/merge)
    existing_phone: church.contact?.phone,
    existing_email: church.contact?.email,
    existing_website: church.contact?.website,
    
    // For ML extractor (will try to find website if missing)
    website: church.contact?.website || null,
    
    // Metadata
    db_id: church.id,
    last_verified: church.lastVerified,
  }));
  
  // Save to file
  const fullPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(exportData, null, 2), 'utf-8');
  
  console.log(`💾 Exported to: ${fullPath}`);
  console.log();
  
  // Stats
  const withWebsite = exportData.filter(c => c.website).length;
  const withPhone = exportData.filter(c => c.existing_phone).length;
  const withEmail = exportData.filter(c => c.existing_email).length;
  
  console.log('📊 Export Summary:');
  console.log(`  Total churches: ${exportData.length}`);
  console.log(`  With website: ${withWebsite} (${(withWebsite / exportData.length * 100).toFixed(1)}%)`);
  console.log(`  With phone: ${withPhone} (${(withPhone / exportData.length * 100).toFixed(1)}%)`);
  console.log(`  With email: ${withEmail} (${(withEmail / exportData.length * 100).toFixed(1)}%)`);
  console.log();
  
  const needsEnrichment = exportData.length - Math.max(withPhone, withEmail);
  console.log(`  🎯 Need enrichment: ${needsEnrichment}`);
  console.log();
  
  await AppDataSource.destroy();
  
  return exportData;
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(`
Usage:
  npx tsx scripts/0-export-churches-for-enrichment.ts --output <file> [options]

Options:
  --output <path>          Output JSON file path (required)
  --city <name>            Filter by city
  --department <code>      Filter by postal code prefix (e.g., 75 for Paris)
  --limit <n>              Limit number of churches
  --only-without-contact   Only export churches missing phone or email

Examples:
  # Export all Paris churches
  npx tsx scripts/0-export-churches-for-enrichment.ts \\
    --output data/paris_churches.json \\
    --department 75

  # Export Île-de-France churches needing enrichment
  npx tsx scripts/0-export-churches-for-enrichment.ts \\
    --output data/idf_to_enrich.json \\
    --department 75,92,93,94,91,78,95,77 \\
    --only-without-contact

  # Export first 50 churches for testing
  npx tsx scripts/0-export-churches-for-enrichment.ts \\
    --output data/test_batch.json \\
    --limit 50
  `);
  process.exit(0);
}

const options: ExportOptions = {};
let outputPath = '';

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--output':
      outputPath = args[++i];
      break;
    case '--city':
      options.city = args[++i];
      break;
    case '--department':
      options.department = args[++i];
      break;
    case '--limit':
      options.limit = parseInt(args[++i]);
      break;
    case '--only-without-contact':
      options.onlyWithoutContact = true;
      break;
  }
}

if (!outputPath) {
  console.error('❌ --output is required');
  process.exit(1);
}

exportChurches(options, outputPath)
  .then(() => {
    console.log('✅ Export completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Export failed:', error);
    process.exit(1);
  });
