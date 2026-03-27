/**
 * Script temporaire pour reverse-engineer l'API GWT de messes.info
 * Capture toutes les requêtes /gwtRequest avec leurs payloads
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  postData: string;
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
}

async function captureGwtRequests() {
  const captured: CapturedRequest[] = [];
  const outputDir = path.join(__dirname, '../../data/gwt-api-analysis');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🚀 Lancement du browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();
  
  // Intercepter les requêtes
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    if (request.url().includes('/gwtRequest')) {
      const headers: Record<string, string> = {};
      Object.entries(request.headers()).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });

      captured.push({
        url: request.url(),
        method: request.method(),
        headers,
        postData: request.postData() || '',
      });

      console.log(`\n📤 REQUEST /gwtRequest`);
      console.log(`Headers:`, JSON.stringify(headers, null, 2));
      console.log(`Post Data (first 200 chars):`, request.postData()?.substring(0, 200));
    }
    
    request.continue();
  });

  page.on('response', async (response) => {
    if (!response.url().includes('/gwtRequest')) {
      return;
    }

    try {
      const body = await response.text();
      const headers: Record<string, string> = {};
      Object.entries(response.headers()).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });

      // Trouver la requête correspondante
      const matchingRequest = captured.find(
        (req) => req.url === response.url() && !req.response
      );

      if (matchingRequest) {
        matchingRequest.response = {
          status: response.status(),
          headers,
          body,
        };

        console.log(`\n📥 RESPONSE /gwtRequest`);
        console.log(`Status:`, response.status());
        console.log(`Body (first 500 chars):`, body.substring(0, 500));
      }
    } catch (error) {
      console.error('Erreur parsing response:', error);
    }
  });

  console.log('🌐 Navigation vers la page annuaire Paris...');
  await page.goto('https://www.messes.info/annuaire/75', {
    waitUntil: 'networkidle2',
    timeout: 120000,
  });

  console.log('⏳ Attente du chargement complet...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Cliquer sur "Suite" pour déclencher plus de requêtes
  console.log('🔄 Tentative de clic sur "Suite"...');
  try {
    const suiteButton = await page.$$('button.gwt-Button');
    for (const button of suiteButton) {
      const text = await button.evaluate((el: any) => el.textContent?.trim() || '');
      if (text.toLowerCase().startsWith('suite')) {
        await button.click();
        console.log('✅ Clic sur Suite effectué');
        await new Promise((resolve) => setTimeout(resolve, 3000));
        break;
      }
    }
  } catch (error) {
    console.log('⚠️ Pas de bouton Suite trouvé');
  }

  // Navigation vers une page de détail d'église
  console.log('🏛️ Navigation vers une page de détail...');
  await page.goto('https://www.messes.info/lieu/6-sainte-clothilde', {
    waitUntil: 'networkidle2',
    timeout: 120000,
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Sauvegarder les captures
  console.log(`\n💾 Sauvegarde de ${captured.length} requêtes capturées...`);
  
  captured.forEach((req, index) => {
    const filename = path.join(outputDir, `request-${index + 1}.json`);
    fs.writeFileSync(filename, JSON.stringify(req, null, 2));
    console.log(`✅ Sauvegardé: ${filename}`);
  });

  // Générer un rapport d'analyse
  const report = generateAnalysisReport(captured);
  fs.writeFileSync(
    path.join(outputDir, 'ANALYSIS.md'),
    report
  );

  console.log(`\n📊 Rapport d'analyse généré: ${outputDir}/ANALYSIS.md`);
  console.log(`\n✅ Capture terminée. Fermeture du browser dans 5 secondes...`);
  
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await browser.close();
}

function generateAnalysisReport(captured: CapturedRequest[]): string {
  const report: string[] = [
    '# Analyse de l\'API GWT messes.info',
    '',
    `Date: ${new Date().toISOString()}`,
    `Nombre de requêtes capturées: ${captured.length}`,
    '',
    '## Requêtes capturées',
    '',
  ];

  captured.forEach((req, index) => {
    report.push(`### Requête ${index + 1}`);
    report.push('');
    report.push('**URL:**', '```', req.url, '```', '');
    report.push('**Method:**', req.method, '');
    report.push('');
    report.push('**Headers importants:**');
    report.push('```json');
    report.push(JSON.stringify({
      'Content-Type': req.headers['content-type'],
      'X-GWT-Permutation': req.headers['x-gwt-permutation'],
      'X-GWT-Module-Base': req.headers['x-gwt-module-base'],
    }, null, 2));
    report.push('```');
    report.push('');
    report.push('**Post Data (200 premiers caractères):**');
    report.push('```');
    report.push(req.postData.substring(0, 200));
    report.push('```');
    report.push('');

    if (req.response) {
      report.push('**Response Status:**', req.response.status.toString(), '');
      report.push('**Response Body (500 premiers caractères):**');
      report.push('```');
      report.push(req.response.body.substring(0, 500));
      report.push('```');
      report.push('');
    }

    report.push('---');
    report.push('');
  });

  // Analyse des patterns
  report.push('## Patterns identifiés');
  report.push('');

  const contentTypes = new Set(captured.map((r) => r.headers['content-type']));
  report.push('**Content-Types:**');
  contentTypes.forEach((ct) => report.push(`- ${ct}`));
  report.push('');

  const permutations = new Set(
    captured.map((r) => r.headers['x-gwt-permutation']).filter(Boolean)
  );
  report.push('**X-GWT-Permutation values:**');
  permutations.forEach((p) => report.push(`- ${p}`));
  report.push('');

  const moduleBases = new Set(
    captured.map((r) => r.headers['x-gwt-module-base']).filter(Boolean)
  );
  report.push('**X-GWT-Module-Base values:**');
  moduleBases.forEach((mb) => report.push(`- ${mb}`));
  report.push('');

  return report.join('\n');
}

// Exécution
captureGwtRequests()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
