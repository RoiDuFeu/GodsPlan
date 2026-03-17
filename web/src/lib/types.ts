export interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  district?: string;
}

export interface Church {
  id: string;
  name: string;
  address: Address;
  latitude: string;
  longitude: string;
  massSchedules: MassSchedule[];
  dataSources: DataSource[];
  reliabilityScore: number;
  createdAt: string;
  updatedAt: string;
  description?: string;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  rites: string[];
  languages: string[];
  photos?: string[];
}

export interface MassSchedule {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  time: string;
  rite?: string;
  language?: string;
  note?: string;
}

export interface DataSource {
  type: string;
  url?: string;
  scrapedAt?: string;
  metadata?: {
    photoReferences?: string[];
    [key: string]: any;
  };
}

export interface ChurchListItem {
  id: string;
  name: string;
  address: Address;
  latitude: string;
  longitude: string;
  reliabilityScore: number;
  distance?: number; // in meters, computed client-side
}

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radius?: number; // in meters, default 5000
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}
