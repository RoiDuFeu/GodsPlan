#!/usr/bin/env node

/**
 * Batch geocode all churches without coordinates
 * Uses the cache to avoid redundant API calls
 */

const { DataSource } = require('typeorm');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Simple rate limiter
class SimpleRateLimiter {
  constructor(delayMs = 1000) {
    this.delayMs = delayMs;
    this.lastCall = 0;
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCall = Date.now();
  }
}

// Geocoder implementation
class Geocoder {
  constructor() {
    this.cache = {};
    this.cacheFile = path.join(__dirname, 'data', 'geocode-cache.json');
    this.rateLimiter = new SimpleRateLimiter(1100);
    this.stats = { total: 0, success: 0, failed: 0, cached: 0, apiCalls: 0 };
    
    // Load cache
    try {
      if (fs.existsSync(this.cacheFile)) {
        this.cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        console.log(`📦 Loaded ${Object.keys(this.cache).length} cached addresses\n`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load cache:', error.message);
    }
  }

  normalizeAddress(street, postalCode, city) {
    return `${street}, ${postalCode} ${city}, France`.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  async geocode(street, postalCode, city) {
    this.stats.total++;
    const address = this.normalizeAddress(street, postalCode, city);

    // Check cache
    if (this.cache[address]) {
      this.stats.cached++;
      this.stats.success++;
      return {
        coordinates: { lat: this.cache[address].lat, lng: this.cache[address].lng },
        source: 'cache',
        address
      };
    }

    // Geocode with Nominatim
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        await this.rateLimiter.wait();
        
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { q: address, format: 'json', limit: 1, addressdetails: 1 },
          headers: { 'User-Agent': 'GodsPlan/1.0 (contact@godsplan.app)' },
          timeout: 10000
        });

        this.stats.apiCalls++;

        if (response.data && response.data.length > 0) {
          const result = response.data[0];
          const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
          
          // Cache it
          this.cache[address] = { ...coords, cachedAt: new Date().toISOString() };
          this.saveCache();
          
          this.stats.success++;
          return { coordinates: coords, source: 'nominatim', address };
        }

        // No results found
        break;
      } catch (error) {
        if (attempts >= maxAttempts) {
          console.error(`❌ Failed after ${maxAttempts} attempts: ${error.message}`);
          break;
        }
        
        const backoff = 1000 * Math.pow(2, attempts - 1);
        console.warn(`⚠️ Attempt ${attempts} failed, retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }

    this.stats.failed++;
    return { coordinates: null, source: 'failed', address };
  }

  saveCache() {
    try {
      const dataDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Failed to save cache:', error.message);
    }
  }

  logSummary() {
    const { total, success, failed, cached, apiCalls } = this.stats;
    const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
    const cacheHitRate = total > 0 ? ((cached / total) * 100).toFixed(1) : '0.0';

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Geocoding Summary:');
    console.log(`   Total requests: ${total}`);
    console.log(`   ✅ Success: ${success} (${successRate}%)`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   💾 Cache hits: ${cached} (${cacheHitRate}%)`);
    console.log(`   🌐 API calls: ${apiCalls}`);
    console.log(`   📦 Cache size: ${Object.keys(this.cache).length} addresses`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Main function
async function geocodeAllMissing() {
  console.log('🚀 Geocoding all churches without coordinates...\n');

  // Initialize database
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'godsplan',
    password: process.env.POSTGRES_PASSWORD || 'godsplan_dev',
    database: process.env.POSTGRES_DB || 'godsplan',
    synchronize: false,
    logging: false,
  });

  await AppDataSource.initialize();

  // Find churches without coordinates
  const churches = await AppDataSource.query(`
    SELECT id, name, address
    FROM churches
    WHERE latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0
    ORDER BY name;
  `);

  console.log(`📍 Found ${churches.length} churches without coordinates\n`);

  if (churches.length === 0) {
    console.log('✅ All churches already have coordinates!\n');
    await AppDataSource.destroy();
    return;
  }

  const geocoder = new Geocoder();
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < churches.length; i++) {
    const church = churches[i];
    const progress = `[${i + 1}/${churches.length}]`;

    console.log(`\n${progress} 📍 ${church.name}`);
    console.log(`   ${church.address.street}, ${church.address.postalCode} ${church.address.city}`);

    const result = await geocoder.geocode(
      church.address.street,
      church.address.postalCode,
      church.address.city
    );

    if (result.coordinates) {
      const icon = result.source === 'cache' ? '💾' : '🌐';
      console.log(`   ${icon} Success: (${result.coordinates.lat}, ${result.coordinates.lng})`);

      // Update database
      await AppDataSource.query(
        `UPDATE churches 
         SET latitude = $1, 
             longitude = $2, 
             location = ST_SetSRID(ST_MakePoint($2, $1), 4326)
         WHERE id = $3`,
        [result.coordinates.lat, result.coordinates.lng, church.id]
      );

      updated++;
    } else {
      console.log(`   ❌ Failed to geocode`);
      failed++;
    }
  }

  geocoder.logSummary();

  console.log('🎯 Results:');
  console.log(`   Churches processed: ${churches.length}`);
  console.log(`   ✅ Successfully updated: ${updated}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success rate: ${((updated / churches.length) * 100).toFixed(1)}%\n`);

  await AppDataSource.destroy();
}

// Run
require('dotenv').config();

geocodeAllMissing()
  .then(() => {
    console.log('✅ Geocoding complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
