#!/usr/bin/env node
/**
 * 🕷️ MessesInfo.fr Puppeteer Scraper
 * 
 * Extracts church listings from messes.info using browser automation.
 * Handles JavaScript-rendered SPA content.
 * 
 * Usage:
 *   node scripts/1-scrape-messesinfo-puppeteer.js --city Paris --limit 200
 *   node scripts/1-scrape-messesinfo-puppeteer.js --city Lyon --output data/lyon.json
 * 
 * Output format:
 * [
 *   {
 *     "name": "Église Saint-Sulpice",
 *     "city": "Paris",
 *     "street": "2 Rue Palatine",
 *     "postal_code": "75006",
 *     "messesinfo_url": "https://messes.info/...",
 *     "source": "messesinfo.fr"
 *   }
 * ]
 * 
 * Author: Artemis (GodsPlan ML Pipeline)
 * Created: 2026-04-05
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Department code mapping for major French cities
const DEPT_CODES = {
  'paris': '75',
  'lyon': '69',
  'marseille': '13',
  'lille': '59',
  'bordeaux': '33',
  'toulouse': '31',
  'nantes': '44',
  'strasbourg': '67',
  'montpellier': '34',
  'rennes': '35'
};

class MessesInfoPuppeteerScraper {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
    this.rateLimit = options.rateLimit || 1000; // 1s between requests
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Launching browser...');
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
    
    // Set viewport and user agent
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

  async scrapeCity(city, limit = 200) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🕷️  Scraping churches from messes.info`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📍 City: ${city}`);
    console.log(`📊 Limit: ${limit}`);
    console.log(`${'='.repeat(70)}\n`);

    const churches = [];
    
    // Try multiple URL patterns
    const cityLower = city.toLowerCase();
    const deptCode = DEPT_CODES[cityLower];
    
    const searchUrls = [
      // Pattern 1: Direct city page
      `https://messes.info/horaires/${deptCode}/${cityLower}`,
      // Pattern 2: Search query
      `https://messes.info/?search=${encodeURIComponent(city)}`,
      // Pattern 3: Department listing
      deptCode ? `https://messes.info/horaires/${deptCode}` : null
    ].filter(Boolean);

    let successUrl = null;
    let churchLinks = [];

    // Try each URL pattern until we find church listings
    for (const url of searchUrls) {
      console.log(`\n🔍 Trying URL: ${url}`);
      
      try {
        await this.page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: this.timeout
        });

        // Wait for content to load (try multiple possible selectors)
        const selectors = [
          'a[href*="/eglise/"]',
          '.church-item',
          '.result-item',
          '[data-church]',
          'article',
          '.paroisse'
        ];

        let contentLoaded = false;
        for (const selector of selectors) {
          try {
            await this.page.waitForSelector(selector, { timeout: 5000 });
            console.log(`✅ Found content with selector: ${selector}`);
            contentLoaded = true;
            break;
          } catch (e) {
            // Try next selector
          }
        }

        if (!contentLoaded) {
          console.log(`⚠️  No church listings found at ${url}`);
          continue;
        }

        // Extract church links
        churchLinks = await this.page.evaluate(() => {
          const links = [];
          const anchors = document.querySelectorAll('a[href*="/eglise/"]');
          
          anchors.forEach(a => {
            const href = a.href;
            const name = a.textContent?.trim() || '';
            
            // Extract address if available nearby
            let address = '';
            const parent = a.closest('article, div, li');
            if (parent) {
              const addressElem = parent.querySelector('.address, .adresse, [class*="address"]');
              address = addressElem?.textContent?.trim() || '';
            }
            
            if (href && href.includes('/eglise/')) {
              links.push({
                url: href,
                name: name || 'Unknown',
                address
              });
            }
          });
          
          return links;
        });

        // Deduplicate by URL
        const uniqueLinks = Array.from(
          new Map(churchLinks.map(c => [c.url, c])).values()
        );

        if (uniqueLinks.length > 0) {
          successUrl = url;
          churchLinks = uniqueLinks;
          console.log(`✅ Found ${churchLinks.length} unique church URLs`);
          break;
        }

      } catch (error) {
        console.log(`❌ Error accessing ${url}: ${error.message}`);
      }
    }

    if (!churchLinks.length) {
      console.log('\n❌ No churches found. Possible reasons:');
      console.log('  - City name incorrect');
      console.log('  - Site structure changed');
      console.log('  - Network/timeout issues');
      return [];
    }

    console.log(`\n📋 Processing ${Math.min(limit, churchLinks.length)} churches...`);
    
    // Fetch details for each church
    const toProcess = churchLinks.slice(0, limit);
    
    for (let i = 0; i < toProcess.length; i++) {
      const link = toProcess[i];
      
      if (i > 0) {
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, this.rateLimit));
      }

      console.log(`\n[${i + 1}/${toProcess.length}] ${link.name}`);
      
      try {
        const details = await this.fetchChurchDetails(link.url);
        
        if (details) {
          churches.push({
            name: details.name || link.name,
            city: city,
            street: details.street || link.address,
            postal_code: details.postal_code,
            latitude: details.latitude,
            longitude: details.longitude,
            phone: details.phone,
            email: details.email,
            messesinfo_url: link.url,
            source: 'messesinfo.fr'
          });
          
          console.log(`  ✅ Extracted: ${details.name || link.name}`);
          if (details.street) console.log(`     📍 ${details.street}`);
          if (details.postal_code) console.log(`     📮 ${details.postal_code}`);
        } else {
          console.log(`  ⚠️  Failed to extract details`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    return churches;
  }

  async fetchChurchDetails(url) {
    try {
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      // Wait for main content
      await this.page.waitForSelector('body', { timeout: 5000 });

      // Extract all data in one evaluation call
      const details = await this.page.evaluate(() => {
        const result = {
          name: null,
          street: null,
          postal_code: null,
          latitude: null,
          longitude: null,
          phone: null,
          email: null
        };

        // Extract name
        const nameSelectors = ['h1', 'h2', '.church-name', '.paroisse-name', '[itemprop="name"]'];
        for (const sel of nameSelectors) {
          const elem = document.querySelector(sel);
          if (elem && elem.textContent.trim()) {
            result.name = elem.textContent.trim();
            break;
          }
        }

        // Extract address
        const addressSelectors = [
          '.address',
          '.adresse',
          '[itemprop="address"]',
          '[class*="address"]',
          '[class*="adresse"]'
        ];
        
        for (const sel of addressSelectors) {
          const elem = document.querySelector(sel);
          if (elem) {
            const text = elem.textContent.trim();
            // Try to extract street (number + street name)
            const streetMatch = text.match(/(\d+[\s,]+[^\d,]+(?:rue|avenue|boulevard|place|impasse|chemin)[^,\n]{0,60})/i);
            if (streetMatch) {
              result.street = streetMatch[1].trim();
            }
            
            // Extract postal code (5 digits)
            const postalMatch = text.match(/\b(\d{5})\b/);
            if (postalMatch) {
              result.postal_code = postalMatch[1];
            }
            
            if (result.street || result.postal_code) break;
          }
        }

        // Extract coordinates from map data
        const scriptTexts = Array.from(document.querySelectorAll('script'))
          .map(s => s.textContent || '')
          .join('\n');
        
        const latMatch = scriptTexts.match(/(?:latitude|lat)["\s:=]+([0-9.]{6,10})/i);
        const lngMatch = scriptTexts.match(/(?:longitude|lng|lon)["\s:=]+([0-9.]{6,10})/i);
        
        if (latMatch) result.latitude = parseFloat(latMatch[1]);
        if (lngMatch) result.longitude = parseFloat(lngMatch[1]);

        // Also check data attributes
        const mapElem = document.querySelector('[data-lat], [data-latitude]');
        if (mapElem) {
          const lat = mapElem.getAttribute('data-lat') || mapElem.getAttribute('data-latitude');
          const lng = mapElem.getAttribute('data-lng') || mapElem.getAttribute('data-lon') || mapElem.getAttribute('data-longitude');
          if (lat) result.latitude = parseFloat(lat);
          if (lng) result.longitude = parseFloat(lng);
        }

        // Extract phone
        const phonePattern = /(?:tel|téléphone|phone)["\s:>]+([0-9\s.]{10,20})/i;
        const phoneMatch = document.body.innerHTML.match(phonePattern);
        if (phoneMatch) {
          result.phone = phoneMatch[1].trim().replace(/\s+/g, ' ');
        }

        // Extract email
        const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
        const emailMatch = document.body.innerHTML.match(emailPattern);
        if (emailMatch) {
          result.email = emailMatch[1];
        }

        return result;
      });

      return details;

    } catch (error) {
      console.log(`    ⚠️  Failed to load page: ${error.message}`);
      return null;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const options = {
    city: null,
    limit: 200,
    output: null,
    headless: true,
    timeout: 30000,
    rateLimit: 1000
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--city':
        options.city = args[++i];
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
      case '--timeout':
        options.timeout = parseInt(args[++i], 10);
        break;
      case '--rate-limit':
        options.rateLimit = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        console.log(`
🕷️  MessesInfo.fr Puppeteer Scraper

Usage:
  node scripts/1-scrape-messesinfo-puppeteer.js --city <city> [options]

Options:
  --city <name>         City name (required, e.g., Paris, Lyon)
  --limit <number>      Max churches to fetch (default: 200)
  --output <path>       Output JSON file path (default: data/messesinfo_<city>_<date>.json)
  --headless <bool>     Run browser in headless mode (default: true)
  --timeout <ms>        Page load timeout (default: 30000)
  --rate-limit <ms>     Delay between requests (default: 1000)

Examples:
  node scripts/1-scrape-messesinfo-puppeteer.js --city Paris --limit 200
  node scripts/1-scrape-messesinfo-puppeteer.js --city Lyon --output data/lyon.json
  node scripts/1-scrape-messesinfo-puppeteer.js --city Paris --headless false
        `);
        process.exit(0);
    }
  }

  if (!options.city) {
    console.error('❌ Error: --city is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Initialize scraper
  const scraper = new MessesInfoPuppeteerScraper({
    headless: options.headless,
    timeout: options.timeout,
    rateLimit: options.rateLimit
  });

  const startTime = Date.now();

  try {
    await scraper.init();
    
    const churches = await scraper.scrapeCity(options.city, options.limit);
    
    const elapsed = (Date.now() - startTime) / 1000;

    // Print summary
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 Extraction Summary');
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Churches extracted: ${churches.length}`);
    
    if (churches.length > 0) {
      const withStreet = churches.filter(c => c.street).length;
      const withPostal = churches.filter(c => c.postal_code).length;
      const withCoords = churches.filter(c => c.latitude && c.longitude).length;
      const withContact = churches.filter(c => c.phone || c.email).length;
      
      console.log(`📍 With street address: ${withStreet}/${churches.length} (${Math.round(withStreet/churches.length*100)}%)`);
      console.log(`📮 With postal code: ${withPostal}/${churches.length} (${Math.round(withPostal/churches.length*100)}%)`);
      console.log(`🗺️  With coordinates: ${withCoords}/${churches.length} (${Math.round(withCoords/churches.length*100)}%)`);
      console.log(`📞 With contact: ${withContact}/${churches.length} (${Math.round(withContact/churches.length*100)}%)`);
    }
    
    console.log(`⏱️  Time elapsed: ${elapsed.toFixed(1)}s`);
    console.log(`${'='.repeat(70)}\n`);

    // Determine output path
    let outputPath = options.output;
    if (!outputPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      outputPath = path.join(
        __dirname,
        '..',
        'data',
        `messesinfo_${options.city.toLowerCase()}_${timestamp}.json`
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
      console.log('📋 Sample church (first result):');
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

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { MessesInfoPuppeteerScraper };
