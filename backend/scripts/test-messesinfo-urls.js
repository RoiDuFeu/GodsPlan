#!/usr/bin/env node
/**
 * Test different URL patterns on messes.info to find working church listings
 */

const puppeteer = require('puppeteer');

async function testURL(browser, url, description) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Testing: ${description}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(70));

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const info = await page.evaluate(() => {
      // Find church-like links
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const churchLinks = allLinks.filter(a => {
        const href = (a.getAttribute('href') || '').toLowerCase();
        const text = (a.textContent || '').toLowerCase();
        return (
          href.includes('eglise') ||
          href.includes('paroisse') ||
          text.includes('église') ||
          text.includes('paroisse') ||
          text.includes('chapelle') ||
          text.includes('basilique')
        );
      }).map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent?.trim() || ''
      }));

      // Find table rows, list items, articles
      const tables = document.querySelectorAll('table');
      const lists = document.querySelectorAll('ul, ol');
      const articles = document.querySelectorAll('article');
      
      // Try to find results count
      const bodyText = document.body.textContent || '';
      const countMatch = bodyText.match(/(\d+)\s*résultat|(\d+)\s*église|(\d+)\s*paroisse/i);
      
      return {
        title: document.title,
        churchLinksCount: churchLinks.length,
        sampleLinks: churchLinks.slice(0, 5),
        tableCount: tables.length,
        listCount: lists.length,
        articleCount: articles.length,
        possibleResultCount: countMatch ? (countMatch[1] || countMatch[2] || countMatch[3]) : null
      };
    });

    console.log(`✅ Page loaded: ${info.title}`);
    console.log(`   Church-like links: ${info.churchLinksCount}`);
    if (info.possibleResultCount) {
      console.log(`   Possible result count: ${info.possibleResultCount}`);
    }
    console.log(`   Tables: ${info.tableCount}, Lists: ${info.listCount}, Articles: ${info.articleCount}`);

    if (info.sampleLinks.length > 0) {
      console.log('\n   Sample links:');
      info.sampleLinks.forEach((link, i) => {
        console.log(`   [${i + 1}] ${link.text.slice(0, 60)}`);
        console.log(`       ${link.href}`);
      });
    }

    await page.close();
    return info;

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    await page.close();
    return null;
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  console.log('🕷️  MessesInfo URL Pattern Testing');
  console.log('='.repeat(70));

  // Test various URL patterns
  const tests = [
    {
      url: 'https://messes.info/horaires/75/paris',
      desc: 'Department + city pattern'
    },
    {
      url: 'https://messes.info/horaires/paris',
      desc: 'City only'
    },
    {
      url: 'https://messes.info/horaires/75',
      desc: 'Department only'
    },
    {
      url: 'https://messes.info/?search=paris',
      desc: 'Search query'
    },
    {
      url: 'https://messes.info/horaires/75001',
      desc: 'Postal code (Paris 1er)'
    },
    {
      url: 'https://messes.info/horaires/75006',
      desc: 'Postal code (Paris 6e)'
    },
    {
      url: 'https://messes.info/horaires/paris%2001',
      desc: 'Paris arrondissement search'
    }
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await testURL(browser, test.url, test.desc);
    results.push({ ...test, result });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  results.forEach(r => {
    if (r.result) {
      console.log(`\n${r.desc}:`);
      console.log(`  URL: ${r.url}`);
      console.log(`  Church links: ${r.result.churchLinksCount}`);
      if (r.result.possibleResultCount) {
        console.log(`  Result count: ${r.result.possibleResultCount}`);
      }
    }
  });

  // Find best URL
  const best = results
    .filter(r => r.result)
    .sort((a, b) => (b.result.churchLinksCount || 0) - (a.result.churchLinksCount || 0))[0];

  if (best && best.result.churchLinksCount > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('✅ BEST URL PATTERN:');
    console.log(`   ${best.desc}`);
    console.log(`   ${best.url}`);
    console.log(`   Found ${best.result.churchLinksCount} church links`);
    console.log('='.repeat(70));
  } else {
    console.log('\n❌ No working URL pattern found');
    console.log('The site may require JavaScript interaction or form submission');
  }
}

main().catch(console.error);
