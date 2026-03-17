import { create } from 'zustand';
import type { Church, ChurchListItem, UserLocation } from '../lib/types';
import { getAllChurches, getNearbyChurches, getChurchById } from '../lib/api';
import { calculateDistance } from '../lib/utils';

interface ChurchStore {
  // Data
  churches: ChurchListItem[];
  selectedChurch: Church | null;
  userLocation: UserLocation | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedFilters: {
    rites: string[];
    languages: string[];
  };
  
  // Actions
  loadChurches: () => Promise<void>;
  loadNearbyChurches: (lat: number, lng: number, radius?: number) => Promise<void>;
  selectChurch: (id: string) => Promise<void>;
  clearSelectedChurch: () => void;
  setUserLocation: (location: UserLocation | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: { rites?: string[]; languages?: string[] }) => void;
  
  // Computed
  getFilteredChurches: () => ChurchListItem[];
}

export const useChurchStore = create<ChurchStore>((set, get) => ({
  // Initial state
  churches: [],
  selectedChurch: null,
  userLocation: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedFilters: {
    rites: [],
    languages: [],
  },
  
  // Actions
  loadChurches: async () => {
    set({ isLoading: true, error: null });
    try {
      const churches = await getAllChurches();
      
      // Add distance if user location is available
      const { userLocation } = get();
      if (userLocation) {
        churches.forEach(church => {
          const lat = parseFloat(church.latitude);
          const lng = parseFloat(church.longitude);
          church.distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lng
          );
        });
        
        // Sort by distance
        churches.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }
      
      set({ churches, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load churches',
        isLoading: false,
      });
    }
  },
  
  loadNearbyChurches: async (lat: number, lng: number, radius = 5000) => {
    set({ isLoading: true, error: null });
    try {
      const churches = await getNearbyChurches({ lat, lng, radius });
      set({ churches, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load nearby churches',
        isLoading: false,
      });
    }
  },
  
  selectChurch: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const church = await getChurchById(id);
      set({ selectedChurch: church, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load church details',
        isLoading: false,
      });
    }
  },
  
  clearSelectedChurch: () => {
    set({ selectedChurch: null });
  },
  
  setUserLocation: (location: UserLocation | null) => {
    set({ userLocation: location });
    
    // Recalculate distances if location changed
    if (location) {
      const { churches } = get();
      const updatedChurches = churches.map(church => {
        const lat = parseFloat(church.latitude);
        const lng = parseFloat(church.longitude);
        return {
          ...church,
          distance: calculateDistance(
            location.latitude,
            location.longitude,
            lat,
            lng
          ),
        };
      });
      
      // Sort by distance
      updatedChurches.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      set({ churches: updatedChurches });
    }
  },
  
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },
  
  setFilters: (filters: { rites?: string[]; languages?: string[] }) => {
    set(state => ({
      selectedFilters: {
        ...state.selectedFilters,
        ...filters,
      },
    }));
  },
  
  getFilteredChurches: () => {
    const { churches, searchQuery } = get();
    
    if (!searchQuery.trim()) {
      return churches;
    }
    
    const query = searchQuery.toLowerCase();
    return churches.filter(church => {
      const addressString = [
        church.address.street,
        church.address.city,
        church.address.postalCode,
        church.address.district
      ].filter(Boolean).join(' ').toLowerCase();
      
      return church.name.toLowerCase().includes(query) ||
             addressString.includes(query);
    });
  },
}));
