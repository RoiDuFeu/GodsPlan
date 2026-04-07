import type {
  ScraperInfo,
  ScraperRunSummary,
  ScraperRunDetail,
  DepartmentCoverage,
  ChurchResult,
  ResultsSummary,
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
  departments: string[] = []
): Promise<{ runId: string; message: string }> {
  return fetchJson(`${BASE}/admin/scrapers/${name}/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ departments }),
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

// --- Coverage ---

export async function getIdfCoverage(): Promise<{
  departments: DepartmentCoverage[];
  totals: { totalChurches: number; withSchedules: number; withPhone: number };
  isScraperRunning: boolean;
  runningId: string | null;
}> {
  return fetchJson(`${BASE}/admin/scrapers/coverage/idf`);
}

// --- Admin Stats (existing endpoint) ---

export async function getAdminStats(): Promise<{
  overview: { total: number; active: number; avg_reliability: number };
  coverage: Record<string, number>;
}> {
  return fetchJson(`${BASE}/admin/stats`);
}
