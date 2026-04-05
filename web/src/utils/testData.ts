/**
 * testData.ts
 * 
 * Generate test church data for clustering performance testing
 * 
 * Usage in component:
 *   import { generateTestChurches } from '@/utils/testData';
 *   const testChurches = generateTestChurches(200);
 */

import type { ChurchListItem } from '@/lib/types';

interface TestChurchOptions {
  center?: { lat: number; lng: number };
  radius?: number; // km
  reliabilityRange?: [number, number];
  seed?: number; // for reproducible random data
}

// Seeded random number generator for reproducibility
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Generate realistic test church data
 * 
 * @param count - Number of churches to generate
 * @param options - Configuration options
 * @returns Array of ChurchListItem
 */
export function generateTestChurches(
  count: number,
  options: TestChurchOptions = {}
): ChurchListItem[] {
  const {
    center = { lat: 48.8566, lng: 2.3522 }, // Paris
    radius = 10, // 10km radius
    reliabilityRange = [30, 100],
    seed = 42,
  } = options;

  const rng = new SeededRandom(seed);
  const churches: ChurchListItem[] = [];

  // Paris arrondissements and neighborhoods for realistic names
  const arrondissements = [
    '1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e',
    '11e', '12e', '13e', '14e', '15e', '16e', '17e', '18e', '19e', '20e',
  ];

  const saintNames = [
    'Jean', 'Pierre', 'Paul', 'Marie', 'Joseph', 'Louis', 'François',
    'Étienne', 'Martin', 'Denis', 'Thomas', 'Jacques', 'Michel', 'Nicolas',
    'Antoine', 'Vincent', 'Bernard', 'Germain', 'Roch', 'Sébastien',
    'Laurent', 'Augustin', 'Grégoire', 'Sulpice', 'Eustache', 'Honoré',
  ];

  const churchTypes = [
    'Église', 'Basilique', 'Cathédrale', 'Chapelle', 'Sanctuaire',
  ];

  for (let i = 0; i < count; i++) {
    // Generate random point within radius using uniform distribution
    const angle = rng.next() * 2 * Math.PI;
    const distance = Math.sqrt(rng.next()) * radius; // sqrt for uniform area distribution

    // Convert to lat/lng offset (approximate)
    const latOffset = (distance * Math.cos(angle)) / 111; // 1 degree lat ≈ 111km
    const lngOffset = (distance * Math.sin(angle)) / (111 * Math.cos(center.lat * Math.PI / 180));

    const lat = center.lat + latOffset;
    const lng = center.lng + lngOffset;

    // Generate church name
    const type = churchTypes[Math.floor(rng.next() * churchTypes.length)];
    const saint = saintNames[Math.floor(rng.next() * saintNames.length)];
    const name = `${type} Saint-${saint}`;

    // Generate arrondissement
    const arrondissement = arrondissements[Math.floor(rng.next() * arrondissements.length)];
    const streetNumber = Math.floor(rng.range(1, 200));
    const streetNames = ['Rue de la Paix', 'Avenue des Champs', 'Boulevard Saint-Michel', 'Rue du Temple'];
    const street = `${streetNumber} ${streetNames[Math.floor(rng.next() * streetNames.length)]}`;

    churches.push({
      id: `test-church-${i + 1}`,
      name: name,
      address: {
        street: street,
        city: 'Paris',
        postalCode: `750${arrondissement.replace(/\D/g, '').padStart(2, '0')}`,
        district: `${arrondissement} arrondissement`,
      },
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
      reliabilityScore: rng.range(reliabilityRange[0], reliabilityRange[1]),
      // Optional: calculate distance if userLocation is provided
      // distance: calculateDistance(userLocation.lat, userLocation.lng, lat, lng),
    });
  }

  return churches;
}

/**
 * Generate test data for admin map (includes score)
 */
export function generateTestChurchesForAdmin(
  count: number,
  options: TestChurchOptions = {}
) {
  const churches = generateTestChurches(count, options);
  return churches.map(church => ({
    id: church.id,
    name: church.name,
    lat: parseFloat(church.latitude),
    lng: parseFloat(church.longitude),
    score: church.reliabilityScore,
    schedulesCount: Math.floor(Math.random() * 20) + 1, // 1-20 schedules
    phone: Math.random() > 0.5 ? `+33 1 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)}` : null,
  }));
}

/**
 * Generate clustered churches (simulate real-world clustering around neighborhoods)
 */
export function generateClusteredChurches(
  clusterCount: number = 5,
  churchesPerCluster: number = 20,
  options: TestChurchOptions = {}
): ChurchListItem[] {
  const {
    center = { lat: 48.8566, lng: 2.3522 },
    radius = 10,
    reliabilityRange = [30, 100],
    seed = 42,
  } = options;

  const rng = new SeededRandom(seed);
  const churches: ChurchListItem[] = [];

  // Generate cluster centers
  for (let c = 0; c < clusterCount; c++) {
    const angle = (c / clusterCount) * 2 * Math.PI;
    const distance = rng.range(2, radius);
    
    const clusterLat = center.lat + (distance * Math.cos(angle)) / 111;
    const clusterLng = center.lng + (distance * Math.sin(angle)) / (111 * Math.cos(center.lat * Math.PI / 180));

    // Generate churches around this cluster center
    const clusterChurches = generateTestChurches(churchesPerCluster, {
      center: { lat: clusterLat, lng: clusterLng },
      radius: 0.5, // Small cluster radius
      reliabilityRange,
      seed: seed + c * 100,
    });

    churches.push(...clusterChurches);
  }

  return churches;
}

/**
 * Performance testing scenarios
 */
export const TEST_SCENARIOS = {
  small: {
    name: 'Small dataset (no clustering needed)',
    churches: () => generateTestChurches(10),
    expectedClusters: 0,
  },
  medium: {
    name: 'Medium dataset (light clustering)',
    churches: () => generateTestChurches(50),
    expectedClusters: 5-10,
  },
  large: {
    name: 'Large dataset (heavy clustering)',
    churches: () => generateTestChurches(200),
    expectedClusters: 20-40,
  },
  extreme: {
    name: 'Extreme dataset (stress test)',
    churches: () => generateTestChurches(1000),
    expectedClusters: 50-100,
  },
  clustered: {
    name: 'Real-world clustering (5 neighborhoods)',
    churches: () => generateClusteredChurches(5, 30),
    expectedClusters: 5-15,
  },
  nationwide: {
    name: 'Nationwide simulation (all France)',
    churches: () => generateTestChurches(5000, {
      center: { lat: 46.603354, lng: 1.888334 }, // Center of France
      radius: 500, // 500km radius
    }),
    expectedClusters: 100-200,
  },
};

/**
 * Toggle between test and production data
 */
export const USE_TEST_DATA = false; // Set to true to enable test data globally

/**
 * Example usage in component:
 * 
 * ```tsx
 * import { generateTestChurches, TEST_SCENARIOS } from '@/utils/testData';
 * 
 * // In your component
 * const [useTestData, setUseTestData] = useState(false);
 * const churches = useTestData 
 *   ? TEST_SCENARIOS.large.churches()
 *   : realChurchesFromAPI;
 * 
 * // Add a dev toggle button
 * <button onClick={() => setUseTestData(!useTestData)}>
 *   {useTestData ? 'Real Data' : 'Test Data'}
 * </button>
 * ```
 */
