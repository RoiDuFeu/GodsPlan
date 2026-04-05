#!/usr/bin/env node
/**
 * 🔍 MessesInfo Structure Analyzer
 * 
 * Headless analysis to extract actual DOM structure and working selectors.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function analyzeMessesInfo(url = 'https://messes.info/horaires/75/paris') {
  console.log('🔍 Analyzing MessesInfo DOM Structure');
  console.log('='.repeat(70));
  console.log(`URL: ${url}`);
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  console.log('🌐 Loading page...');
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log('✅ Page loaded, waiting for JS...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Take screenshot
  const screenshotPath = path.join(__dirname, '..', 'data', 'messesinfo-screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  // Extract comprehensive DOM info
  const analysis = await page.evaluate(() => {
    const result = {
      url: window.location.href,
      title: document.title,
      bodyClasses: Array.from(document.body.classList),
      
      // Meta info
      frameworks: [],
      
      // Link analysis
      allLinks: [],
      churchLinks: [],
      
      // Structure analysis
      mainContainers: [],
      listElements: [],
      
      // Full HTML samples
      bodyHTML: document.body.innerHTML.slice(0, 10000),
      
      // Specific searches
      dataAttributes: [],
      possibleSelectors: {}
    };

    // Detect frameworks
    if (window.React) result.frameworks.push('React');
    if (window.Vue) result.frameworks.push('Vue');
    if (window.angular) result.frameworks.push('Angular');
    if (document.querySelector('[data-reactroot], [data-reactid]')) result.frameworks.push('React (DOM)');
    if (document.querySelector('[data-v-]')) result.frameworks.push('Vue (DOM)');
    if (document.querySelector('[ng-app], [ng-controller]')) result.frameworks.push('Angular (DOM)');

    // Extract all links
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    result.allLinks = allLinks.map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent?.trim() || '',
      classes: Array.from(a.classList),
      id: a.id || null,
      parent: a.parentElement?.tagName || null,
      parentClasses: Array.from(a.parentElement?.classList || [])
    }));

    // Filter church-related links
    const churchKeywords = ['eglise', 'church', 'paroisse', 'parish', 'chapelle', 'basilique', 'cathedrale'];
    result.churchLinks = result.allLinks.filter(link => {
      const href = (link.href || '').toLowerCase();
      const text = link.text.toLowerCase();
      return churchKeywords.some(kw => href.includes(kw) || text.includes(kw));
    });

    // Find all elements with data- attributes
    const elementsWithData = document.querySelectorAll('[data-id], [data-name], [data-type], [data-church], [data-eglise]');
    result.dataAttributes = Array.from(elementsWithData).slice(0, 20).map(el => ({
      tag: el.tagName,
      attributes: Array.from(el.attributes).reduce((acc, attr) => {
        if (attr.name.startsWith('data-')) {
          acc[attr.name] = attr.value;
        }
        return acc;
      }, {}),
      classes: Array.from(el.classList),
      textSample: el.textContent?.slice(0, 100).trim() || ''
    }));

    // Find main containers
    const containerSelectors = ['main', '#main', '#content', '.content', '[role="main"]', '.container'];
    for (const sel of containerSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        result.mainContainers.push({
          selector: sel,
          tag: el.tagName,
          classes: Array.from(el.classList),
          childCount: el.children.length,
          innerHTML: el.innerHTML.slice(0, 3000)
        });
      }
    }

    // Find list-like structures (ul, ol, divs with multiple children)
    const lists = document.querySelectorAll('ul, ol, [role="list"]');
    result.listElements = Array.from(lists).slice(0, 10).map(list => ({
      tag: list.tagName,
      classes: Array.from(list.classList),
      id: list.id || null,
      itemCount: list.children.length,
      firstItemHTML: list.children[0]?.outerHTML.slice(0, 500) || '',
      firstItemText: list.children[0]?.textContent?.trim().slice(0, 100) || ''
    }));

    // Try to find repeated patterns (potential church items)
    const potentialItems = [];
    
    // Strategy 1: Look for repeated article/div structures
    const articles = document.querySelectorAll('article');
    if (articles.length > 3) {
      potentialItems.push({
        type: 'articles',
        count: articles.length,
        selector: 'article',
        sample: articles[0]?.outerHTML.slice(0, 500)
      });
    }

    // Strategy 2: Look for divs with consistent classes in a container
    const containers = document.querySelectorAll('.container, .list, .results, main');
    containers.forEach(container => {
      const children = Array.from(container.children);
      if (children.length > 5) {
        // Check if children have common class pattern
        const classMap = {};
        children.forEach(child => {
          const className = Array.from(child.classList).join(' ');
          if (className) {
            classMap[className] = (classMap[className] || 0) + 1;
          }
        });
        
        // Find most common class combo
        const commonClass = Object.entries(classMap)
          .sort((a, b) => b[1] - a[1])[0];
        
        if (commonClass && commonClass[1] >= 3) {
          potentialItems.push({
            type: 'repeated-divs',
            count: commonClass[1],
            selector: `.${commonClass[0].split(' ').join('.')}`,
            containerSelector: container.tagName + (container.className ? `.${Array.from(container.classList).join('.')}` : ''),
            sample: container.querySelector(`.${commonClass[0].split(' ')[0]}`)?.outerHTML.slice(0, 500)
          });
        }
      }
    });

    result.possibleSelectors.potentialItems = potentialItems;

    return result;
  });

  // Save analysis to JSON
  const analysisPath = path.join(__dirname, '..', 'data', 'messesinfo-analysis.json');
  await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));
  console.log(`💾 Analysis saved: ${analysisPath}`);

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 ANALYSIS RESULTS');
  console.log('='.repeat(70));
  console.log(`Title: ${analysis.title}`);
  console.log(`Frameworks detected: ${analysis.frameworks.join(', ') || 'none'}`);
  console.log(`Total links: ${analysis.allLinks.length}`);
  console.log(`Church-related links: ${analysis.churchLinks.length}`);
  console.log(`Main containers found: ${analysis.mainContainers.length}`);
  console.log(`List elements found: ${analysis.listElements.length}`);
  console.log(`Elements with data- attributes: ${analysis.dataAttributes.length}`);

  if (analysis.churchLinks.length > 0) {
    console.log('\n🏛️  SAMPLE CHURCH LINKS (first 5):');
    console.log('='.repeat(70));
    analysis.churchLinks.slice(0, 5).forEach((link, i) => {
      console.log(`\n[${i + 1}] ${link.text}`);
      console.log(`    href: ${link.href}`);
      console.log(`    classes: ${link.classes.join(' ') || 'none'}`);
      console.log(`    parent: <${link.parent}> ${link.parentClasses.join(' ')}`);
    });
  }

  if (analysis.possibleSelectors.potentialItems && analysis.possibleSelectors.potentialItems.length > 0) {
    console.log('\n🎯 POTENTIAL ITEM SELECTORS:');
    console.log('='.repeat(70));
    analysis.possibleSelectors.potentialItems.forEach(item => {
      console.log(`\nType: ${item.type}`);
      console.log(`Count: ${item.count}`);
      console.log(`Selector: ${item.selector}`);
      if (item.containerSelector) console.log(`Container: ${item.containerSelector}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Analysis complete!');
  console.log(`📸 Screenshot: ${screenshotPath}`);
  console.log(`📄 Full data: ${analysisPath}`);
  console.log('='.repeat(70));

  await browser.close();
  
  return analysis;
}

// Run
const url = process.argv[2] || 'https://messes.info/horaires/75/paris';
analyzeMessesInfo(url).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
