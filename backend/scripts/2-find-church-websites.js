#!/usr/bin/env node
/**
 * 🔍 Church Website Discovery via Google Search
 * 
 * Finds official websites for churches using Google search.
 * Filters out messesinfo.fr, catholique.fr, and other aggregators.
 * 
 * Usage:
 *   node scripts/2-find-church-websites.js --input data/messesinfo_paris.json --output data/paris_with_urls.json
 *   node scripts/2-find-church-websites.js --input churches.json --limit 50
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
 *     "website": "https://www.stsulpice.com"
 *   }
 * ]
 * 
 * Author: Artemis (GodsPlan ML Pipeline)
 * Created: 2026-04-05
 */

const puppeteer = require('puppeteer');
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
  'google.fr'
];

class WebsiteDiscovery {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 15000;
    this.rateLimit = options.rateLimit || 2000; // 2s between searches (be polite to Google)
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Launching browser for Google search...');
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Mimic real browser
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Set language to French
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
    });
    
    console.log('✅ Browser ready');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  async findWebsite(churchName, city, postalCode = null) {
    // Build search query
    let query = `${churchName} ${city}`;
    if (postalCode) {
      query += ` ${postalCode}`;
    }
    query += ' site officiel';

    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.google.fr/search?q=${encodedQuery}`;

    try {
      await this.page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      // Wait for search results
      await this.page.waitForSelector('#search, .g', { timeout: 5000 });

      // Extract first relevant result
      const result = await this.page.evaluate((excludedDomains) => {
        // Try multiple selectors for search results
        const resultSelectors = [
          '#search .g a[href^="http"]',
          '.g a[href^="http"]',
          'a[href^="http"]'
        ];

        let links = [];
        for (const selector of resultSelectors) {
          links = Array.from(document.querySelectorAll(selector));
          if (links.length > 0) break;
        }

        // Filter and find first valid link
        for (const link of links) {
          const href = link.href;
          
          // Skip if excluded domain
          const isExcluded = excludedDomains.some(domain => href.includes(domain));
          if (isExcluded) continue;

          // Skip Google internal links
          if (href.includes('/search?') || href.includes('google.com/url?')) {
            continue;
          }

          // Skip non-church domains (social media, etc)
          if (href.includes('facebook.com') || 
              href.includes('twitter.com') ||
              href.includes('instagram.com')) {
            continue;
          }

          // Valid link found
          return {
            url: href,
            title: link.textContent?.trim() || ''
          };
        }

        return null;
      }, EXCLUDED_DOMAINS);

      if (result && result.url) {
        // Clean up URL (remove tracking params)
        const cleanUrl = result.url.split('?')[0];
        return cleanUrl;
      }

      return null;

    } catch (error) {
      console.log(`    ⚠️  Search failed: ${error.message}`);
      return null;
    }
  }

  async processChurches(churches, limit = null) {
    const toProcess = limit ? churches.slice(0, limit) : churches;
    const results = [];

    console.log(`\n${'='.repeat(70)}`);
    console.log('🔍 Finding official websites via Google Search');
    console.log(`${'='.repeat(70)}`);
    console.log(`📊 Churches to process: ${toProcess.length}`);
    console.log(`⏱️  Rate limit: ${this.rateLimit}ms between searches`);
    console.log(`${'='.repeat(70)}\n`);

    for (let i = 0; i < toProcess.length; i++) {
      const church = toProcess[i];
      
      if (i > 0) {
        // Rate limiting (be nice to Google!)
        await new Promise(resolve => setTimeout(resolve, this.rateLimit));
      }

      console.log(`[${i + 1}/${toProcess.length}] ${church.name}`);

      try {
        const website = await this.findWebsite(
          church.name,
          church.city,
          church.postal_code
        );

        const enriched = { ...church };
        
        if (website) {
          enriched.website = website;
          console.log(`  ✅ Found: ${website}`);
        } else {
          enriched.website = null;
          console.log(`  ⚠️  No official website found`);
        }

        results.push(enriched);

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        results.push({ ...church, website: null });
      }
    }

    return results;
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
    headless: true,
    timeout: 15000,
    rateLimit: 2000
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
      case '--headless':
        options.headless = args[++i] !== 'false';
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i], 10);
        break;
      case '--rate-limit':
        options.rateLimit = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        console.log(`
🔍 Church Website Discovery via Google Search

Usage:
  node scripts/2-find-church-websites.js --input <file> [options]

Options:
  --input, -i <path>    Input JSON file with church list (required)
  --output, -o <path>   Output JSON file (default: input + "_with_urls.json")
  --limit, -l <number>  Max churches to process (default: all)
  --headless <bool>     Run browser in headless mode (default: true)
  --timeout <ms>        Page load timeout (default: 15000)
  --rate-limit <ms>     Delay between searches (default: 2000, min: 1000)

Examples:
  node scripts/2-find-church-websites.js --input data/messesinfo_paris.json
  node scripts/2-find-church-websites.js -i churches.json -o enriched.json --limit 50
  node scripts/2-find-church-websites.js -i churches.json --headless false
        `);
        process.exit(0);
    }
  }

  if (!options.input) {
    console.error('❌ Error: --input is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Enforce minimum rate limit (don't hammer Google)
  if (options.rateLimit < 1000) {
    console.log('⚠️  Rate limit too low, setting to 1000ms (be polite!)');
    options.rateLimit = 1000;
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

  // Initialize discovery
  const discovery = new WebsiteDiscovery({
    headless: options.headless,
    timeout: options.timeout,
    rateLimit: options.rateLimit
  });

  const startTime = Date.now();

  try {
    await discovery.init();
    
    const enriched = await discovery.processChurches(churches, options.limit);
    
    const elapsed = (Date.now() - startTime) / 1000;

    // Print summary
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 Website Discovery Summary');
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Churches processed: ${enriched.length}`);
    
    const withWebsite = enriched.filter(c => c.website).length;
    const successRate = Math.round(withWebsite / enriched.length * 100);
    
    console.log(`🌐 Websites found: ${withWebsite}/${enriched.length} (${successRate}%)`);
    console.log(`⏱️  Time elapsed: ${elapsed.toFixed(1)}s`);
    console.log(`⚡ Average: ${(elapsed / enriched.length).toFixed(1)}s per church`);
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
      JSON.stringify(enriched, null, 2),
      'utf-8'
    );

    console.log(`💾 Saved to: ${outputPath}\n`);

    // Show samples
    if (enriched.length > 0) {
      console.log('📋 Sample results:\n');
      
      // Show first church with website
      const withUrl = enriched.find(c => c.website);
      if (withUrl) {
        console.log('✅ Church WITH website:');
        console.log(JSON.stringify(withUrl, null, 2));
        console.log();
      }
      
      // Show first church without website
      const withoutUrl = enriched.find(c => !c.website);
      if (withoutUrl) {
        console.log('⚠️  Church WITHOUT website:');
        console.log(JSON.stringify(withoutUrl, null, 2));
        console.log();
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await discovery.close();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { WebsiteDiscovery };
