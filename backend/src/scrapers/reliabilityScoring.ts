import { Church } from '../models/Church';
import { ScrapedChurch } from './BaseScraper';

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
}

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));

const normalize = (value?: string | null): string =>
  (value || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizePhone = (value?: string | null): string =>
  (value || '').replace(/[^+\d]/g, '');

const getHostname = (url?: string): string => {
  if (!url) {
    return '';
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const haversineDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function compareTextField(
  field: string,
  weight: number,
  left?: string | null,
  right?: string | null
): FieldConfidence {
  const leftNorm = normalize(left);
  const rightNorm = normalize(right);

  if (leftNorm && rightNorm) {
    const isMatch =
      leftNorm === rightNorm ||
      leftNorm.includes(rightNorm) ||
      rightNorm.includes(leftNorm);

    if (isMatch) {
      return { field, weight, status: 'confirmed', scoreImpact: weight };
    }

    return {
      field,
      weight,
      status: 'divergent',
      scoreImpact: -weight,
      details: `messes="${left}" vs google="${right}"`,
    };
  }

  if (leftNorm || rightNorm) {
    return {
      field,
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4),
      details: leftNorm ? 'present in messes.info only' : 'present in google only',
    };
  }

  return { field, weight, status: 'missing', scoreImpact: 0 };
}

function compareCoordinates(church: Church, google: ScrapedChurch): FieldConfidence {
  const weight = 12;
  if (
    church.latitude !== undefined &&
    church.longitude !== undefined &&
    google.latitude !== undefined &&
    google.longitude !== undefined
  ) {
    const distance = haversineDistanceMeters(
      Number(church.latitude),
      Number(church.longitude),
      Number(google.latitude),
      Number(google.longitude)
    );

    if (distance <= 150) {
      return {
        field: 'coordinates',
        weight,
        status: 'confirmed',
        scoreImpact: weight,
        details: `distance=${distance.toFixed(0)}m`,
      };
    }

    if (distance > 500) {
      return {
        field: 'coordinates',
        weight,
        status: 'divergent',
        scoreImpact: -weight,
        details: `distance=${distance.toFixed(0)}m`,
      };
    }

    return {
      field: 'coordinates',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4),
      details: `close but not exact (${distance.toFixed(0)}m)`,
    };
  }

  if (
    church.latitude !== undefined ||
    church.longitude !== undefined ||
    google.latitude !== undefined ||
    google.longitude !== undefined
  ) {
    return {
      field: 'coordinates',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4),
    };
  }

  return { field: 'coordinates', weight, status: 'missing', scoreImpact: 0 };
}

function comparePhone(church: Church, google: ScrapedChurch): FieldConfidence {
  const weight = 8;
  const left = normalizePhone(church.contact?.phone);
  const right = normalizePhone(google.contact?.phone);

  if (left && right) {
    if (left === right || left.endsWith(right) || right.endsWith(left)) {
      return { field: 'phone', weight, status: 'confirmed', scoreImpact: weight };
    }

    return {
      field: 'phone',
      weight,
      status: 'divergent',
      scoreImpact: -weight,
      details: `messes="${church.contact?.phone}" vs google="${google.contact?.phone}"`,
    };
  }

  if (left || right) {
    return {
      field: 'phone',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4),
    };
  }

  return { field: 'phone', weight, status: 'missing', scoreImpact: 0 };
}

function compareWebsite(church: Church, google: ScrapedChurch): FieldConfidence {
  const weight = 8;
  const left = getHostname(church.contact?.website);
  const right = getHostname(google.contact?.website);

  if (left && right) {
    if (left === right) {
      return { field: 'website', weight, status: 'confirmed', scoreImpact: weight };
    }

    return {
      field: 'website',
      weight,
      status: 'divergent',
      scoreImpact: -weight,
      details: `messes="${left}" vs google="${right}"`,
    };
  }

  if (left || right) {
    return {
      field: 'website',
      weight,
      status: 'single_source',
      scoreImpact: Math.round(weight * 0.4),
    };
  }

  return { field: 'website', weight, status: 'missing', scoreImpact: 0 };
}

export function calculateCrossSourceConfidence(
  church: Church,
  google: ScrapedChurch
): ConfidenceReport {
  const breakdown: FieldConfidence[] = [];

  breakdown.push(compareTextField('name', 12, church.name, google.name));
  breakdown.push(compareTextField('street', 10, church.address?.street, google.address.street));
  breakdown.push(compareTextField('postalCode', 8, church.address?.postalCode, google.address.postalCode));
  breakdown.push(compareTextField('city', 6, church.address?.city, google.address.city));
  breakdown.push(compareCoordinates(church, google));
  breakdown.push(comparePhone(church, google));
  breakdown.push(compareWebsite(church, google));

  breakdown.push({
    field: 'massSchedules',
    weight: 6,
    status: church.massSchedules?.length ? 'single_source' : 'missing',
    scoreImpact: church.massSchedules?.length ? 3 : 0,
    details: church.massSchedules?.length
      ? 'present in messes.info'
      : undefined,
  });

  breakdown.push({
    field: 'openingHours',
    weight: 6,
    status: google.openingHours?.length ? 'single_source' : 'missing',
    scoreImpact: google.openingHours?.length ? 3 : 0,
    details: google.openingHours?.length ? 'present in google' : undefined,
  });

  breakdown.push({
    field: 'rating',
    weight: 5,
    status: google.rating !== undefined ? 'single_source' : 'missing',
    scoreImpact: google.rating !== undefined ? 2 : 0,
    details:
      google.rating !== undefined
        ? `google=${google.rating} (${google.userRatingsTotal ?? 0} avis)`
        : undefined,
  });

  breakdown.push({
    field: 'reviews',
    weight: 5,
    status: google.reviews?.length ? 'single_source' : 'missing',
    scoreImpact: google.reviews?.length ? 2 : 0,
    details: google.reviews?.length
      ? `${google.reviews.length} avis collectés`
      : undefined,
  });

  breakdown.push({
    field: 'photos',
    weight: 4,
    status: google.photos?.length ? 'single_source' : 'missing',
    scoreImpact: google.photos?.length ? 2 : 0,
    details: google.photos?.length ? `${google.photos.length} photos google` : undefined,
  });

  const confirmed = breakdown.filter((item) => item.status === 'confirmed').length;
  const divergent = breakdown.filter((item) => item.status === 'divergent').length;
  const singleSource = breakdown.filter((item) => item.status === 'single_source').length;
  const missing = breakdown.filter((item) => item.status === 'missing').length;

  const statusFactor: Record<ConfidenceStatus, number> = {
    confirmed: 1,
    divergent: 0,
    single_source: 0.55,
    missing: 0.25,
  };

  const totalWeight = breakdown.reduce((sum, item) => sum + item.weight, 0);
  const weighted = breakdown.reduce(
    (sum, item) => sum + item.weight * statusFactor[item.status],
    0
  );
  const score = totalWeight ? clamp(Math.round((weighted / totalWeight) * 100)) : 0;

  return {
    score,
    confirmed,
    divergent,
    singleSource,
    missing,
    breakdown,
  };
}

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
