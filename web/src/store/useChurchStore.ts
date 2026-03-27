import { create } from 'zustand';
import type { Church, ChurchListItem, UserLocation } from '../lib/types';
import { getAllChurches, getNearbyChurches, getChurchById } from '../lib/api';
import { calculateDistance } from '../lib/utils';

// ── Debug template data ──────────────────────────────────────────────
const DEBUG_CHURCHES: ChurchListItem[] = [
  {
    id: 'debug-notre-dame',
    name: 'Cathédrale Notre-Dame de Paris',
    address: { street: '6 Parvis Notre-Dame', city: 'Paris', postalCode: '75004', district: '4th Arrondissement' },
    latitude: '48.8530',
    longitude: '2.3499',
    reliabilityScore: 98,
    distance: 800,
    nextMassTime: '18:30',
  },
  {
    id: 'debug-sacre-coeur',
    name: 'Basilique du Sacré-Cœur',
    address: { street: '35 Rue du Chevalier de la Barre', city: 'Paris', postalCode: '75018', district: 'Montmartre' },
    latitude: '48.8867',
    longitude: '2.3431',
    reliabilityScore: 96,
    distance: 3200,
    nextMassTime: '11:00',
  },
  {
    id: 'debug-sainte-chapelle',
    name: 'Sainte-Chapelle',
    address: { street: '10 Boulevard du Palais', city: 'Paris', postalCode: '75001', district: 'Île de la Cité' },
    latitude: '48.8554',
    longitude: '2.3451',
    reliabilityScore: 88,
    distance: 1100,
    nextMassTime: '09:00',
  },
  {
    id: 'debug-saint-eustache',
    name: 'Église Saint-Eustache',
    address: { street: '2 Impasse Saint-Eustache', city: 'Paris', postalCode: '75001', district: 'Les Halles' },
    latitude: '48.8630',
    longitude: '2.3456',
    reliabilityScore: 94,
    distance: 1200,
    nextMassTime: '12:30',
  },
  {
    id: 'debug-saint-sulpice',
    name: 'Église Saint-Sulpice',
    address: { street: '2 Rue Palatine', city: 'Paris', postalCode: '75006', district: '6th Arrondissement' },
    latitude: '48.8510',
    longitude: '2.3348',
    reliabilityScore: 91,
    distance: 1600,
    nextMassTime: '19:00',
  },
];

const DEBUG_CHURCH_DETAILS: Record<string, Church> = {
  'debug-notre-dame': {
    id: 'debug-notre-dame',
    name: 'Cathédrale Notre-Dame de Paris',
    address: { street: '6 Parvis Notre-Dame', city: 'Paris', postalCode: '75004', district: '4th Arrondissement' },
    latitude: '48.8530',
    longitude: '2.3499',
    reliabilityScore: 98,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-10-20T00:00:00Z',
    description: 'Notre-Dame de Paris, meaning "Our Lady of Paris", is a medieval Catholic cathedral on the Île de la Cité. A masterpiece of French Gothic architecture, it is among the largest and most well-known church buildings in the Catholic Church in France, and in the world.',
    contact: {
      phone: '+33 1 42 34 56 10',
      email: 'accueil@notredamedeparis.fr',
      website: 'https://www.notredamedeparis.fr',
    },
    rites: ['Latin Rite', 'Roman Rite'],
    languages: ['French', 'Latin'],
    massSchedules: [
      { dayOfWeek: 0, time: '08:30', rite: 'Latin Rite', language: 'French & Latin', note: 'Sunday Solemnity' },
      { dayOfWeek: 0, time: '10:30', rite: 'Latin Rite', language: 'French & Latin' },
      { dayOfWeek: 0, time: '18:30', rite: 'Latin Rite', language: 'French' },
      { dayOfWeek: 1, time: '08:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 1, time: '12:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 1, time: '18:15', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 6, time: '08:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 6, time: '12:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 6, time: '18:15', rite: 'Roman Rite', language: 'French' },
    ],
    confessionSchedules: [
      { dayOfWeek: 0, startTime: '10:00', endTime: '11:30', note: 'Before solemn mass' },
      { dayOfWeek: 3, startTime: '15:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '16:00', endTime: '18:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '12:00' },
    ],
    dataSources: [
      { type: 'Diocese of Paris', url: 'https://www.paris.catholique.fr', scrapedAt: '2024-10-20T00:00:00Z' },
      { type: 'Google Places' },
    ],
  },
  'debug-sacre-coeur': {
    id: 'debug-sacre-coeur',
    name: 'Basilique du Sacré-Cœur',
    address: { street: '35 Rue du Chevalier de la Barre', city: 'Paris', postalCode: '75018', district: 'Montmartre' },
    latitude: '48.8867',
    longitude: '2.3431',
    reliabilityScore: 96,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-09-15T00:00:00Z',
    description: 'The Basilica of the Sacred Heart of Paris is a Roman Catholic church and minor basilica, dedicated to the Sacred Heart of Jesus. Built in Romano-Byzantine style, it stands at the summit of the butte Montmartre, the highest point in the city.',
    contact: {
      phone: '+33 1 53 41 89 00',
      email: 'info@sacre-coeur-montmartre.com',
    },
    rites: ['Roman Rite'],
    languages: ['French'],
    massSchedules: [
      { dayOfWeek: 0, time: '07:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 0, time: '11:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 0, time: '18:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 0, time: '22:00', rite: 'Roman Rite', language: 'French', note: 'Night vigil' },
      { dayOfWeek: 1, time: '07:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 1, time: '11:15', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 1, time: '18:30', rite: 'Roman Rite', language: 'French' },
    ],
    confessionSchedules: [
      { dayOfWeek: 0, startTime: '09:30', endTime: '10:45' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '12:00' },
      { dayOfWeek: 1, startTime: '14:30', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '10:00', endTime: '12:00' },
      { dayOfWeek: 5, startTime: '14:30', endTime: '17:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '12:00' },
      { dayOfWeek: 6, startTime: '14:30', endTime: '17:00', note: 'Multiple priests available' },
    ],
    dataSources: [
      { type: 'Official Website', url: 'https://www.sacre-coeur-montmartre.com' },
    ],
  },
  'debug-sainte-chapelle': {
    id: 'debug-sainte-chapelle',
    name: 'Sainte-Chapelle',
    address: { street: '10 Boulevard du Palais', city: 'Paris', postalCode: '75001', district: 'Île de la Cité' },
    latitude: '48.8554',
    longitude: '2.3451',
    reliabilityScore: 88,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-08-10T00:00:00Z',
    description: 'The Sainte-Chapelle is a royal chapel in the Gothic style, within the medieval Palais de la Cité. Famous for its 15 stained-glass windows, it was built to house the relics of Christ\'s Passion, including the Crown of Thorns.',
    rites: ['Roman Rite'],
    languages: ['French', 'Latin'],
    massSchedules: [
      { dayOfWeek: 0, time: '09:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 0, time: '17:00', rite: 'Roman Rite', language: 'Latin' },
    ],
    dataSources: [
      { type: 'Community Data' },
    ],
  },
  'debug-saint-eustache': {
    id: 'debug-saint-eustache',
    name: 'Église Saint-Eustache',
    address: { street: '2 Impasse Saint-Eustache', city: 'Paris', postalCode: '75001', district: 'Les Halles' },
    latitude: '48.8630',
    longitude: '2.3456',
    reliabilityScore: 94,
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z',
    description: 'Saint-Eustache is a church in the 1st arrondissement of Paris. Built between 1532 and 1632, it is considered a masterpiece of late Gothic architecture. Its famous organ is one of the largest in France.',
    contact: {
      phone: '+33 1 42 36 31 05',
      email: 'contact@saint-eustache.org',
      website: 'https://www.saint-eustache.org',
    },
    rites: ['Roman Rite'],
    languages: ['French'],
    massSchedules: [
      { dayOfWeek: 0, time: '09:30', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 0, time: '11:00', rite: 'Roman Rite', language: 'French', note: 'Grand organ mass' },
      { dayOfWeek: 0, time: '18:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 1, time: '12:30', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 6, time: '12:30', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 6, time: '17:30', rite: 'Roman Rite', language: 'French' },
    ],
    confessionSchedules: [
      { dayOfWeek: 0, startTime: '09:00', endTime: '09:30', note: 'Before morning mass' },
      { dayOfWeek: 3, startTime: '17:00', endTime: '18:30' },
      { dayOfWeek: 6, startTime: '11:00', endTime: '12:00' },
      { dayOfWeek: 6, startTime: '16:00', endTime: '17:30' },
    ],
    dataSources: [
      { type: 'Official Website', url: 'https://www.saint-eustache.org' },
      { type: 'MessesInfo' },
    ],
  },
  'debug-saint-sulpice': {
    id: 'debug-saint-sulpice',
    name: 'Église Saint-Sulpice',
    address: { street: '2 Rue Palatine', city: 'Paris', postalCode: '75006', district: '6th Arrondissement' },
    latitude: '48.8510',
    longitude: '2.3348',
    reliabilityScore: 91,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-09-20T00:00:00Z',
    description: 'The Church of Saint-Sulpice is a Roman Catholic church and one of the largest churches in Paris. Known for its Delacroix murals, gnomon, and the famous Cavaillé-Coll organ.',
    contact: {
      phone: '+33 1 42 34 59 98',
    },
    rites: ['Roman Rite', 'Tridentine'],
    languages: ['French', 'Latin'],
    massSchedules: [
      { dayOfWeek: 0, time: '07:30', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 0, time: '09:00', rite: 'Tridentine', language: 'Latin' },
      { dayOfWeek: 0, time: '11:00', rite: 'Roman Rite', language: 'French', note: 'Grand messe' },
      { dayOfWeek: 0, time: '19:00', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 1, time: '07:30', rite: 'Roman Rite', language: 'French' },
      { dayOfWeek: 1, time: '12:15', rite: 'Roman Rite', language: 'French' },
    ],
    confessionSchedules: [
      { dayOfWeek: 0, startTime: '08:30', endTime: '09:00' },
      { dayOfWeek: 2, startTime: '16:00', endTime: '18:00', note: 'Latin confession available' },
      { dayOfWeek: 4, startTime: '16:00', endTime: '18:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '12:00' },
      { dayOfWeek: 6, startTime: '15:00', endTime: '18:00', note: 'Extended hours' },
    ],
    dataSources: [
      { type: 'Diocese of Paris' },
    ],
  },
};

// ── Store ────────────────────────────────────────────────────────────

interface ChurchStore {
  churches: ChurchListItem[];
  selectedChurch: Church | null;
  userLocation: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedFilters: { rites: string[]; languages: string[] };

  loadChurches: () => Promise<void>;
  loadNearbyChurches: (lat: number, lng: number, radius?: number) => Promise<void>;
  selectChurch: (id: string) => Promise<void>;
  clearSelectedChurch: () => void;
  setUserLocation: (location: UserLocation | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: { rites?: string[]; languages?: string[] }) => void;
  getFilteredChurches: () => ChurchListItem[];
}

export const useChurchStore = create<ChurchStore>((set, get) => ({
  churches: [],
  selectedChurch: null,
  userLocation: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedFilters: { rites: [], languages: [] },

  loadChurches: async () => {
    set({ isLoading: true, error: null });
    try {
      const churches = await getAllChurches();

      const { userLocation } = get();
      if (userLocation) {
        churches.forEach(church => {
          church.distance = calculateDistance(
            userLocation.latitude, userLocation.longitude,
            parseFloat(church.latitude), parseFloat(church.longitude)
          );
        });
        churches.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      set({ churches, isLoading: false });
    } catch {
      // API unavailable — fall back to debug data
      console.info('[GodsPlan] API unavailable, loading debug parishes');
      set({ churches: DEBUG_CHURCHES, isLoading: false, error: null });
    }
  },

  loadNearbyChurches: async (lat: number, lng: number, radius = 5000) => {
    set({ isLoading: true, error: null });
    try {
      const churches = await getNearbyChurches({ lat, lng, radius });
      set({ churches, isLoading: false });
    } catch {
      set({ churches: DEBUG_CHURCHES, isLoading: false, error: null });
    }
  },

  selectChurch: async (id: string) => {
    // Check debug data first
    if (DEBUG_CHURCH_DETAILS[id]) {
      set({ selectedChurch: DEBUG_CHURCH_DETAILS[id], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const church = await getChurchById(id);
      set({ selectedChurch: church, isLoading: false });
    } catch {
      set({
        error: 'Failed to load church details',
        isLoading: false,
      });
    }
  },

  clearSelectedChurch: () => {
    set({ selectedChurch: null });
  },

  setUserLocation: (location: UserLocation | null) => {
    set({ userLocation: location });
    if (location) {
      const { churches } = get();
      const updated = churches.map(church => ({
        ...church,
        distance: calculateDistance(
          location.latitude, location.longitude,
          parseFloat(church.latitude), parseFloat(church.longitude)
        ),
      }));
      updated.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      set({ churches: updated });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setFilters: (filters: { rites?: string[]; languages?: string[] }) => {
    set(state => ({
      selectedFilters: { ...state.selectedFilters, ...filters },
    }));
  },

  getFilteredChurches: () => {
    const { churches, searchQuery } = get();
    if (!searchQuery.trim()) return churches;

    const query = searchQuery.toLowerCase();
    return churches.filter(church => {
      const addr = [church.address.street, church.address.city, church.address.postalCode, church.address.district]
        .filter(Boolean).join(' ').toLowerCase();
      return church.name.toLowerCase().includes(query) || addr.includes(query);
    });
  },
}));
