#!/usr/bin/env node
/**
 * 🔍 Church Website Discovery via Google Custom Search API
 * 
 * Finds official websites using Google Custom Search API (clean, reliable).
 * Filters out messesinfo.fr, catholique.fr, and other aggregators.
 * 
 * Advantages over Puppeteer scraping (script 2):
 * - No browser overhead
 * - More stable (official API)
 * - Faster (parallel requests)
 * - Better rate limiting
 * 
 * Disadvantages:
 * - Costs money after 100 queries/day
 * - Requires Google Cloud setup
 * 
 * Usage:
 *   node scripts/3-google-api-church-websites.js --input data/paris_only.json --limit 50
 *   node scripts/3-google-api-church-websites.js -i churches.json -o enriched.json
 * 
 * Setup:
 *   1. Create Google Cloud project
 *   2. Enable Custom Search API
 *   3. Create API Key
 *   4. Create Custom Search Engine (https://programmablesearchengine.google.com/)
 *   5. Add credentials to .env:
 *      GOOGLE_API_KEY=your_key_here
 *      GOOGLE_SEARCH_ENGINE_ID=your_cx_here
 * 
 * Input format:
 * [
 *   {
 *     "name": "Église Saint-Sulpice",
 *     "city": "Paris",
 *     "postal_code": "75006"
 *   }
 * ]
 * 
 * Output format (adds 'website' field):
 * [
 *   {
 *     "name": "Église Saint-Sulpice",
 *     "city": "Paris",
 *     "postal_code": "75006",
 *     "website": "https://www.stsulpice.com",
 *     "website_source": "google_api",
 *     "website_confidence": 0.9
 *   }
 * ]
 * 
 * Author: Artemis (GodsPlan ML Pipeline)
 * Created: 2026-04-05
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Domains to filter out (aggregators, not official church sites)
const EXCLUDED_DOMAINS = [
  'messesinfo.fr',
  'messes.info',
  'catholique.fr',
  'eglise.catholique.fr',
  'wikipedia.org',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'youtube.com',
  'google.com',
  'google.fr',
  'tripadvisor',
  'yelp.com'
];

// Keywords that indicate likely official site
const OFFICIAL_KEYWORDS = [
  'paroisse',
  'eglise',
  'saint',
  'notre-dame',
  'basilique',
  'cathedrale',
  'chapelle'
];

class GoogleApiWebsiteDiscovery {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GOOGLE_API_KEY;
    this.searchEngineId = options.searchEngineId || process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.rateLimit = options.rateLimit || 1000; // 1s between requests (API is fast)
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 10000;

    if (!this.apiKey || !this.searchEngineId) {
      throw new Error(
        '❌ Missing Google API credentials!\n' +
        'Set GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID in .env\n' +
        'See .env.example for setup instructions'
      );
    }
  }

  /**
   * Calculate confidence score for a search result
   */
  calculateConfidence(result, churchName) {
    let score = 0.5; // Base score

    const url = result.link.toLowerCase();
    const title = (result.title || '').toLowerCase();
    const snippet = (result.snippet || '').toLowerCase();
    const churchNameLower = churchName.toLowerCase();

    // URL contains church name keywords
    if (OFFICIAL_KEYWORDS.some(kw => url.includes(kw))) {
      score += 0.2;
    }

    // Title contains church name
    const churchWords = churchNameLower.split(/\s+/).filter(w => w.length > 3);
    const matchingWords = churchWords.filter(w => title.includes(w));
    if (matchingWords.length >= 2) {
      score += 0.3;
    } else if (matchingWords.length === 1) {
      score += 0.1;
    }

    // Domain is .fr (local French sites preferred)
    if (url.endsWith('.fr') || url.includes('.fr/')) {
      score += 0.1;
    }

    // Snippet mentions church-related terms
    const churchTerms = ['messe', 'paroisse', 'horaire', 'contact', 'curé', 'prêtre'];
    if (churchTerms.some(term => snippet.includes(term))) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check if URL should be excluded
   */
  isExcludedDomain(url) {
    const urlLower = url.toLowerCase();
    return EXCLUDED_DOMAINS.some(domain => urlLower.includes(domain));
  }

  /**
   * Search for church website using Google Custom Search API
   */
  async findWebsite(churchName, city, postalCode = null, retryCount = 0) {
    // Build search query
    let query = `${churchName} ${city}`;
    if (postalCode) {
      query += ` ${postalCode}`;
    }
    query += ' site officiel';

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: query,
          num: 10, // Get top 10 results
          lr: 'lang_fr', // Prefer French results
          gl: 'fr' // Geographic location: France
        },
        timeout: this.timeout
      });

      if (!response.data.items || response.data.items.length === 0) {
        return { website: null, confidence: 0, reason: 'no_results' };
      }

      // Find first valid result
      for (const item of response.data.items) {
        if (this.isExcludedDomain(item.link)) {
          continue;
        }

        const confidence = this.calculateConfidence(item, churchName);

        // Only accept results with reasonable confidence
        if (confidence >= 0.5) {
          return {
            website: item.link,
            confidence: confidence,
            title: item.title,
            snippet: item.snippet
          };
        }
      }

      return { website: null, confidence: 0, reason: 'low_confidence' };

    } catch (error) {
      // Handle API errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data?.error;

        // Rate limit exceeded
        if (status === 429) {
          if (retryCount < this.maxRetries) {
            const backoff = Math.pow(2, retryCount) * 2000; // Exponential backoff
            console.log(`    ⏳ Rate limited, retrying in ${backoff / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return this.findWebsite(churchName, city, postalCode, retryCount + 1);
          }
          return { website: null, confidence: 0, reason: 'rate_limit_exceeded' };
        }

        // Quota exceeded
        if (status === 403 && errorData?.message?.includes('quota')) {
          return { website: null, confidence: 0, reason: 'quota_exceeded' };
        }

        // Invalid API key
        if (status === 400 || status === 403) {
          throw new Error(`Google API error: ${errorData?.message || 'Invalid credentials'}`);
        }
      }

      // Network or timeout error
      if (retryCount < this.maxRetries) {
        console.log(`    ⚠️  Request failed, retrying (${retryCount + 1}/${this.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.findWebsite(churchName, city, postalCode, retryCount + 1);
      }

      return { website: null, confidence: 0, reason: 'network_error', error: error.message };
    }
  }

  /**
   * Process multiple churches
   */
  async processChurches(churches, limit = null) {
    const toProcess = limit ? churches.slice(0, limit) : churches;
    const results = [];
    
    let successCount = 0;
    let failureCount = 0;
    let quotaExceeded = false;

    console.log(`\n${'='.repeat(70)}`);
    console.log('🔍 Finding official websites via Google Custom Search API');
    console.log(`${'='.repeat(70)}`);
    console.log(`📊 Churches to process: ${toProcess.length}`);
    console.log(`⏱️  Rate limit: ${this.rateLimit}ms between requests`);
    console.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);
    console.log(`🔍 Search Engine: ${this.searchEngineId}`);
    console.log(`${'='.repeat(70)}\n`);

    for (let i = 0; i < toProcess.length; i++) {
      const church = toProcess[i];

      if (i > 0) {
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, this.rateLimit));
      }

      console.log(`[${i + 1}/${toProcess.length}] ${church.name}`);

      // Skip if already has a valid website
      if (church.website && !this.isExcludedDomain(church.website)) {
        console.log(`  ⏭️  Already has website: ${church.website}`);
        results.push({
          ...church,
          website_source: 'existing',
          website_confidence: 1.0
        });
        successCount++;
        continue;
      }

      if (quotaExceeded) {
        console.log(`  ⏭️  Skipping (quota exceeded earlier)`);
        results.push({
          ...church,
          website: null,
          website_source: 'skipped',
          website_confidence: 0
        });
        failureCount++;
        continue;
      }

      try {
        const result = await this.findWebsite(
          church.name,
          church.city,
          church.postal_code
        );

        const enriched = { ...church };

        if (result.website) {
          enriched.website = result.website;
          enriched.website_source = 'google_api';
          enriched.website_confidence = result.confidence;
          
          console.log(`  ✅ Found: ${result.website} (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
          successCount++;
        } else {
          enriched.website = null;
          enriched.website_source = 'google_api';
          enriched.website_confidence = 0;
          enriched.website_search_reason = result.reason;
          
          console.log(`  ⚠️  No website found (${result.reason})`);
          failureCount++;

          if (result.reason === 'quota_exceeded') {
            quotaExceeded = true;
            console.log(`\n⚠️  Google API quota exceeded! Remaining churches will be skipped.\n`);
          }
        }

        results.push(enriched);

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        results.push({
          ...church,
          website: null,
          website_source: 'error',
          website_confidence: 0,
          website_error: error.message
        });
        failureCount++;
      }
    }

    return {
      results,
      stats: {
        total: toProcess.length,
        success: successCount,
        failure: failureCount,
        successRate: Math.round((successCount / toProcess.length) * 100)
      }
    };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const options = {
    input: null,
    output: null,
    limit: null,
    rateLimit: 1000,
    maxRetries: 3,
    apiKey: process.env.GOOGLE_API_KEY,
    searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        options.input = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--rate-limit':
        options.rateLimit = parseInt(args[++i], 10);
        break;
      case '--max-retries':
        options.maxRetries = parseInt(args[++i], 10);
        break;
      case '--api-key':
        options.apiKey = args[++i];
        break;
      case '--cx':
      case '--search-engine-id':
        options.searchEngineId = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
🔍 Church Website Discovery via Google Custom Search API

Usage:
  node scripts/3-google-api-church-websites.js --input <file> [options]

Options:
  --input, -i <path>          Input JSON file with church list (required)
  --output, -o <path>         Output JSON file (default: input + "_with_urls.json")
  --limit, -l <number>        Max churches to process (default: all)
  --rate-limit <ms>           Delay between API calls (default: 1000)
  --max-retries <number>      Max retry attempts on failure (default: 3)
  --api-key <key>             Google API Key (or set GOOGLE_API_KEY env var)
  --cx <id>                   Search Engine ID (or set GOOGLE_SEARCH_ENGINE_ID)

Setup:
  1. Go to https://console.cloud.google.com/
  2. Create project + enable Custom Search API
  3. Create API Key in Credentials
  4. Create Search Engine at https://programmablesearchengine.google.com/
  5. Set environment variables in .env

Cost:
  - Free: 100 queries/day
  - Paid: $5 per 1000 queries

Examples:
  node scripts/3-google-api-church-websites.js --input data/paris_only.json --limit 50
  node scripts/3-google-api-church-websites.js -i churches.json -o enriched.json
        `);
        process.exit(0);
    }
  }

  if (!options.input) {
    console.error('❌ Error: --input is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Read input file
  let churches;
  try {
    const inputContent = await fs.readFile(options.input, 'utf-8');
    churches = JSON.parse(inputContent);

    if (!Array.isArray(churches)) {
      throw new Error('Input file must contain a JSON array');
    }

    console.log(`✅ Loaded ${churches.length} churches from ${options.input}`);
  } catch (error) {
    console.error(`❌ Failed to read input file: ${error.message}`);
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    const discovery = new GoogleApiWebsiteDiscovery({
      apiKey: options.apiKey,
      searchEngineId: options.searchEngineId,
      rateLimit: options.rateLimit,
      maxRetries: options.maxRetries
    });

    const { results, stats } = await discovery.processChurches(churches, options.limit);

    const elapsed = (Date.now() - startTime) / 1000;

    // Print summary
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 Website Discovery Summary (Google API)');
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Churches processed: ${stats.total}`);
    console.log(`🌐 Websites found: ${stats.success}/${stats.total} (${stats.successRate}%)`);
    console.log(`❌ Not found: ${stats.failure}/${stats.total}`);
    console.log(`⏱️  Time elapsed: ${elapsed.toFixed(1)}s`);
    console.log(`⚡ Average: ${(elapsed / stats.total).toFixed(1)}s per church`);
    console.log(`💰 API calls made: ~${stats.total} (cost: ~$${(stats.total / 1000 * 5).toFixed(2)})`);
    console.log(`${'='.repeat(70)}\n`);

    // Determine output path
    let outputPath = options.output;
    if (!outputPath) {
      const inputDir = path.dirname(options.input);
      const inputBasename = path.basename(options.input, '.json');
      outputPath = path.join(inputDir, `${inputBasename}_with_urls.json`);
    }

    // Save to JSON
    await fs.writeFile(
      outputPath,
      JSON.stringify(results, null, 2),
      'utf-8'
    );

    console.log(`💾 Saved to: ${outputPath}\n`);

    // Show samples
    if (results.length > 0) {
      console.log('📋 Sample results:\n');

      // Show first church with website
      const withUrl = results.find(c => c.website && c.website_source === 'google_api');
      if (withUrl) {
        console.log('✅ Church WITH website (API):');
        console.log(JSON.stringify({
          name: withUrl.name,
          city: withUrl.city,
          website: withUrl.website,
          confidence: withUrl.website_confidence
        }, null, 2));
        console.log();
      }

      // Show first church without website
      const withoutUrl = results.find(c => !c.website);
      if (withoutUrl) {
        console.log('⚠️  Church WITHOUT website:');
        console.log(JSON.stringify({
          name: withoutUrl.name,
          city: withoutUrl.city,
          reason: withoutUrl.website_search_reason
        }, null, 2));
        console.log();
      }
    }

    // Exit code based on success rate
    if (stats.successRate >= 50) {
      console.log('✅ Success rate ≥50%, mission accomplished!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Success rate <50%, consider adjusting search parameters\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your Google API credentials in .env');
    console.error('2. Verify Custom Search API is enabled');
    console.error('3. Ensure you have quota remaining (100/day free)');
    console.error('4. Run with --help for setup instructions\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { GoogleApiWebsiteDiscovery };
