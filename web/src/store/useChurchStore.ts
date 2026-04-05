/**
 * useChurchStore.ts
 * 
 * Cleaned on 2026-03-27:
 * - Removed DEBUG_CHURCHES and DEBUG_CHURCH_DETAILS (previously lines 7-238)
 * - All functions now always use real API calls
 * - No more debug data blocking church details selection
 */

import { create } from 'zustand';
import type { Church, ChurchListItem, UserLocation } from '../lib/types';
import { getAllChurches, getNearbyChurches, getChurchById } from '../lib/api';
import { calculateDistance } from '../lib/utils';

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
    } catch (error) {
      console.error('[GodsPlan] Failed to load churches:', error);
      set({ 
        churches: [], 
        isLoading: false, 
        error: 'Failed to load churches' 
      });
    }
  },

  loadNearbyChurches: async (lat: number, lng: number, radius = 5000) => {
    set({ isLoading: true, error: null });
    try {
      const churches = await getNearbyChurches({ lat, lng, radius });
      set({ churches, isLoading: false });
    } catch (error) {
      console.error('[GodsPlan] Failed to load nearby churches:', error);
      set({ 
        churches: [], 
        isLoading: false, 
        error: 'Failed to load nearby churches' 
      });
    }
  },

  selectChurch: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const church = await getChurchById(id);
      set({ selectedChurch: church, isLoading: false });
    } catch (error) {
      console.error('[GodsPlan] Failed to load church details:', error);
      set({
        selectedChurch: null,
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
