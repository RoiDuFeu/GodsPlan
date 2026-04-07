export interface ScraperError {
  church?: string;
  url?: string;
  message: string;
  timestamp: string;
}

export interface ScraperLogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  url?: string;
  churchName?: string;
  phase?: 'list' | 'detail';
  progress?: { current: number; total: number };
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
