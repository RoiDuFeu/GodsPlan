import axios, { AxiosInstance } from 'axios';
import { Church } from '../models/Church';
import { ScrapedChurch } from './BaseScraper';

interface GoogleFindPlaceResponse {
  status: string;
  candidates?: Array<{
    place_id: string;
    name?: string;
    formatted_address?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  }>;
  error_message?: string;
}

interface GooglePlaceDetailsResponse {
  status: string;
  result?: {
    place_id?: string;
    name?: string;
    formatted_address?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
    opening_hours?: {
      weekday_text?: string[];
    };
    photos?: Array<{
      photo_reference: string;
      width: number;
      height: number;
    }>;
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{
      author_name?: string;
      rating?: number;
      text?: string;
      relative_time_description?: string;
      time?: number;
    }>;
    url?: string;
    website?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
  };
  error_message?: string;
}

export interface GoogleScrapedChurch extends ScrapedChurch {
  placeId: string;
  googleMapsUrl?: string;
  photoReferences?: string[];
}

interface GooglePlacesScraperOptions {
  apiKey?: string;
  useFixtures?: boolean;
}

const fixtureData: Record<string, GoogleScrapedChurch> = {
  'notre dame de paris': {
    placeId: 'fixture-notre-dame-paris',
    name: 'Cathédrale Notre-Dame de Paris',
    address: {
      street: '6 Parvis Notre-Dame - Pl. Jean-Paul II',
      postalCode: '75004',
      city: 'Paris',
    },
    latitude: 48.8530204,
    longitude: 2.3499031,
    contact: {
      phone: '+33 1 42 34 56 10',
      website: 'https://www.notredamedeparis.fr',
    },
    openingHours: [
      'lundi: 07:45–19:00',
      'mardi: 07:45–19:00',
      'mercredi: 07:45–19:00',
      'jeudi: 07:45–19:00',
      'vendredi: 07:45–19:00',
      'samedi: 08:15–19:30',
      'dimanche: 08:15–19:30',
    ],
    photos: ['google-photo:fixture_nd_1', 'google-photo:fixture_nd_2'],
    photoReferences: ['fixture_nd_1', 'fixture_nd_2'],
    rating: 4.8,
    userRatingsTotal: 57420,
    reviews: [
      {
        authorName: 'Google User 1',
        rating: 5,
        text: 'Lieu magnifique et chargé d’histoire.',
      },
      {
        authorName: 'Google User 2',
        rating: 5,
        text: 'Architecture incroyable, à voir absolument.',
      },
    ],
    googleMapsUrl: 'https://maps.google.com/?q=place_id:fixture-notre-dame-paris',
    sourceUrl: 'https://maps.google.com/?q=place_id:fixture-notre-dame-paris',
  },
  'sacre coeur de montmartre': {
    placeId: 'fixture-sacre-coeur-montmartre',
    name: 'Basilique du Sacré-Cœur de Montmartre',
    address: {
      street: '35 Rue du Chevalier de la Barre',
      postalCode: '75018',
      city: 'Paris',
    },
    latitude: 48.8867046,
    longitude: 2.3431043,
    contact: {
      phone: '+33 1 53 41 89 01',
      website: 'https://www.sacre-coeur-montmartre.com',
    },
    openingHours: [
      'lundi: 06:30–22:30',
      'mardi: 06:30–22:30',
      'mercredi: 06:30–22:30',
      'jeudi: 06:30–22:30',
      'vendredi: 06:30–22:30',
      'samedi: 06:30–22:30',
      'dimanche: 06:30–22:30',
    ],
    photos: [
      'google-photo:fixture_sc_1',
      'google-photo:fixture_sc_2',
      'google-photo:fixture_sc_3',
    ],
    photoReferences: ['fixture_sc_1', 'fixture_sc_2', 'fixture_sc_3'],
    rating: 4.7,
    userRatingsTotal: 129874,
    reviews: [
      {
        authorName: 'Google User 3',
        rating: 4,
        text: 'Vue superbe sur Paris.',
      },
      {
        authorName: 'Google User 4',
        rating: 5,
        text: 'Très beau monument, ambiance paisible.',
      },
    ],
    googleMapsUrl: 'https://maps.google.com/?q=place_id:fixture-sacre-coeur-montmartre',
    sourceUrl: 'https://maps.google.com/?q=place_id:fixture-sacre-coeur-montmartre',
  },
};

const normalizeName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export class GooglePlacesScraper {
  private readonly apiKey?: string;
  private readonly useFixtures: boolean;
  private readonly axios: AxiosInstance;

  constructor(options: GooglePlacesScraperOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GOOGLE_PLACES_API_KEY;
    this.useFixtures = options.useFixtures ?? process.env.GOOGLE_SCRAPER_USE_FIXTURES === 'true';

    this.axios = axios.create({
      baseURL: 'https://maps.googleapis.com/maps/api/place',
      timeout: Number(process.env.SCRAPE_TIMEOUT_MS || 30000),
    });
  }

  isEnabled(): boolean {
    return this.useFixtures || Boolean(this.apiKey);
  }

  async enrichChurch(church: Church): Promise<GoogleScrapedChurch | null> {
    if (this.useFixtures) {
      return this.fromFixtures(church.name);
    }

    if (!this.apiKey) {
      console.warn('⚠️ GOOGLE_PLACES_API_KEY missing, skipping Google enrichment');
      return null;
    }

    const query = `${church.name}, ${church.address.street}, ${church.address.postalCode} ${church.address.city}`;
    const locationBias =
      church.latitude && church.longitude
        ? `point:${church.latitude},${church.longitude}`
        : undefined;

    const findResponse = await this.axios.get<GoogleFindPlaceResponse>('/findplacefromtext/json', {
      params: {
        key: this.apiKey,
        input: query,
        inputtype: 'textquery',
        fields: 'place_id,name,formatted_address,geometry',
        language: 'fr',
        ...(locationBias ? { locationbias: locationBias } : {}),
      },
    });

    if (findResponse.data.status !== 'OK' || !findResponse.data.candidates?.length) {
      console.warn(
        `⚠️ Google findPlace failed for ${church.name}: ${findResponse.data.status} ${
          findResponse.data.error_message || ''
        }`
      );
      return null;
    }

    const candidate = findResponse.data.candidates[0];
    const placeId = candidate.place_id;

    const detailsResponse = await this.axios.get<GooglePlaceDetailsResponse>('/details/json', {
      params: {
        key: this.apiKey,
        place_id: placeId,
        language: 'fr',
        reviews_no_translations: true,
        fields:
          'place_id,name,formatted_address,geometry,opening_hours,photos,rating,user_ratings_total,reviews,url,website,formatted_phone_number,international_phone_number',
      },
    });

    if (detailsResponse.data.status !== 'OK' || !detailsResponse.data.result) {
      console.warn(
        `⚠️ Google place details failed for ${church.name}: ${detailsResponse.data.status} ${
          detailsResponse.data.error_message || ''
        }`
      );
      return null;
    }

    return this.mapGoogleResult(detailsResponse.data.result, placeId);
  }

  private fromFixtures(name: string): GoogleScrapedChurch | null {
    const normalized = normalizeName(name);
    const exact = fixtureData[normalized];

    if (exact) {
      return { ...exact };
    }

    const partialKey = Object.keys(fixtureData).find((key) =>
      normalized.includes(key) || key.includes(normalized)
    );

    if (!partialKey) {
      console.warn(`⚠️ No Google fixture found for ${name}`);
      return null;
    }

    return { ...fixtureData[partialKey] };
  }

  private mapGoogleResult(
    result: NonNullable<GooglePlaceDetailsResponse['result']>,
    placeId: string
  ): GoogleScrapedChurch {
    const formattedAddress = result.formatted_address || '';
    const address = this.parseAddress(formattedAddress);

    const photoReferences = (result.photos || []).map((photo) => photo.photo_reference);

    return {
      placeId,
      name: result.name || 'Unknown church',
      address,
      latitude: result.geometry?.location?.lat,
      longitude: result.geometry?.location?.lng,
      contact: {
        phone: result.formatted_phone_number || result.international_phone_number,
        website: result.website,
      },
      openingHours: result.opening_hours?.weekday_text || [],
      photos: photoReferences.map((ref) => `google-photo:${ref}`),
      photoReferences,
      rating: result.rating,
      userRatingsTotal: result.user_ratings_total,
      reviews: (result.reviews || []).map((review) => ({
        authorName: review.author_name,
        rating: review.rating,
        text: review.text,
        relativeTimeDescription: review.relative_time_description,
        time: review.time,
      })),
      googleMapsUrl: result.url || `https://maps.google.com/?q=place_id:${placeId}`,
      sourceUrl: result.url || `https://maps.google.com/?q=place_id:${placeId}`,
    };
  }

  private parseAddress(formattedAddress: string): ScrapedChurch['address'] {
    const postalCityMatch = formattedAddress.match(/(\d{5})\s+([^,]+)/);

    const street = formattedAddress.split(',')[0]?.trim() || '';

    return {
      street,
      postalCode: postalCityMatch?.[1] || '75000',
      city: postalCityMatch?.[2]?.trim() || 'Paris',
    };
  }
}
