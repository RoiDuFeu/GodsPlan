/**
 * Address parsing and geocoding utilities
 */

import { ParsedAddress, Coordinates } from './types';
import axios from 'axios';

/**
 * Parses a French address string into structured components
 *
 * @param addressText - Raw address string
 * @param fallbackCity - Default city if parsing fails (default: 'Paris')
 * @param fallbackPostalCode - Default postal code if parsing fails (default: '75000')
 * @returns Parsed address object
 *
 * @example
 * ```ts
 * parseAddress('6 Parvis Notre-Dame, 75004 Paris, France')
 * // => {
 * //   street: '6 Parvis Notre-Dame',
 * //   postalCode: '75004',
 * //   city: 'Paris',
 * //   country: 'France'
 * // }
 * ```
 */
export function parseAddress(
  addressText: string,
  fallbackCity: string = 'Paris',
  fallbackPostalCode: string = '75000'
): ParsedAddress {
  const compact = addressText.replace(/\s+/g, ' ').trim();

  if (!compact) {
    return {
      street: '',
      postalCode: fallbackPostalCode,
      city: fallbackCity,
    };
  }

  // Try French format: "street, postalCode city, country"
  const frenchMatch = compact.match(
    /^(.*?)[\s,]+(\d{5})[\s,]+([^,]+)(?:,\s*([^,]+))?$/u
  );

  if (frenchMatch) {
    return {
      street: frenchMatch[1].trim().replace(/,$/, ''),
      postalCode: frenchMatch[2],
      city: frenchMatch[3].trim(),
      country: frenchMatch[4]?.trim(),
    };
  }

  // Fallback: try to extract postal code anywhere in string
  const postalMatch = compact.match(/\b(\d{5})\b/);
  if (postalMatch) {
    const postalCode = postalMatch[1];
    const parts = compact.split(postalCode);

    return {
      street: parts[0]?.trim().replace(/,$/, '') || '',
      postalCode,
      city: parts[1]?.trim().split(',')[0] || fallbackCity,
      country: parts[1]?.includes('France') ? 'France' : undefined,
    };
  }

  // Last resort: treat entire string as street
  return {
    street: compact,
    postalCode: fallbackPostalCode,
    city: fallbackCity,
  };
}

/**
 * Geocodes an address using Nominatim (OpenStreetMap)
 *
 * @param address - Parsed address to geocode
 * @param userAgent - User-Agent string for API requests
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Coordinates or null if geocoding fails
 *
 * @example
 * ```ts
 * const coords = await geocodeAddress({
 *   street: '6 Parvis Notre-Dame',
 *   postalCode: '75004',
 *   city: 'Paris'
 * });
 * // => { latitude: 48.853, longitude: 2.3499 }
 * ```
 */
export async function geocodeAddress(
  address: ParsedAddress,
  userAgent: string = 'GodsPlan/1.0',
  timeoutMs: number = 10000
): Promise<Coordinates | null> {
  try {
    const query = buildGeocodeQuery(address);

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': userAgent,
      },
      timeout: timeoutMs,
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const result = response.data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}

/**
 * Builds a geocoding query string from parsed address
 */
function buildGeocodeQuery(address: ParsedAddress): string {
  const parts: string[] = [];

  if (address.street) {
    parts.push(address.street);
  }

  if (address.postalCode) {
    parts.push(address.postalCode);
  }

  if (address.city) {
    parts.push(address.city);
  }

  if (address.country) {
    parts.push(address.country);
  } else {
    parts.push('France');
  }

  return parts.join(', ');
}

/**
 * Calculates Haversine distance between two coordinates in meters
 *
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in meters
 *
 * @example
 * ```ts
 * const distance = haversineDistance(
 *   { latitude: 48.8566, longitude: 2.3522 },
 *   { latitude: 48.8530, longitude: 2.3499 }
 * );
 * // => ~400 (meters)
 * ```
 */
export function haversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.latitude)) *
    Math.cos(toRad(coord2.latitude)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Checks if two coordinates are within a certain distance threshold
 *
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @param thresholdMeters - Distance threshold in meters (default: 150m)
 * @returns True if coordinates are within threshold
 */
export function areCoordinatesClose(
  coord1: Coordinates,
  coord2: Coordinates,
  thresholdMeters: number = 150
): boolean {
  const distance = haversineDistance(coord1, coord2);
  return distance <= thresholdMeters;
}

/**
 * Validates coordinates are within reasonable bounds
 *
 * @param coords - Coordinates to validate
 * @returns True if coordinates are valid
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude) &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}
