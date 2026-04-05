#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface Church {
  name: string;
  address: {
    street: string;
    postalCode: string;
    city: string;
  };
  latitude: number;
  longitude: number;
  massSchedules: any[];
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

interface NominatimResponse {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    postcode?: string;
    state?: string;
    country?: string;
  };
}

async function reverseGeocode(lat: number, lon: number): Promise<NominatimResponse | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse`;
    const response = await axios.get<NominatimResponse>(url, {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1,
        zoom: 18,
      },
      headers: {
        'User-Agent': 'GodsPlan/1.0 (Catholic church finder app)',
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error: any) {
    console.error(`❌ Geocoding failed for ${lat},${lon}:`, error.message);
    return null;
  }
}

async function enrichChurch(church: Church, index: number, total: number): Promise<Church> {
  console.log(`\n[${index + 1}/${total}] 🔍 Enriching: ${church.name}`);
  console.log(`   📍 Coordinates: ${church.latitude}, ${church.longitude}`);

  // Reverse geocode to get full address
  const geoData = await reverseGeocode(church.latitude, church.longitude);

  if (geoData?.address) {
    const addr = geoData.address;

    // Build street address
    const streetParts: string[] = [];
    if (addr.house_number) streetParts.push(addr.house_number);
    if (addr.road) streetParts.push(addr.road);
    const street = streetParts.join(' ').trim();

    // Get city (prioritize city > town > village > municipality)
    const city = addr.city || addr.town || addr.village || addr.municipality || church.address.city;

    // Get postal code
    const postalCode = addr.postcode || '';

    console.log(`   ✅ Address found: ${street || '(no street)'}, ${city}, ${postalCode || '(no postal)'}`);

    church.address = {
      street: street || '',
      postalCode: postalCode || '',
      city: city || church.address.city,
    };
  } else {
    console.log(`   ⚠️  No address data found (keeping city: ${church.address.city})`);
  }

  // Rate limit: 1 request per second (Nominatim requirement)
  await sleep(1100);

  return church;
}

async function enrichAllChurches(inputFile: string, outputFile: string) {
  console.log('🚀 Starting Quebec Churches Data Enrichment\n');

  // Load churches
  const rawData = fs.readFileSync(inputFile, 'utf-8');
  const churches: Church[] = JSON.parse(rawData);

  console.log(`📂 Loaded ${churches.length} churches\n`);

  // Enrich each church
  const enrichedChurches: Church[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < churches.length; i++) {
    try {
      const enriched = await enrichChurch(churches[i], i, churches.length);
      enrichedChurches.push(enriched);

      if (enriched.address.street || enriched.address.postalCode) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error enriching ${churches[i].name}:`, error.message);
      enrichedChurches.push(churches[i]); // Keep original
      failedCount++;
    }
  }

  // Save enriched data
  fs.writeFileSync(outputFile, JSON.stringify(enrichedChurches, null, 2), 'utf-8');

  console.log('\n📊 Enrichment Summary:');
  console.log(`   ✅ Successfully enriched: ${successCount}`);
  console.log(`   ⚠️  Failed to enrich: ${failedCount}`);
  console.log(`   📁 Output file: ${outputFile}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main
const inputFile = path.resolve(__dirname, '../data/quebec-churches-2026-04-04.json');
const outputFile = path.resolve(__dirname, '../data/quebec-churches-enriched.json');

enrichAllChurches(inputFile, outputFile).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
