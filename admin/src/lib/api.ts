import type {
  ScraperInfo,
  ScraperRunSummary,
  ScraperRunDetail,
  DepartmentCoverage,
  ChurchResult,
  ResultsSummary,
  ChurchAdmin,
  LiturgyEntry,
} from './types';

const BASE = '/api/v1';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Scrapers ---

export async function getScrapers(): Promise<ScraperInfo[]> {
  const data = await fetchJson<{ scrapers: ScraperInfo[] }>(`${BASE}/admin/scrapers`);
  return data.scrapers;
}

export async function getRecentRuns(limit = 10): Promise<ScraperRunSummary[]> {
  const data = await fetchJson<{ runs: ScraperRunSummary[] }>(
    `${BASE}/admin/scrapers/runs/recent?limit=${limit}`
  );
  return data.runs;
}

export async function getRunDetail(id: string): Promise<ScraperRunDetail> {
  const data = await fetchJson<{ run: ScraperRunDetail }>(
    `${BASE}/admin/scrapers/runs/${id}`
  );
  return data.run;
}

export async function getScraperHistory(
  name: string,
  page = 1,
  limit = 20
): Promise<{ runs: ScraperRunSummary[]; pagination: { page: number; total: number; totalPages: number } }> {
  return fetchJson(`${BASE}/admin/scrapers/${name}/history?page=${page}&limit=${limit}`);
}

export async function triggerScraper(
  name: string,
  departments: string[] = [],
  concurrency?: number,
  options?: { onlyMissingData?: boolean },
): Promise<{ runId: string; message: string }> {
  return fetchJson(`${BASE}/admin/scrapers/${name}/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      departments,
      ...(concurrency != null && { concurrency }),
      ...(options?.onlyMissingData && { onlyMissingData: true }),
    }),
  });
}

export async function cancelScraper(name: string): Promise<{ message: string }> {
  return fetchJson(`${BASE}/admin/scrapers/${name}/cancel`, {
    method: 'POST',
  });
}

export async function getRunResults(
  id: string
): Promise<{ results: ChurchResult[] | null; summary: ResultsSummary | null; expired: boolean }> {
  return fetchJson(`${BASE}/admin/scrapers/runs/${id}/results`);
}

// --- Purge ---

export async function purgeData(): Promise<{ message: string; deleted: { churches: number; scraperRuns: number } }> {
  return fetchJson(`${BASE}/admin/scrapers/purge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  });
}

// --- Coverage ---

export async function getIdfCoverage(): Promise<{
  departments: DepartmentCoverage[];
  totals: { totalChurches: number; withSchedules: number; withPhone: number };
  isScraperRunning: boolean;
  runningId: string | null;
}> {
  return fetchJson(`${BASE}/admin/scrapers/coverage/idf`);
}

// --- Churches ---

export async function getChurches(
  city?: string,
  limit = 50,
  offset = 0
): Promise<{ data: ChurchAdmin[]; meta: { total: number; limit: number; offset: number } }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (city) params.set('city', city);
  return fetchJson(`${BASE}/churches-simple?${params}`);
}

export async function getChurch(id: string): Promise<ChurchAdmin> {
  return fetchJson(`${BASE}/churches-simple/${id}`);
}

// --- Single Church Scraping ---

export async function scrapeChurchFromMessesInfo(
  url: string,
  seed?: { name: string; address: { street: string; postalCode: string; city: string }; latitude?: number; longitude?: number },
): Promise<{ message: string; church: Record<string, unknown>; saved: boolean }> {
  return fetchJson(`${BASE}/admin/scrapers/messes.info/scrape-church`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, seed }),
  });
}

export function scrapeMessesInfoStream(
  url: string,
  seed?: { name: string; address: { street: string; postalCode: string; city: string }; latitude?: number; longitude?: number },
): EventSource {
  const params = new URLSearchParams({ url });
  if (seed) params.set('seed', JSON.stringify(seed));
  return new EventSource(`${BASE}/admin/scrapers/messes.info/scrape-church/stream?${params}`);
}

export function scrapeChurchWebsiteStream(churchId: string): EventSource {
  return new EventSource(`${BASE}/admin/scrapers/church-website/scrape-church/${churchId}/stream`);
}

export async function scrapeChurchWebsite(
  churchId: string,
): Promise<{ message: string; massSchedules: number; officeSchedules: number; events: number; confidence: number }> {
  return fetchJson(`${BASE}/admin/scrapers/church-website/scrape-church`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ churchId }),
  });
}

// --- Liturgy ---

export async function getLiturgy(date: string): Promise<LiturgyEntry> {
  return fetchJson(`${BASE}/liturgy/${date}`);
}

export async function getLiturgyToday(): Promise<LiturgyEntry> {
  return fetchJson(`${BASE}/liturgy/today`);
}

export async function refreshLiturgy(days = 7): Promise<{ message: string; dates: string[] }> {
  return fetchJson(`${BASE}/liturgy/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days }),
  });
}

// --- Admin Stats (existing endpoint) ---

export async function getAdminStats(): Promise<{
  total: number;
  active: number;
  avgReliabilityScore: number;
}> {
  return fetchJson(`${BASE}/admin/stats`);
}
