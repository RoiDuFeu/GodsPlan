#!/usr/bin/env node

/**
 * GodsPlan Stats Generator
 * Génère un fichier JSON avec les statistiques de la base de données
 * Usage: node scripts/generate-stats.js [output-file]
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuration de la connexion DB
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'godsplan',
  password: process.env.POSTGRES_PASSWORD || 'godsplan_dev',
  database: process.env.POSTGRES_DB || 'godsplan',
});

// Requêtes SQL pour les stats
const queries = {
  overview: `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "isActive" = true) as active,
      AVG("reliabilityScore")::numeric(10,1) as avg_reliability
    FROM churches
  `,
  
  coverage: `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as with_coords,
      COUNT(*) FILTER (WHERE jsonb_array_length("massSchedules") > 0) as with_schedules,
      COUNT(*) FILTER (WHERE contact->>'phone' IS NOT NULL AND contact->>'phone' != '') as with_phone,
      COUNT(*) FILTER (WHERE contact->>'website' IS NOT NULL AND contact->>'website' != '') as with_website,
      COUNT(*) FILTER (WHERE array_length(photos, 1) > 0) as with_photos
    FROM churches
  `,
  
  averages: `
    SELECT 
      AVG(jsonb_array_length("massSchedules"))::numeric(10,2) as avg_schedules,
      COALESCE(AVG(array_length(photos, 1)), 0)::numeric(10,1) as avg_photos
    FROM churches
  `,
  
  sources: `
    SELECT 
      COUNT(*) FILTER (
        WHERE "dataSources"::jsonb @> '[{"type":"messes.info"}]'
      ) as messes_info_count,
      COUNT(*) FILTER (
        WHERE "dataSources"::jsonb @> '[{"type":"google-maps"}]'
      ) as google_maps_count,
      COUNT(*) FILTER (
        WHERE jsonb_array_length("dataSources") > 1
      ) as both_sources
    FROM churches
  `
};

async function generateStats() {
  let client;
  
  try {
    // Connexion à la DB
    client = await pool.connect();

    // Récupération des stats
    const overview = await client.query(queries.overview);
    const coverage = await client.query(queries.coverage);
    const averages = await client.query(queries.averages);
    const sources = await client.query(queries.sources);

    const total = parseInt(overview.rows[0].total);
    const totalCoverage = parseInt(coverage.rows[0].total);

    const stats = {
      timestamp: new Date().toISOString(),
      total: total,
      active: parseInt(overview.rows[0].active),
      coverage: {
        coordinates: totalCoverage === 0 ? 0 : parseFloat((coverage.rows[0].with_coords / totalCoverage).toFixed(2)),
        schedules: totalCoverage === 0 ? 0 : parseFloat((coverage.rows[0].with_schedules / totalCoverage).toFixed(2)),
        phone: totalCoverage === 0 ? 0 : parseFloat((coverage.rows[0].with_phone / totalCoverage).toFixed(2)),
        website: totalCoverage === 0 ? 0 : parseFloat((coverage.rows[0].with_website / totalCoverage).toFixed(2)),
        photos: totalCoverage === 0 ? 0 : parseFloat((coverage.rows[0].with_photos / totalCoverage).toFixed(2))
      },
      avgSchedulesPerChurch: parseFloat(averages.rows[0].avg_schedules),
      avgPhotosPerChurch: parseFloat(averages.rows[0].avg_photos),
      avgReliabilityScore: parseFloat(overview.rows[0].avg_reliability),
      sources: {
        'messes.info': parseInt(sources.rows[0].messes_info_count),
        'google-maps': parseInt(sources.rows[0].google_maps_count),
        both: parseInt(sources.rows[0].both_sources)
      }
    };

    // Détermination du chemin de sortie
    const outputFile = process.argv[2] || path.join(
      __dirname,
      '../data',
      `stats-${new Date().toISOString().split('T')[0]}.json`
    );

    // Création du dossier data si nécessaire
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Écriture du fichier
    fs.writeFileSync(outputFile, JSON.stringify(stats, null, 2), 'utf8');

    console.log(`✅ Statistiques générées: ${outputFile}`);
    console.log(JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('❌ Erreur lors de la génération des stats:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    process.exit(0);
  }
}

// Exécution
generateStats();
