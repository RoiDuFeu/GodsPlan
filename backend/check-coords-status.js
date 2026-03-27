#!/usr/bin/env node

/**
 * Quick check of churches coordinates coverage
 */

const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'godsplan',
  password: process.env.POSTGRES_PASSWORD || 'godsplan_dev',
  database: process.env.POSTGRES_DB || 'godsplan',
  synchronize: false,
  logging: false,
});

async function checkCoords() {
  await AppDataSource.initialize();

  const result = await AppDataSource.query(`
    SELECT 
      COUNT(*) as total_churches,
      COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as missing_coords,
      COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coords,
      ROUND(100.0 * COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) / COUNT(*), 2) as coverage_pct
    FROM churches;
  `);

  const stats = result[0];

  console.log('\n📊 Churches Coordinates Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Total churches: ${stats.total_churches}`);
  console.log(`   ✅ With coords: ${stats.has_coords}`);
  console.log(`   ❌ Missing coords: ${stats.missing_coords}`);
  console.log(`   📈 Coverage: ${stats.coverage_pct}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Sample of churches without coords
  if (parseInt(stats.missing_coords) > 0) {
    const samples = await AppDataSource.query(`
      SELECT name, address->>'street' as street, address->>'city' as city, address->>'postalCode' as postal
      FROM churches
      WHERE latitude IS NULL OR longitude IS NULL
      LIMIT 5;
    `);

    console.log('🔍 Sample of churches without coordinates:');
    samples.forEach((church, i) => {
      console.log(`   ${i + 1}. ${church.name}`);
      console.log(`      ${church.street}, ${church.postal} ${church.city}`);
    });
    console.log();
  }

  await AppDataSource.destroy();
}

checkCoords().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
