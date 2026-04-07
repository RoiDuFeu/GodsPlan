<script lang="ts">
  import { onMount } from 'svelte';
  import { getScrapers, getRecentRuns, getAdminStats, triggerScraper } from '$lib/api';
  import type { ScraperInfo, ScraperRunSummary } from '$lib/types';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import RunHistoryTable from '$lib/components/RunHistoryTable.svelte';

  let scrapers = $state<ScraperInfo[]>([]);
  let recentRuns = $state<ScraperRunSummary[]>([]);
  let stats = $state<{ total: number; active: number; avgReliability: number } | null>(null);
  let loading = $state(true);
  let triggeringIdf = $state(false);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  async function loadData() {
    try {
      const [scrapersData, runsData, statsData] = await Promise.all([
        getScrapers(),
        getRecentRuns(10),
        getAdminStats().catch(() => null),
      ]);
      scrapers = scrapersData;
      recentRuns = runsData;
      if (statsData) {
        stats = {
          total: parseInt(String(statsData.overview.total)),
          active: parseInt(String(statsData.overview.active)),
          avgReliability: parseFloat(String(statsData.overview.avg_reliability)) || 0,
        };
      }
    } catch {
      // silently handle — data will appear empty
    }
    loading = false;
  }

  async function triggerIdf() {
    triggeringIdf = true;
    try {
      await triggerScraper('messes.info', ['75', '77', '78', '91', '92', '93', '94', '95']);
      await loadData();
    } catch {
      // error handled in UI
    }
    triggeringIdf = false;
  }

  onMount(() => {
    loadData();
    pollInterval = setInterval(loadData, 10000);
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  });

  let activeScrapers = $derived(scrapers.filter((s) => s.isRunning).length);
  let lastScrapeTime = $derived(() => {
    if (recentRuns.length === 0) return 'Never';
    const d = new Date(recentRuns[0].startedAt);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  });
  let errorRate = $derived(() => {
    if (recentRuns.length === 0) return '-';
    const failed = recentRuns.filter((r) => r.status === 'failed').length;
    return `${Math.round((failed / recentRuns.length) * 100)}%`;
  });
</script>

<div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="font-headline text-2xl font-bold text-on-surface">Dashboard</h1>
      <p class="text-sm text-on-surface-variant mt-1">Scraper monitoring overview</p>
    </div>
    <button
      onclick={triggerIdf}
      disabled={triggeringIdf}
      class="px-5 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 min-h-[44px]"
    >
      {triggeringIdf ? 'Starting...' : 'Scrape Ile-de-France'}
    </button>
  </div>

  {#if loading}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {#each Array(4) as _}
        <div class="bg-surface-container rounded-xl border border-outline-variant p-5 h-24 animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <!-- Stats cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-surface-container rounded-xl border border-outline-variant p-5">
        <p class="text-xs text-on-surface-variant uppercase tracking-wide font-medium">Total Churches</p>
        <p class="text-2xl font-headline font-bold text-on-surface mt-2">{stats?.total ?? '-'}</p>
      </div>
      <div class="bg-surface-container rounded-xl border border-outline-variant p-5">
        <p class="text-xs text-on-surface-variant uppercase tracking-wide font-medium">Active Scrapers</p>
        <p class="text-2xl font-headline font-bold mt-2 {activeScrapers > 0 ? 'text-secondary' : 'text-on-surface'}">
          {activeScrapers}
        </p>
      </div>
      <div class="bg-surface-container rounded-xl border border-outline-variant p-5">
        <p class="text-xs text-on-surface-variant uppercase tracking-wide font-medium">Last Scrape</p>
        <p class="text-2xl font-headline font-bold text-on-surface mt-2">{lastScrapeTime()}</p>
      </div>
      <div class="bg-surface-container rounded-xl border border-outline-variant p-5">
        <p class="text-xs text-on-surface-variant uppercase tracking-wide font-medium">Error Rate</p>
        <p class="text-2xl font-headline font-bold text-on-surface mt-2">{errorRate()}</p>
      </div>
    </div>

    <!-- Scrapers quick status -->
    <div class="bg-surface-container rounded-xl border border-outline-variant p-5">
      <h2 class="font-headline font-bold text-on-surface mb-4">Scrapers</h2>
      <div class="space-y-3">
        {#each scrapers as scraper}
          <a href="/scrapers/{scraper.name}" class="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-high transition-colors">
            <div class="flex items-center gap-3">
              <StatusBadge status={scraper.isRunning ? 'running' : (scraper.lastRun?.status || 'idle')} size="sm" />
              <span class="text-sm font-medium text-on-surface">{scraper.name}</span>
            </div>
            <span class="text-xs text-on-surface-variant">
              {scraper.lastRun?.churchesFound ?? 0} churches
            </span>
          </a>
        {/each}
      </div>
    </div>

    <!-- Recent runs -->
    <div class="bg-surface-container rounded-xl border border-outline-variant p-5">
      <h2 class="font-headline font-bold text-on-surface mb-4">Recent Runs</h2>
      <RunHistoryTable runs={recentRuns} showScraperName={true} onCancel={loadData} />
    </div>
  {/if}
</div>
