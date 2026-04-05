#!/usr/bin/env node
/**
 * Extract the exact DOM structure from a working MessesInfo results page
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function extractStructure() {
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

  console.log('🌐 Loading https://messes.info/horaires/paris...');
  await page.goto('https://messes.info/horaires/paris', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('✅ Page loaded, extracting structure...');

  const data = await page.evaluate(() => {
    const result = {
      allChurchLinks: [],
      sampleHTML: '',
      containerInfo: null
    };

    // Find all church/paroisse links
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    const churchLinks = allLinks.filter(a => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent || '';
      return (
        (href.includes('/communaute/') || href.includes('/lieu/')) &&
        !href.includes('eglise.catholique.fr') &&
        !href.includes('/contact/')
      );
    });

    result.allChurchLinks = churchLinks.map(a => {
      const parent = a.closest('div, td, li, article, section');
      
      return {
        href: a.getAttribute('href'),
        text: a.textContent?.trim() || '',
        linkClasses: Array.from(a.classList),
        linkId: a.id || null,
        
        // Parent info
        parentTag: parent?.tagName || null,
        parentClasses: Array.from(parent?.classList || []),
        parentId: parent?.id || null,
        parentHTML: parent?.outerHTML.slice(0, 1000) || null,
        
        // Sibling info (to find address, etc.)
        nextSiblingText: a.nextElementSibling?.textContent?.trim().slice(0, 200) || null,
        previousSiblingText: a.previousElementSibling?.textContent?.trim().slice(0, 200) || null,
        
        // Full parent text (might contain address)
        parentText: parent?.textContent?.trim().slice(0, 500) || null
      };
    });

    // Find the container holding all results
    if (churchLinks.length > 0) {
      const firstLink = churchLinks[0];
      let container = firstLink;
      
      // Walk up DOM to find common container
      while (container.parentElement) {
        container = container.parentElement;
        
        // Check if this container holds multiple church links
        const linksInContainer = container.querySelectorAll('a[href*="/communaute/"], a[href*="/lieu/"]').length;
        
        if (linksInContainer >= churchLinks.length * 0.8) { // At least 80% of links
          result.containerInfo = {
            tag: container.tagName,
            classes: Array.from(container.classList),
            id: container.id || null,
            childCount: container.children.length,
            innerHTML: container.innerHTML.slice(0, 5000)
          };
          break;
        }
      }
    }

    // Get sample HTML from the first few results
    if (result.allChurchLinks.length > 0) {
      const firstParent = document.querySelector(
        result.allChurchLinks[0].parentTag + 
        (result.allChurchLinks[0].parentClasses.length ? `.${result.allChurchLinks[0].parentClasses[0]}` : '')
      );
      if (firstParent) {
        result.sampleHTML = firstParent.outerHTML;
      }
    }

    return result;
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 EXTRACTION RESULTS`);
  console.log('='.repeat(70));
  console.log(`Total church links found: ${data.allChurchLinks.length}`);

  if (data.allChurchLinks.length > 0) {
    console.log(`\n🏛️  SAMPLE CHURCH ENTRIES (first 3):\n`);
    
    data.allChurchLinks.slice(0, 3).forEach((entry, i) => {
      console.log(`[${i + 1}] ${entry.text}`);
      console.log(`    href: ${entry.href}`);
      console.log(`    parent: <${entry.parentTag}> ${entry.parentClasses.join(' ')}`);
      if (entry.parentId) console.log(`    parent ID: ${entry.parentId}`);
      console.log(`    parent text: ${entry.parentText?.slice(0, 150)}...`);
      console.log();
    });
  }

  if (data.containerInfo) {
    console.log(`\n📦 CONTAINER INFO:`);
    console.log(`   Tag: <${data.containerInfo.tag}>`);
    console.log(`   Classes: ${data.containerInfo.classes.join(' ') || 'none'}`);
    if (data.containerInfo.id) console.log(`   ID: ${data.containerInfo.id}`);
    console.log(`   Children: ${data.containerInfo.childCount}`);
  }

  // Save full data
  const outputPath = path.join(__dirname, '..', 'data', 'messesinfo-structure.json');
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
  console.log(`\n💾 Full data saved: ${outputPath}`);

  // Save sample HTML
  const htmlPath = path.join(__dirname, '..', 'data', 'messesinfo-sample.html');
  await fs.writeFile(htmlPath, data.sampleHTML || '');
  console.log(`📄 Sample HTML saved: ${htmlPath}`);

  console.log('='.repeat(70));

  await browser.close();
  return data;
}

extractStructure().catch(console.error);
