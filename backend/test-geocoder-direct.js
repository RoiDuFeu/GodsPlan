#!/usr/bin/env node

/**
 * Direct test of geocoder functionality without full TypeScript compile
 */

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

// Simple geocoder
class TestGeocoder {
  constructor() {
    this.cache = {};
    this.cacheFile = path.join(__dirname, 'data', 'geocode-cache.json');
    this.rateLimiter = new SimpleRateLimiter(1100); // 1.1s to be safe
    this.stats = { total: 0, success: 0, failed: 0, cached: 0, apiCalls: 0 };
    
    // Load cache
    try {
      if (fs.existsSync(this.cacheFile)) {
        this.cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        console.log(`📦 Loaded ${Object.keys(this.cache).length} cached addresses`);
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

      this.stats.failed++;
      return { coordinates: null, source: 'failed', address };
    } catch (error) {
      this.stats.failed++;
      console.error(`❌ Geocoding failed for "${address}":`, error.message);
      return { coordinates: null, source: 'failed', address };
    }
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

    console.log('\n📊 Geocoding Summary:');
    console.log(`   Total requests: ${total}`);
    console.log(`   ✅ Success: ${success} (${successRate}%)`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   💾 Cache hits: ${cached} (${cacheHitRate}%)`);
    console.log(`   🌐 API calls: ${apiCalls}`);
    console.log(`   📦 Cache size: ${Object.keys(this.cache).length} addresses\n`);
  }
}

// Test avec quelques adresses d'églises parisiennes
async function runTest() {
  console.log('🧪 Testing Geocoder\n');

  const geocoder = new TestGeocoder();

  const testAddresses = [
    { street: '35 Rue du Chevaleret', postalCode: '75013', city: 'Paris', name: 'Notre-Dame-de-la-Gare' },
    { street: 'Place du Panthéon', postalCode: '75005', city: 'Paris', name: 'Panthéon' },
    { street: '23 Rue Cler', postalCode: '75007', city: 'Paris', name: 'Saint-Pierre-du-Gros-Caillou' },
    { street: '35 Rue du Chevaleret', postalCode: '75013', city: 'Paris', name: 'Notre-Dame-de-la-Gare (cache test)' },
    { street: '10 Rue Saint-Martin', postalCode: '75004', city: 'Paris', name: 'Saint-Merry' },
  ];

  for (const church of testAddresses) {
    console.log(`\n📍 ${church.name}`);
    console.log(`   ${church.street}, ${church.postalCode} ${church.city}`);
    
    const result = await geocoder.geocode(church.street, church.postalCode, church.city);
    
    if (result.coordinates) {
      const icon = result.source === 'cache' ? '💾' : '🌐';
      console.log(`   ${icon} Success: (${result.coordinates.lat}, ${result.coordinates.lng})`);
      console.log(`   Source: ${result.source}`);
    } else {
      console.log(`   ❌ Failed to geocode`);
    }
  }

  geocoder.logSummary();
}

runTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
