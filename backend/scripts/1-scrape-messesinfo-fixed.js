#!/usr/bin/env node
/**
 * 🕷️ MessesInfo.fr Scraper - FIXED VERSION
 * 
 * Extracts church data from messes.info by:
 * 1. Loading /horaires/paris (or other city)
 * 2. Finding "Signalez une erreur" links that contain encoded church data
 * 3. Extracting name, address, postal code from URL-encoded info param
 * 
 * Usage:
 *   node scripts/1-scrape-messesinfo-fixed.js --city paris --limit 200
 *   node scripts/1-scrape-messesinfo-fixed.js --postal 75001 --output data/paris-01.json
 * 
 * Output format:
 * [
 *   {
 *     "name": "Sacré-Cœur de Montmartre",
 *     "type": "Basilique",
 *     "paroisse": "Saint-Pierre de Montmartre",
 *     "street": "35 rue du Chevalier-de-la-Barre",
 *     "postal_code": "75018",
 *     "city": "Paris",
 *     "messesinfo_url": "https://messes.info/communaute/pa/75/sacre-coeur-de-montmartre",
 *     "source": "messesinfo.fr"
 *   }
 * ]
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class MessesInfoScraper {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    console.log('✅ Browser ready');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  /**
   * Parse church data from the encoded "info" parameter in contact/report links
   */
  parseChurchInfo(encodedInfo) {
    try {
      const decoded = decodeURIComponent(encodedInfo);
      const lines = decoded.split('\n').map(l => l.trim()).filter(Boolean);
      
      const result = {
        name: null,
        type: null,
        paroisse: null,
        diocese: null,
        street: null,
        postal_code: null,
        city: null,
        country: null,
        url: null
      };

      for (const line of lines) {
        // Extract field: value pairs
        if (line.includes(':')) {
          const [field, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          
          const fieldLower = field.trim().toLowerCase();
          
          if (fieldLower.includes('église') || fieldLower.includes('basilique') || 
              fieldLower.includes('cathédrale') || fieldLower.includes('chapelle')) {
            result.type = field.trim();
            result.name = value;
          } else if (fieldLower.includes('paroisse')) {
            result.paroisse = value;
          } else if (fieldLower.includes('diocèse') || fieldLower.includes('diocese')) {
            result.diocese = value;
          }
        }
        // Extract street address (has number + street name)
        else if (/^\d+/.test(line) && (line.toLowerCase().includes('rue') || 
                 line.toLowerCase().includes('avenue') || 
                 line.toLowerCase().includes('boulevard') ||
                 line.toLowerCase().includes('place') ||
                 line.toLowerCase().includes('chemin') ||
                 line.toLowerCase().includes('parvis'))) {
          result.street = line;
        }
        // Extract postal code + city (format: 75018 Paris, fr)
        else if (/^\d{5}\s+/.test(line)) {
          const match = line.match(/^(\d{5})\s+([^,]+)/);
          if (match) {
            result.postal_code = match[1];
            result.city = match[2].trim();
            
            // Extract country if present
            if (line.includes(',')) {
              const parts = line.split(',');
              result.country = parts[parts.length - 1].trim();
            }
          }
        }
        // Extract messes.info URL
        else if (line.startsWith('https://messes.info/')) {
          result.url = line.split(' ')[0]; // URL is first part before space
        }
      }

      // If no explicit name but we have paroisse, use paroisse as name
      if (!result.name && result.paroisse) {
        result.name = result.paroisse;
      }

      return result;
    } catch (error) {
      console.error(`  ⚠️  Failed to parse church info: ${error.message}`);
      return null;
    }
  }

  async scrapeCity(query, limit = 200) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🕷️  Scraping churches from messes.info`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📍 Query: ${query}`);
    console.log(`📊 Limit: ${limit}`);
    console.log(`${'='.repeat(70)}\n`);

    const url = `https://messes.info/horaires/${encodeURIComponent(query)}`;
    
    console.log(`🌐 Loading ${url}...`);
    await this.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: this.timeout
    });

    console.log('✅ Page loaded, waiting for content...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract church data from error-report links
    const churches = await this.page.evaluate(() => {
      const results = [];
      
      // Find all "Signalez une erreur" links
      const errorLinks = Array.from(document.querySelectorAll('a[href^="/contact/info="]'));
      
      for (const link of errorLinks) {
        const href = link.getAttribute('href');
        if (!href) continue;
        
        // Extract the info parameter
        const match = href.match(/\/contact\/info=([^;]+)/);
        if (!match) continue;
        
        const encodedInfo = match[1];
        
        // Also find the community link (sibling or nearby)
        let communityUrl = null;
        const parent = link.closest('div');
        if (parent) {
          const communityLink = parent.querySelector('a[href^="/communaute/"]');
          if (communityLink) {
            communityUrl = communityLink.getAttribute('href');
          }
        }
        
        results.push({
          encodedInfo,
          communityUrl
        });
      }
      
      return results;
    });

    console.log(`✅ Found ${churches.length} church entries`);

    // Parse each church
    const parsed = [];
    
    for (let i = 0; i < Math.min(churches.length, limit); i++) {
      const raw = churches[i];
      const church = this.parseChurchInfo(raw.encodedInfo);
      
      if (church && church.name) {
        church.messesinfo_url = raw.communityUrl ? 
          `https://messes.info${raw.communityUrl}` : null;
        church.source = 'messesinfo.fr';
        
        parsed.push(church);
        
        console.log(`[${i + 1}/${Math.min(churches.length, limit)}] ${church.name}`);
        if (church.street) console.log(`   📍 ${church.street}`);
        if (church.postal_code) console.log(`   📮 ${church.postal_code} ${church.city || ''}`);
      } else {
        console.log(`[${i + 1}/${Math.min(churches.length, limit)}] ⚠️  Failed to parse`);
      }
    }

    return parsed;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    query: null,
    limit: 200,
    output: null,
    headless: true
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--city':
        options.query = args[++i];
        break;
      case '--postal':
        options.query = args[++i];
        break;
      case '--query':
        options.query = args[++i];
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--headless':
        options.headless = args[++i] !== 'false';
        break;
      case '--help':
      case '-h':
        console.log(`
🕷️  MessesInfo.fr Scraper

Usage:
  node scripts/1-scrape-messesinfo-fixed.js --city <name> [options]
  node scripts/1-scrape-messesinfo-fixed.js --postal <code> [options]

Options:
  --city <name>         City name (e.g., paris, lyon)
  --postal <code>       Postal code (e.g., 75001, 75006)
  --query <text>        Custom search query
  --limit <number>      Max churches to extract (default: 200)
  --output <path>       Output JSON file path
  --headless <bool>     Run in headless mode (default: true)

Examples:
  node scripts/1-scrape-messesinfo-fixed.js --city paris --limit 200
  node scripts/1-scrape-messesinfo-fixed.js --postal 75001
  node scripts/1-scrape-messesinfo-fixed.js --city lyon --output data/lyon.json
        `);
        process.exit(0);
    }
  }

  if (!options.query) {
    console.error('❌ Error: --city, --postal, or --query is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  const scraper = new MessesInfoScraper({
    headless: options.headless
  });

  const startTime = Date.now();

  try {
    await scraper.init();
    
    const churches = await scraper.scrapeCity(options.query, options.limit);
    
    const elapsed = (Date.now() - startTime) / 1000;

    // Print summary
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 Extraction Summary');
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Churches extracted: ${churches.length}`);
    
    if (churches.length > 0) {
      const withStreet = churches.filter(c => c.street).length;
      const withPostal = churches.filter(c => c.postal_code).length;
      const withParoisse = churches.filter(c => c.paroisse).length;
      const withURL = churches.filter(c => c.messesinfo_url).length;
      
      console.log(`📍 With street: ${withStreet}/${churches.length} (${Math.round(withStreet/churches.length*100)}%)`);
      console.log(`📮 With postal code: ${withPostal}/${churches.length} (${Math.round(withPostal/churches.length*100)}%)`);
      console.log(`⛪ With paroisse: ${withParoisse}/${churches.length} (${Math.round(withParoisse/churches.length*100)}%)`);
      console.log(`🔗 With MessesInfo URL: ${withURL}/${churches.length} (${Math.round(withURL/churches.length*100)}%)`);
    }
    
    console.log(`⏱️  Time elapsed: ${elapsed.toFixed(1)}s`);
    console.log(`${'='.repeat(70)}\n`);

    // Determine output path
    let outputPath = options.output;
    if (!outputPath) {
      const timestamp = new Date().toISOString().split('T')[0];
      const querySlug = options.query.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      outputPath = path.join(
        __dirname,
        '..',
        'data',
        `messesinfo-${querySlug}-${timestamp}.json`
      );
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Save to JSON
    await fs.writeFile(
      outputPath,
      JSON.stringify(churches, null, 2),
      'utf-8'
    );

    console.log(`💾 Saved to: ${outputPath}\n`);

    // Show sample
    if (churches.length > 0) {
      console.log('📋 Sample (first result):');
      console.log(JSON.stringify(churches[0], null, 2));
      console.log();
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { MessesInfoScraper };
