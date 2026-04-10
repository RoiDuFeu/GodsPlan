export interface ScraperError {
  church?: string;
  url?: string;
  message: string;
  timestamp: string;
}

export interface ChurchUpdateData {
  churchId: string;
  churchName: string;
  websiteUrl: string;
  status: 'pending' | 'scraping' | 'success' | 'no_data' | 'error';
  massSchedules?: number;
  officeSchedules?: number;
  events?: number;
  confidence?: number;
  errorMessage?: string;
}

export interface ScraperLogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  url?: string;
  churchName?: string;
  phase?: 'list' | 'detail';
  progress?: { current: number; total: number };
  churchUpdate?: ChurchUpdateData;
}

export interface ScreencastFrame {
  image: string;
  pageUrl: string;
  workerIndex?: number;
  timestamp: string;
}

export interface ChurchResult {
  name: string;
  url: string;
  status: 'success' | 'error';
  hasSchedules: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasWebsite: boolean;
  hasCoordinates: boolean;
  errorMessage?: string;
}

export interface ResultsSummary {
  total: number;
  success: number;
  errors: number;
  missingSchedules: number;
  missingPhone: number;
  missingCoords: number;
}

export interface ScraperRunSummary {
  id: string;
  scraperName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  departments: string[];
  churchesFound: number;
  churchesSaved: number;
  errorCount: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

export interface ScraperRunDetail extends ScraperRunSummary {
  errors: ScraperError[];
  metadata: Record<string, unknown> | null;
}

export interface ScraperInfo {
  name: string;
  description: string;
  supportsDepartments: boolean;
  isRunning: boolean;
  runningId?: string;
  lastRun: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
    churchesFound: number;
    errorCount: number;
    departments: string[];
  } | null;
  successRate: number | null;
}

export interface DepartmentCoverage {
  code: string;
  name: string;
  totalChurches: number;
  withSchedules: number;
  withPhone: number;
  lastUpdated: string | null;
  lastScrapedAt: string | null;
  lastScrapeStatus: string | null;
}

export interface ChurchAdmin {
  id: string;
  name: string;
  description?: string;
  address: { street: string; postalCode: string; city: string; district?: string };
  latitude: number;
  longitude: number;
  contact?: { phone?: string; email?: string; website?: string };
  massSchedules: Array<{ dayOfWeek: number; time: string; rite: string; language?: string; notes?: string }>;
  officeSchedules: Array<{ type: string; dayOfWeek: number; startTime: string; endTime?: string; notes?: string }>;
  rites: string[];
  languages: string[];
  accessibility?: { wheelchairAccessible: boolean; hearingLoop: boolean; parking: boolean; notes?: string };
  photos: string[];
  upcomingEvents: Array<{ title: string; date: string; time?: string; type: string }>;
  dataSources: Array<{ name: string; url?: string; lastScraped: string; reliability: number }>;
  reliabilityScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastVerified?: string;
}

export interface LiturgyReading {
  title: string;
  reference: string;
  text: string;
}

export interface LiturgyPsalm {
  reference: string;
  refrain: string;
  text: string;
}

export interface LiturgyEntry {
  id: string;
  date: string;
  liturgicalDay?: string;
  liturgicalDayFr?: string;
  liturgicalColor?: string;
  saint?: string;
  feast?: string;
  season?: string;
  readings: LiturgyReading[];
  psalm?: LiturgyPsalm;
  readingsFr?: LiturgyReading[];
  psalmFr?: LiturgyPsalm;
  usccbLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  overview: {
    total: number;
    active: number;
    avg_reliability: number;
  };
  coverage: {
    total: number;
    with_gps: number;
    with_schedules: number;
    with_phone: number;
    with_website: number;
    with_photos: number;
  };
}
