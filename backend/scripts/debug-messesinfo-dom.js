#!/usr/bin/env node
/**
 * 🔍 MessesInfo DOM Inspector
 * 
 * Opens messesinfo.fr in visible browser and helps identify correct selectors.
 * Waits for manual inspection before continuing.
 * 
 * Usage:
 *   node scripts/debug-messesinfo-dom.js [url]
 * 
 * Default URL: https://messes.info/horaires/75/paris
 */

const puppeteer = require('puppeteer');

async function inspectDOM(url = 'https://messes.info/horaires/75/paris') {
  console.log('🔍 MessesInfo DOM Inspector');
  console.log('='.repeat(70));
  console.log(`Target URL: ${url}`);
  console.log('='.repeat(70));
  console.log();

  const browser = await puppeteer.launch({
    headless: false, // VISIBLE mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080'
    ],
    devtools: true // Open DevTools automatically
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  console.log('🌐 Navigating to', url);
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('✅ Page loaded');
  console.log();
  console.log('🔎 Waiting for content to render...');
  
  // Wait a bit for JS to settle
  await page.waitForTimeout(5000);

  console.log();
  console.log('📊 Analyzing DOM structure...');
  console.log('='.repeat(70));

  // Extract DOM structure info
  const domInfo = await page.evaluate(() => {
    const info = {
      title: document.title,
      bodyClasses: Array.from(document.body.classList),
      frameworks: [],
      possibleChurchSelectors: [],
      possibleLinkSelectors: [],
      sampleHTML: '',
      totalLinks: 0,
      churchLikeLinks: []
    };

    // Detect frameworks
    if (window.React) info.frameworks.push('React');
    if (window.Vue) info.frameworks.push('Vue');
    if (window.angular) info.frameworks.push('Angular');
    if (document.querySelector('[ng-app]')) info.frameworks.push('Angular (detected)');
    if (document.querySelector('[data-reactroot], [data-reactid]')) info.frameworks.push('React (detected)');
    if (document.querySelector('[data-v-]')) info.frameworks.push('Vue (detected)');

    // Find all links
    const allLinks = Array.from(document.querySelectorAll('a'));
    info.totalLinks = allLinks.length;

    // Find links that look like church pages
    const churchKeywords = ['eglise', 'church', 'paroisse', 'parish', 'chapelle'];
    const churchLinks = allLinks.filter(a => {
      const href = a.href.toLowerCase();
      return churchKeywords.some(kw => href.includes(kw));
    });

    info.churchLikeLinks = churchLinks.slice(0, 10).map(a => ({
      href: a.href,
      text: a.textContent?.trim().slice(0, 100) || '',
      classes: Array.from(a.classList),
      id: a.id || null,
      parentTag: a.parentElement?.tagName || null,
      parentClasses: Array.from(a.parentElement?.classList || [])
    }));

    // Try common container patterns
    const possibleContainers = [
      'main',
      '[role="main"]',
      '#main',
      '#content',
      '.content',
      '.main-content',
      '.container',
      '.church-list',
      '.results',
      '.liste',
      'article',
      '[data-church]',
      '[data-eglise]',
      '.paroisse'
    ];

    for (const selector of possibleContainers) {
      const elem = document.querySelector(selector);
      if (elem) {
        info.possibleChurchSelectors.push({
          selector,
          childCount: elem.children.length,
          textSample: elem.textContent?.slice(0, 200).replace(/\s+/g, ' ') || ''
        });
      }
    }

    // Get sample HTML from main content area
    const main = document.querySelector('main, #main, #content, .content, .container');
    if (main) {
      info.sampleHTML = main.innerHTML.slice(0, 2000);
    }

    return info;
  });

  console.log('Page Title:', domInfo.title);
  console.log('Body Classes:', domInfo.bodyClasses.join(', ') || 'none');
  console.log('Detected Frameworks:', domInfo.frameworks.join(', ') || 'none');
  console.log('Total Links:', domInfo.totalLinks);
  console.log('Church-like Links Found:', domInfo.churchLikeLinks.length);
  console.log();

  if (domInfo.churchLikeLinks.length > 0) {
    console.log('🏛️  Sample Church Links:');
    console.log('='.repeat(70));
    domInfo.churchLikeLinks.slice(0, 5).forEach((link, idx) => {
      console.log(`\n[${idx + 1}] ${link.text}`);
      console.log(`    URL: ${link.href}`);
      console.log(`    Classes: ${link.classes.join(', ') || 'none'}`);
      if (link.id) console.log(`    ID: ${link.id}`);
      console.log(`    Parent: <${link.parentTag}> ${link.parentClasses.join(', ')}`);
    });
    console.log();
  }

  if (domInfo.possibleChurchSelectors.length > 0) {
    console.log('📦 Possible Container Selectors:');
    console.log('='.repeat(70));
    domInfo.possibleChurchSelectors.forEach(s => {
      console.log(`\n${s.selector}`);
      console.log(`  Children: ${s.childCount}`);
      console.log(`  Sample: ${s.textSample.slice(0, 100)}...`);
    });
    console.log();
  }

  console.log('📝 Sample HTML (first 500 chars):');
  console.log('='.repeat(70));
  console.log(domInfo.sampleHTML.slice(0, 500));
  console.log('...\n');

  console.log('='.repeat(70));
  console.log('🛠️  MANUAL INSPECTION MODE');
  console.log('='.repeat(70));
  console.log('Browser is now open with DevTools.');
  console.log('Inspect the page and identify:');
  console.log('  1. Selector for church list container');
  console.log('  2. Selector for individual church items');
  console.log('  3. Selector for church name');
  console.log('  4. Selector for church link');
  console.log('  5. Selector for address (if visible on listing)');
  console.log();
  console.log('Press Ctrl+C when done inspecting, or wait 10 minutes for auto-close.');
  console.log('='.repeat(70));

  // Keep browser open for 10 minutes or until manual interruption
  await page.waitForTimeout(600000); // 10 min

  console.log('\n⏱️  Timeout reached, closing browser...');
  await browser.close();
  console.log('✅ Browser closed');
}

// Parse arguments
const args = process.argv.slice(2);
const url = args[0] || 'https://messes.info/horaires/75/paris';

inspectDOM(url).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
