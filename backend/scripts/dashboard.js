#!/usr/bin/env node

/**
 * GodsPlan Monitoring Dashboard CLI
 * Affiche l'état complet du scraping et de la base de données
 */

const { Pool } = require('pg');
require('dotenv').config();

// Configuration de la connexion DB
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'godsplan',
  password: process.env.POSTGRES_PASSWORD || 'godsplan_dev',
  database: process.env.POSTGRES_DB || 'godsplan',
});

// Helpers d'affichage
const formatPercent = (value, total) => {
  if (total === 0) return '0%';
  const percent = ((value / total) * 100).toFixed(0);
  return `${percent}%`;
};

const formatNumber = (num, decimals = 1) => {
  return Number(num).toFixed(decimals);
};

// Requêtes SQL pour les stats
const queries = {
  overview: `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "isActive" = true) as active,
      MAX("updatedAt") as last_update,
      AVG("reliabilityScore")::numeric(10,1) as avg_reliability
    FROM churches
  `,
  
  coordinates: `
    SELECT 
      COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as with_coords,
      COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) as without_coords,
      COUNT(*) FILTER (WHERE latitude = 0 AND longitude = 0) as invalid_coords
    FROM churches
  `,
  
  schedules: `
    SELECT 
      COUNT(*) FILTER (WHERE jsonb_array_length("massSchedules") > 0) as with_schedules,
      COUNT(*) FILTER (WHERE jsonb_array_length("massSchedules") = 0) as without_schedules,
      SUM(jsonb_array_length("massSchedules")) as total_schedules,
      AVG(jsonb_array_length("massSchedules"))::numeric(10,2) as avg_schedules
    FROM churches
  `,
  
  contacts: `
    SELECT 
      COUNT(*) FILTER (WHERE contact->>'phone' IS NOT NULL AND contact->>'phone' != '') as with_phone,
      COUNT(*) FILTER (WHERE contact->>'website' IS NOT NULL AND contact->>'website' != '') as with_website,
      COUNT(*) FILTER (WHERE contact->>'email' IS NOT NULL AND contact->>'email' != '') as with_email,
      COUNT(*) FILTER (WHERE array_length(photos, 1) > 0) as with_photos
    FROM churches
  `,
  
  photos: `
    SELECT 
      COALESCE(SUM(array_length(photos, 1)), 0) as total_photos,
      COALESCE(AVG(array_length(photos, 1)), 0)::numeric(10,1) as avg_photos
    FROM churches
  `,
  
  sources: `
    SELECT 
      COUNT(*) FILTER (
        WHERE jsonb_array_length("dataSources") = 1 
        AND "dataSources"::jsonb @> '[{"type":"messes.info"}]'
      ) as messes_only,
      COUNT(*) FILTER (
        WHERE jsonb_array_length("dataSources") = 1 
        AND "dataSources"::jsonb @> '[{"type":"google-maps"}]'
      ) as google_only,
      COUNT(*) FILTER (
        WHERE jsonb_array_length("dataSources") > 1
      ) as both_sources,
      COUNT(*) FILTER (
        WHERE jsonb_array_length("dataSources") = 0
      ) as no_source
    FROM churches
  `,
  
  topChurches: `
    SELECT 
      name,
      "reliabilityScore",
      jsonb_array_length("massSchedules") as schedules_count,
      array_length(photos, 1) as photos_count
    FROM churches
    ORDER BY "reliabilityScore" DESC
    LIMIT 5
  `,
  
  bottomChurches: `
    SELECT 
      name,
      "reliabilityScore",
      jsonb_array_length("massSchedules") as schedules_count,
      COALESCE(array_length(photos, 1), 0) as photos_count
    FROM churches
    WHERE "isActive" = true
    ORDER BY "reliabilityScore" ASC
    LIMIT 5
  `
};

async function generateDashboard() {
  let client;
  
  try {
    // Connexion à la DB
    client = await pool.connect();

    console.log('\n═══════════════════════════════════════════════');
    console.log('🏛️  GODSPLAN MONITORING DASHBOARD');
    console.log('═══════════════════════════════════════════════\n');

    // Section 1: Vue d'ensemble
    const overview = await client.query(queries.overview);
    const coords = await client.query(queries.coordinates);
    const schedules = await client.query(queries.schedules);
    const contacts = await client.query(queries.contacts);
    const photos = await client.query(queries.photos);
    const sources = await client.query(queries.sources);

    const total = parseInt(overview.rows[0].total);
    const active = parseInt(overview.rows[0].active);
    const lastUpdate = new Date(overview.rows[0].last_update);
    const avgReliability = parseFloat(overview.rows[0].avg_reliability);

    console.log('📊 Base de données');
    console.log(`├─ Total églises       : ${total}`);
    console.log(`├─ Églises actives     : ${active} (${formatPercent(active, total)})`);
    console.log(`├─ Dernière mise à jour : ${lastUpdate.toISOString().split('.')[0].replace('T', ' ')} UTC`);
    console.log(`└─ Score moyen fiabilité : ${formatNumber(avgReliability, 0)}/100\n`);

    const withCoords = parseInt(coords.rows[0].with_coords);
    const withoutCoords = parseInt(coords.rows[0].without_coords);
    const invalidCoords = parseInt(coords.rows[0].invalid_coords);

    console.log('🗺️  Couverture géographique');
    console.log(`├─ Avec coordonnées GPS  : ${withCoords} (${formatPercent(withCoords, total)}) ${withCoords === total ? '✅' : ''}`);
    console.log(`├─ Sans coordonnées      : ${withoutCoords} (${formatPercent(withoutCoords, total)})`);
    console.log(`└─ Coords invalides (0,0) : ${invalidCoords}\n`);

    const withSchedules = parseInt(schedules.rows[0].with_schedules);
    const withoutSchedules = parseInt(schedules.rows[0].without_schedules);
    const totalSchedules = parseInt(schedules.rows[0].total_schedules);
    const avgSchedules = parseFloat(schedules.rows[0].avg_schedules);

    console.log('📅 Horaires de messes');
    console.log(`├─ Églises avec horaires : ${withSchedules} (${formatPercent(withSchedules, total)})`);
    console.log(`├─ Églises sans horaires : ${withoutSchedules} (${formatPercent(withoutSchedules, total)})`);
    console.log(`├─ Total horaires        : ${totalSchedules}`);
    console.log(`└─ Moyenne/église        : ${formatNumber(avgSchedules, 1)} horaires\n`);

    const withPhone = parseInt(contacts.rows[0].with_phone);
    const withWebsite = parseInt(contacts.rows[0].with_website);
    const withEmail = parseInt(contacts.rows[0].with_email);
    const withPhotos = parseInt(contacts.rows[0].with_photos);

    console.log('📞 Informations de contact');
    console.log(`├─ Avec téléphone : ${withPhone} (${formatPercent(withPhone, total)})`);
    console.log(`├─ Avec site web  : ${withWebsite} (${formatPercent(withWebsite, total)})`);
    console.log(`├─ Avec email     : ${withEmail} (${formatPercent(withEmail, total)})`);
    console.log(`└─ Avec photos    : ${withPhotos} (${formatPercent(withPhotos, total)})\n`);

    const totalPhotos = parseInt(photos.rows[0].total_photos);
    const avgPhotos = parseFloat(photos.rows[0].avg_photos);

    console.log('📸 Médias');
    console.log(`├─ Total photos    : ${totalPhotos}`);
    console.log(`└─ Moyenne/église  : ${formatNumber(avgPhotos, 1)} photos\n`);

    const messesOnly = parseInt(sources.rows[0].messes_only);
    const googleOnly = parseInt(sources.rows[0].google_only);
    const bothSources = parseInt(sources.rows[0].both_sources);
    const noSource = parseInt(sources.rows[0].no_source);

    console.log('🔍 Sources de données');
    console.log(`├─ messes.info uniquement : ${messesOnly}`);
    console.log(`├─ Google Maps uniquement : ${googleOnly}`);
    console.log(`├─ Les deux sources       : ${bothSources}`);
    console.log(`└─ Aucune source          : ${noSource}\n`);

    // Section 2: Top/Bottom églises
    const topChurches = await client.query(queries.topChurches);
    const bottomChurches = await client.query(queries.bottomChurches);

    console.log('🏆 Top 5 églises (meilleur score)');
    topChurches.rows.forEach((church, idx) => {
      const schedulesCount = church.schedules_count || 0;
      const photosCount = church.photos_count || 0;
      console.log(`${idx + 1}. ${church.name.padEnd(30)} - Score: ${church.reliabilityScore} - ${schedulesCount} horaires - ${photosCount} photos`);
    });

    console.log('\n⚠️  Bottom 5 églises (plus bas score)');
    bottomChurches.rows.forEach((church, idx) => {
      const schedulesCount = church.schedules_count || 0;
      const photosCount = church.photos_count || 0;
      console.log(`${idx + 1}. ${church.name.padEnd(30)} - Score: ${church.reliabilityScore} - ${schedulesCount} horaires - ${photosCount} photos`);
    });

    // Section 3: Alertes et recommandations
    console.log('\n⚠️  Alertes et actions requises');
    if (withoutSchedules > 0) {
      console.log(`├─ ${withoutSchedules} églises sans horaires (${formatPercent(withoutSchedules, total)})`);
    }
    if (total - withPhone > 0) {
      console.log(`├─ ${total - withPhone} églises sans téléphone (${formatPercent(total - withPhone, total)})`);
    }
    if (total - withPhotos > 0) {
      console.log(`└─ ${total - withPhotos} églises sans photos (${formatPercent(total - withPhotos, total)})`);
    }

    console.log('\n💡 Recommandations');
    const recommendations = [];
    if (total - withPhotos > total * 0.7) {
      recommendations.push('├─ Lancer scraper Google Maps pour enrichir contacts/photos');
    }
    if (withoutSchedules > total * 0.2) {
      recommendations.push('├─ Lancer scraper API messes.info pour compléter horaires');
    }
    if (bottomChurches.rows.filter(c => c.reliabilityScore < 30).length > 0) {
      recommendations.push('└─ Vérifier les églises avec score < 30');
    }
    
    if (recommendations.length === 0) {
      console.log('└─ Aucune action urgente détectée ✅');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }

    console.log('\n═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur lors de la génération du dashboard:', error.message);
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
generateDashboard();
