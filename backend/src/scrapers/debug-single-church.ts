/**
 * Debug un église spécifique pour voir pourquoi les horaires ne sont pas détectés
 */

import puppeteer from 'puppeteer';

async function debugChurch(url: string) {
  console.log(`🔍 Debugging: ${url}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Injecter le cookie Didomi directement
  console.log('🍪 Injecting Didomi consent cookies...');
  
  await page.setCookie({
    name: 'euconsent-v2',
    value: 'CPtnlgAPtnlgAAOACCFRBQCsAP_AAH_AAAqIJNNd_X__bX9j-_59f_t0eY1P9_r_v-Qzjhfdt-8F3L_W_LwX52E7NF36pq4KuR4Eu3LBIQdlHOHcTUmw6okVrzPsbk2cr7NKJ7PEmnMbM2dYGH9_n1XzJETVpn8gBASYqJiogJiEhISQhICACAAEAAICAgAAQAAwABAAAgAIgAAAAAABACAIAAAAAAAIAAAAAAAIAAAAAAAAAAAAAAAAAAgBAAAEAASAAAACQCACAAgAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAQIAAAAAAA.f_gAAAAAAAAA',
    domain: '.messes.info',
    path: '/',
    expires: Date.now() / 1000 + 365 * 24 * 60 * 60,
  });

  await page.setCookie({
    name: 'didomi_token',
    value: 'eyJ1c2VyX2lkIjoiMTlkMzAwNzUtNTYzNy02YzEzLThjZDUtZGE5ODk0MGFkM2U1IiwiY3JlYXRlZCI6IjIwMjYtMDMtMjdUMTY6MDE6MjAuMjI3WiIsInVwZGF0ZWQiOiIyMDI2LTAzLTI3VDE2OjAxOjIwLjIyOFoiLCJ2ZXJzaW9uIjpudWxsfQ==',
    domain: '.messes.info',
    path: '/',
    expires: Date.now() / 1000 + 365 * 24 * 60 * 60,
  });

  console.log('✅ Cookies injected\n');

  // Charger la page de l'église
  console.log('📄 Loading church page...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 3000));

  // Vérifier si les horaires sont chargés
  const debug = await page.evaluate(() => {
    const doc = (globalThis as any).document;

    const scheduleNodes = doc.querySelectorAll('.egliseinfo-celebrationtime');
    const titleNodes = doc.querySelectorAll('.titre-date');
    const treeNodes = doc.querySelectorAll('.com-google-gwt-user-cellview-client-CellTree-Style-cellTreeItemValue > div');

    const bodyText = doc.body?.innerText || '';
    const hasChargement = bodyText.includes('Chargement en cours');

    return {
      scheduleNodesCount: scheduleNodes.length,
      titleNodesCount: titleNodes.length,
      treeNodesCount: treeNodes.length,
      hasChargement,
      bodyLength: bodyText.length,
      bodyPreview: bodyText.substring(0, 500),
    };
  });

  console.log('📊 Page analysis:');
  console.log(`  - Schedule nodes (.egliseinfo-celebrationtime): ${debug.scheduleNodesCount}`);
  console.log(`  - Title nodes (.titre-date): ${debug.titleNodesCount}`);
  console.log(`  - Tree nodes (all): ${debug.treeNodesCount}`);
  console.log(`  - "Chargement en cours..." present: ${debug.hasChargement ? '❌ YES (GWT not initialized!)' : '✅ NO'}`);
  console.log(`  - Body text length: ${debug.bodyLength} chars`);
  console.log(`\n📝 Body preview:\n${debug.bodyPreview}\n`);

  // Sauvegarder HTML et screenshot
  const html = await page.content();
  const fs = await import('fs');
  const path = await import('path');

  const outputDir = path.join(__dirname, '../../data/debug-church');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = url.split('/').pop() || 'church';
  fs.writeFileSync(path.join(outputDir, `${filename}.html`), html);
  await page.screenshot({ path: path.join(outputDir, `${filename}.png`), fullPage: true });

  console.log(`💾 Saved HTML and screenshot to: ${outputDir}/${filename}.*`);

  await browser.close();
}

// Test avec une église qui DEVRAIT avoir des horaires
const testUrl = process.argv[2] || 'https://www.messes.info/lieu/6-sainte-clothilde';

debugChurch(testUrl)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
