/**
 * Advanced reliability scoring with temporal decay and dynamic weighting
 */

import { Church } from '../models/Church';
import { ScrapedChurch } from './BaseScraper';
import {
  normalize,
  normalizePhone,
  getHostname,
  fuzzyMatch,
  parseFloatSafe,
  parseIntSafe,
} from './utils/textNormalizer';
import { haversineDistance, areCoordinatesClose } from './utils/addressParser';

export type ConfidenceStatus = 'confirmed' | 'divergent' | 'single_source' | 'missing';

export interface FieldConfidence {
  field: string;
  status: ConfidenceStatus;
  weight: number;
  scoreImpact: number;
  details?: string;
}

export interface ConfidenceReport {
  score: number;
  confirmed: number;
  divergent: number;
  singleSource: number;
  missing: number;
  breakdown: FieldConfidence[];
  temporalDecay: number;
  sourceWeights: Record<string, number>;
}

export interface ConflictResolution {
  field: string;
  messesValue: string;
  googleValue: string;
  recommended: 'messes' | 'google' | 'manual';
  reason: string;
}

/**
 * Field weights configuration (base values)
 */
const FIELD_WEIGHTS = {
  name: 12,
  coordinates: 12,
  street: 10,
  postalCode: 8,
  phone: 8,
  website: 8,
  city: 6,
  massSchedules: 6,
  openingHours: 6,
  rating: 5,
  reviews: 5,
  photos: 4,
} as const;

/**
 * Clamps a value between min and max
 */
const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));

/**
 * Calculates temporal reliability decay based on data age
 *
 * @param lastScraped - Date when data was last scraped
 * @param decayHalfLifeDays - Days until reliability drops to 50% (default: 30)
 * @returns Decay multiplier (0-1)
 *
 * @example
 * ```ts
 * calculateTemporalDecay(new Date('2026-02-17')) // 1 month old
 * // => ~0.5 (50% reliability)
 * ```
 */
export function calculateTemporalDecay(
  lastScraped: Date,
  decayHalfLifeDays: number = 30
): number {
  const ageMs = Date.now() - lastScraped.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 0) {
    return 1.0;
  }

  // Exponential decay: 0.5^(age / halfLife)
  return Math.pow(0.5, ageDays / decayHalfLifeDays);
}

/**
 * Calculates dynamic source weights based on historical reliability
 *
 * @param church - Church entity with dataSources
 * @returns Source weight multipliers
 */
export function calculateSourceWeights(
  church: Church
): Record<string, number> {
  const weights: Record<string, number> = {
    'messes.info': 1.0,
    'google-places': 1.0,
    'google-maps': 1.0,
  };

  if (!church.dataSources || church.dataSources.length === 0) {
    return weights;
  }

  for (const source of church.dataSources) {
    const baseWeight = 0.7; // Minimum weight
    const reliabilityBonus = (source.reliability || 0) / 200; // 0-0.5 bonus

    // Temporal decay for this source
    const decay = source.lastScraped
      ? calculateTemporalDecay(source.lastScraped)
      : 0.5;

    weights[source.name] = clamp(baseWeight + reliabilityBonus * decay, 0.5, 1.5);
  }

  return weights;
}

/**
 * Compares text fields with fuzzy matching and dynamic weighting
 */
function compareTextField(
  field: string,
  weight: number,
  left?: string | null,
  right?: string | null,
  leftWeight: number = 1.0,
  rightWeight: number = 1.0
): FieldConfidence {
  const leftNorm = normalize(left);
  const rightNorm = normalize(right);

  if (leftNorm && rightNorm) {
    const isMatch = fuzzyMatch(leftNorm, rightNorm, 0.8);

    if (isMatch) {
      const avgWeight = (leftWeight + rightWeight) / 2;
      return {
        field,
        weight,
        status: 'confirmed',
        scoreImpact: Math.round(weight * avgWeight),
      };
    }

    const avgWeight = (leftWeight + rightWeight) / 2;
    return {
      field,
      weight,
      status: 'divergent',
      scoreImpact: Math.round(-weight * avgWeight),
      details: `messes="${left}" vs google="${right}"`,
    };
  }

  if (leftNorm) {
    return {
      field,
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4 * leftWeight),
      details: 'present in messes.info only',
    };
  }

  if (rightNorm) {
    return {
      field,
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4 * rightWeight),
      details: 'present in google only',
    };
  }

  return { field, weight, status: 'missing', scoreImpact: 0 };
}

/**
 * Compares coordinates with fuzzy distance matching
 */
function compareCoordinates(
  church: Church,
  google: ScrapedChurch,
  leftWeight: number = 1.0,
  rightWeight: number = 1.0
): FieldConfidence {
  const weight = FIELD_WEIGHTS.coordinates;

  if (
    church.latitude !== undefined &&
    church.longitude !== undefined &&
    google.latitude !== undefined &&
    google.longitude !== undefined
  ) {
    const distance = haversineDistance(
      { latitude: Number(church.latitude), longitude: Number(church.longitude) },
      { latitude: Number(google.latitude), longitude: Number(google.longitude) }
    );

    if (distance <= 150) {
      const avgWeight = (leftWeight + rightWeight) / 2;
      return {
        field: 'coordinates',
        weight,
        status: 'confirmed',
        scoreImpact: Math.round(weight * avgWeight),
        details: `distance=${distance.toFixed(0)}m`,
      };
    }

    if (distance > 500) {
      const avgWeight = (leftWeight + rightWeight) / 2;
      return {
        field: 'coordinates',
        weight,
        status: 'divergent',
        scoreImpact: Math.round(-weight * avgWeight),
        details: `distance=${distance.toFixed(0)}m (too far)`,
      };
    }

    const avgWeight = (leftWeight + rightWeight) / 2;
    return {
      field: 'coordinates',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.5 * avgWeight),
      details: `close but not exact (${distance.toFixed(0)}m)`,
    };
  }

  if (church.latitude !== undefined || google.latitude !== undefined) {
    const presentWeight = church.latitude !== undefined ? leftWeight : rightWeight;
    return {
      field: 'coordinates',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4 * presentWeight),
    };
  }

  return { field: 'coordinates', weight, status: 'missing', scoreImpact: 0 };
}

/**
 * Compares phone numbers with flexible matching
 */
function comparePhone(
  church: Church,
  google: ScrapedChurch,
  leftWeight: number = 1.0,
  rightWeight: number = 1.0
): FieldConfidence {
  const weight = FIELD_WEIGHTS.phone;
  const left = normalizePhone(church.contact?.phone);
  const right = normalizePhone(google.contact?.phone);

  if (left && right) {
    const isMatch =
      left === right ||
      left.endsWith(right) ||
      right.endsWith(left) ||
      left.replace(/^0/, '+33') === right ||
      right.replace(/^0/, '+33') === left;

    if (isMatch) {
      const avgWeight = (leftWeight + rightWeight) / 2;
      return {
        field: 'phone',
        weight,
        status: 'confirmed',
        scoreImpact: Math.round(weight * avgWeight),
      };
    }

    const avgWeight = (leftWeight + rightWeight) / 2;
    return {
      field: 'phone',
      weight,
      status: 'divergent',
      scoreImpact: Math.round(-weight * avgWeight),
      details: `messes="${church.contact?.phone}" vs google="${google.contact?.phone}"`,
    };
  }

  if (left) {
    return {
      field: 'phone',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4 * leftWeight),
    };
  }

  if (right) {
    return {
      field: 'phone',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4 * rightWeight),
    };
  }

  return { field: 'phone', weight, status: 'missing', scoreImpact: 0 };
}

/**
 * Compares website URLs with hostname matching
 */
function compareWebsite(
  church: Church,
  google: ScrapedChurch,
  leftWeight: number = 1.0,
  rightWeight: number = 1.0
): FieldConfidence {
  const weight = FIELD_WEIGHTS.website;
  const left = getHostname(church.contact?.website);
  const right = getHostname(google.contact?.website);

  if (left && right) {
    if (left === right) {
      const avgWeight = (leftWeight + rightWeight) / 2;
      return {
        field: 'website',
        weight,
        status: 'confirmed',
        scoreImpact: Math.round(weight * avgWeight),
      };
    }

    const avgWeight = (leftWeight + rightWeight) / 2;
    return {
      field: 'website',
      weight,
      status: 'divergent',
      scoreImpact: Math.round(-weight * avgWeight),
      details: `messes="${left}" vs google="${right}"`,
    };
  }

  if (left) {
    return {
      field: 'website',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4 * leftWeight),
    };
  }

  if (right) {
    return {
      field: 'website',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4 * rightWeight),
    };
  }

  return { field: 'website', weight, status: 'missing', scoreImpact: 0 };
}

/**
 * Calculates cross-source confidence with temporal decay and dynamic weighting
 *
 * @param church - Church entity from database
 * @param google - Scraped data from Google
 * @returns Comprehensive confidence report
 */
export function calculateCrossSourceConfidence(
  church: Church,
  google: ScrapedChurch
): ConfidenceReport {
  const sourceWeights = calculateSourceWeights(church);
  const messesWeight = sourceWeights['messes.info'] || 1.0;
  const googleWeight = sourceWeights['google-maps'] || sourceWeights['google-places'] || 1.0;

  const breakdown: FieldConfidence[] = [];

  // Core identity fields
  breakdown.push(
    compareTextField('name', FIELD_WEIGHTS.name, church.name, google.name, messesWeight, googleWeight)
  );

  // Address fields
  breakdown.push(
    compareTextField(
      'street',
      FIELD_WEIGHTS.street,
      church.address?.street,
      google.address.street,
      messesWeight,
      googleWeight
    )
  );
  breakdown.push(
    compareTextField(
      'postalCode',
      FIELD_WEIGHTS.postalCode,
      church.address?.postalCode,
      google.address.postalCode,
      messesWeight,
      googleWeight
    )
  );
  breakdown.push(
    compareTextField(
      'city',
      FIELD_WEIGHTS.city,
      church.address?.city,
      google.address.city,
      messesWeight,
      googleWeight
    )
  );

  // Geolocation
  breakdown.push(compareCoordinates(church, google, messesWeight, googleWeight));

  // Contact info
  breakdown.push(comparePhone(church, google, messesWeight, googleWeight));
  breakdown.push(compareWebsite(church, google, messesWeight, googleWeight));

  // Mass schedules (messes.info only)
  breakdown.push({
    field: 'massSchedules',
    weight: FIELD_WEIGHTS.massSchedules,
    status: church.massSchedules?.length ? 'single_source' : 'missing',
    scoreImpact: church.massSchedules?.length
      ? Math.round(FIELD_WEIGHTS.massSchedules * 0.5 * messesWeight)
      : 0,
    details: church.massSchedules?.length ? `${church.massSchedules.length} schedules` : undefined,
  });

  // Google-specific enrichment fields
  breakdown.push({
    field: 'openingHours',
    weight: FIELD_WEIGHTS.openingHours,
    status: google.openingHours?.length ? 'single_source' : 'missing',
    scoreImpact: google.openingHours?.length
      ? Math.round(FIELD_WEIGHTS.openingHours * 0.5 * googleWeight)
      : 0,
    details: google.openingHours?.length ? `${google.openingHours.length} days` : undefined,
  });

  breakdown.push({
    field: 'rating',
    weight: FIELD_WEIGHTS.rating,
    status: google.rating !== undefined ? 'single_source' : 'missing',
    scoreImpact: google.rating !== undefined
      ? Math.round(FIELD_WEIGHTS.rating * 0.4 * googleWeight)
      : 0,
    details:
      google.rating !== undefined
        ? `${google.rating}/5 (${google.userRatingsTotal ?? 0} avis)`
        : undefined,
  });

  breakdown.push({
    field: 'reviews',
    weight: FIELD_WEIGHTS.reviews,
    status: google.reviews?.length ? 'single_source' : 'missing',
    scoreImpact: google.reviews?.length
      ? Math.round(FIELD_WEIGHTS.reviews * 0.4 * googleWeight)
      : 0,
    details: google.reviews?.length ? `${google.reviews.length} reviews` : undefined,
  });

  breakdown.push({
    field: 'photos',
    weight: FIELD_WEIGHTS.photos,
    status: google.photos?.length ? 'single_source' : 'missing',
    scoreImpact: google.photos?.length
      ? Math.round(FIELD_WEIGHTS.photos * 0.4 * googleWeight)
      : 0,
    details: google.photos?.length ? `${google.photos.length} photos` : undefined,
  });

  // Calculate aggregate stats
  const confirmed = breakdown.filter((item) => item.status === 'confirmed').length;
  const divergent = breakdown.filter((item) => item.status === 'divergent').length;
  const singleSource = breakdown.filter((item) => item.status === 'single_source').length;
  const missing = breakdown.filter((item) => item.status === 'missing').length;

  // Weighted score calculation
  const totalWeight = breakdown.reduce((sum, item) => sum + item.weight, 0);
  const totalImpact = breakdown.reduce((sum, item) => sum + item.scoreImpact, 0);

  const rawScore = totalWeight ? ((totalImpact + totalWeight) / (2 * totalWeight)) * 100 : 0;

  // Apply temporal decay
  const messesSource = church.dataSources?.find((s) => s.name === 'messes.info');
  const googleSource = church.dataSources?.find(
    (s) => s.name === 'google-maps' || s.name === 'google-places'
  );

  const messesDecay = messesSource?.lastScraped
    ? calculateTemporalDecay(messesSource.lastScraped)
    : 0.8;
  const googleDecay = googleSource?.lastScraped
    ? calculateTemporalDecay(googleSource.lastScraped)
    : 1.0;

  const avgDecay = (messesDecay + googleDecay) / 2;
  const score = clamp(Math.round(rawScore * avgDecay));

  return {
    score,
    confirmed,
    divergent,
    singleSource,
    missing,
    breakdown,
    temporalDecay: avgDecay,
    sourceWeights,
  };
}

/**
 * Calculates source completeness (0-100)
 */
export function calculateSourceCompleteness(
  source: 'messes.info' | 'google-places' | 'google-maps',
  church: Church,
  google?: ScrapedChurch
): number {
  if (source === 'messes.info') {
    const checks = [
      Boolean(church.name),
      Boolean(church.address?.street),
      Boolean(church.address?.postalCode),
      Boolean(church.address?.city),
      church.latitude !== undefined && church.longitude !== undefined,
      Boolean(church.contact?.phone || church.contact?.website),
      Boolean(church.massSchedules?.length),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  const checks = [
    Boolean(google?.name),
    Boolean(google?.address.street),
    Boolean(google?.address.postalCode),
    Boolean(google?.address.city),
    google?.latitude !== undefined && google?.longitude !== undefined,
    Boolean(google?.contact?.phone || google?.contact?.website),
    Boolean(google?.openingHours?.length),
    google?.rating !== undefined,
    Boolean(google?.photos?.length),
    Boolean(google?.reviews?.length),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/**
 * Detects conflicts and suggests resolution strategy
 *
 * @param report - Confidence report with field breakdown
 * @param church - Church entity
 * @param google - Google scraped data
 * @returns List of conflicts with resolution recommendations
 */
export function detectConflicts(
  report: ConfidenceReport,
  church: Church,
  google: ScrapedChurch
): ConflictResolution[] {
  const conflicts: ConflictResolution[] = [];

  const divergentFields = report.breakdown.filter((f) => f.status === 'divergent');

  for (const field of divergentFields) {
    let messesValue = '';
    let googleValue = '';
    let recommended: 'messes' | 'google' | 'manual' = 'manual';
    let reason = 'Manual review required';

    switch (field.field) {
      case 'name':
        messesValue = church.name || '';
        googleValue = google.name || '';
        // Favor messes.info for church names (more canonical)
        recommended = 'messes';
        reason = 'messes.info typically has canonical church names';
        break;

      case 'phone':
        messesValue = church.contact?.phone || '';
        googleValue = google.contact?.phone || '';
        // Favor Google for phone (more up-to-date)
        recommended = 'google';
        reason = 'Google phone numbers are usually more current';
        break;

      case 'website':
        messesValue = church.contact?.website || '';
        googleValue = google.contact?.website || '';
        // Favor Google for websites
        recommended = 'google';
        reason = 'Google websites are usually verified';
        break;

      case 'coordinates':
        messesValue = `${church.latitude},${church.longitude}`;
        googleValue = `${google.latitude},${google.longitude}`;
        // Favor Google for coordinates
        recommended = 'google';
        reason = 'Google Maps coordinates are highly accurate';
        break;

      default:
        messesValue = String((church as any)[field.field] || '');
        googleValue = String((google as any)[field.field] || '');
    }

    conflicts.push({
      field: field.field,
      messesValue,
      googleValue,
      recommended,
      reason,
    });
  }

  return conflicts;
}
