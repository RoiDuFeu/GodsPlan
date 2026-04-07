import { writable } from 'svelte/store';
import type { ScraperInfo, ScraperRunSummary } from '../types';

export const scrapers = writable<ScraperInfo[]>([]);
export const recentRuns = writable<ScraperRunSummary[]>([]);
export const isLoading = writable(false);
export const error = writable<string | null>(null);
