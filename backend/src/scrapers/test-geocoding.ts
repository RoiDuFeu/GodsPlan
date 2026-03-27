/**
 * Test script for geocoding functionality
 * Tests the geocoder with sample churches from the database
 */

import { initializeDatabase, AppDataSource } from '../config/database';
import { Church } from '../models/Church';
import { getGeocoder } from './utils/geocoder';

async function testGeocoding() {
  console.log('🧪 Testing geocoding functionality...\n');

  // Initialize database
  await initializeDatabase();

  const churchRepository = AppDataSource.getRepository(Church);
  const geocoder = getGeocoder();

  // Find churches without coordinates
  const churchesWithoutCoords = await churchRepository
    .createQueryBuilder('church')
    .where('church.latitude IS NULL OR church.longitude IS NULL')
    .orWhere('church.latitude = 0 OR church.longitude = 0')
    .take(10)
    .getMany();

  console.log(`📍 Found ${churchesWithoutCoords.length} churches without coordinates\n`);

  if (churchesWithoutCoords.length === 0) {
    console.log('✅ All churches already have coordinates!');
    
    // Test with a few random churches for cache testing
    console.log('\n🔄 Testing with existing churches for cache validation...\n');
    const existingChurches = await churchRepository
      .createQueryBuilder('church')
      .where('church.latitude IS NOT NULL')
      .take(5)
      .getMany();

    for (const church of existingChurches) {
      const result = await geocoder.geocode(
        church.address.street,
        church.address.postalCode,
        church.address.city,
        'France'
      );

      const match = result.coordinates 
        ? Math.abs(result.coordinates.lat - church.latitude!) < 0.01 &&
          Math.abs(result.coordinates.lng - church.longitude!) < 0.01
        : false;

      console.log(`${match ? '✅' : '⚠️'} ${church.name}`);
      console.log(`   DB: (${church.latitude}, ${church.longitude})`);
      console.log(`   Geocoded: ${result.coordinates ? `(${result.coordinates.lat}, ${result.coordinates.lng})` : 'null'}`);
      console.log(`   Source: ${result.source}\n`);
    }

    geocoder.logSummary();
    process.exit(0);
  }

  // Test geocoding on churches without coords
  let successCount = 0;
  let failCount = 0;

  for (const church of churchesWithoutCoords) {
    console.log(`\n📍 Testing: ${church.name}`);
    console.log(`   Address: ${church.address.street}, ${church.address.postalCode} ${church.address.city}`);

    const result = await geocoder.geocode(
      church.address.street,
      church.address.postalCode,
      church.address.city,
      'France'
    );

    if (result.coordinates) {
      successCount++;
      
      // Update church in database
      church.latitude = result.coordinates.lat;
      church.longitude = result.coordinates.lng;
      church.location = {
        type: 'Point',
        coordinates: [result.coordinates.lng, result.coordinates.lat],
      };

      await churchRepository.save(church);

      console.log(`   ✅ Success: (${result.coordinates.lat}, ${result.coordinates.lng})`);
      console.log(`   Source: ${result.source}`);
    } else {
      failCount++;
      console.log(`   ❌ Failed to geocode`);
    }
  }

  // Log summary
  geocoder.logSummary();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n🎯 Test Results:`);
  console.log(`   Churches tested: ${churchesWithoutCoords.length}`);
  console.log(`   ✅ Successfully geocoded: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   Success rate: ${((successCount / churchesWithoutCoords.length) * 100).toFixed(1)}%\n`);

  process.exit(0);
}

// Run test
testGeocoding().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
