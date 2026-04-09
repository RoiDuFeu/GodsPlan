<script lang="ts">
  import { onMount } from 'svelte';
  import { getScrapers, getRecentRuns, getAdminStats, triggerScraper } from '$lib/api';
  import type { ScraperInfo, ScraperRunSummary } from '$lib/types';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import RunHistoryTable from '$lib/components/RunHistoryTable.svelte';
  import FadeIn from '$lib/components/ui/FadeIn.svelte';
  import NumberTicker from '$lib/components/ui/NumberTicker.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

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
          total: parseInt(String(statsData.total)),
          active: parseInt(String(statsData.active)),
          avgReliability: parseFloat(String(statsData.avgReliabilityScore)) || 0,
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

<div class="page-container space-y-8">
  <!-- Header -->
  <FadeIn>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Scraper monitoring overview</p>
      </div>
      <button onclick={triggerIdf} disabled={triggeringIdf} class="btn-primary">
        {#if triggeringIdf}
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/>
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          </svg>
          Starting...
        {:else}
          Scrape Ile-de-France
        {/if}
      </button>
    </div>
  </FadeIn>

  {#if loading}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {#each Array(4) as _}
        <Skeleton class="h-[100px]" />
      {/each}
    </div>
  {:else}
    <!-- Stats cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <FadeIn delay={0}>
        <div class="stat-card">
          <p class="stat-label">Total Churches</p>
          <p class="stat-value">
            {#if stats?.total}
              <NumberTicker value={stats.total} />
            {:else}
              -
            {/if}
          </p>
        </div>
      </FadeIn>
      <FadeIn delay={60}>
        <div class="stat-card">
          <p class="stat-label">Active Scrapers</p>
          <p class="stat-value {activeScrapers > 0 ? 'text-success' : ''}">
            <NumberTicker value={activeScrapers} duration={600} />
          </p>
        </div>
      </FadeIn>
      <FadeIn delay={120}>
        <div class="stat-card">
          <p class="stat-label">Last Scrape</p>
          <p class="stat-value">{lastScrapeTime()}</p>
        </div>
      </FadeIn>
      <FadeIn delay={180}>
        <div class="stat-card">
          <p class="stat-label">Error Rate</p>
          <p class="stat-value">{errorRate()}</p>
        </div>
      </FadeIn>
    </div>

    <!-- Scrapers quick status -->
    <FadeIn delay={200}>
      <div class="card p-6">
        <h2 class="section-title mb-5">Scrapers</h2>
        <div class="space-y-1">
          {#each scrapers as scraper}
            <a href="/scrapers/{scraper.name}" class="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-container-high/60 transition-colors group">
              <div class="flex items-center gap-3">
                <StatusBadge status={scraper.isRunning ? 'running' : (scraper.lastRun?.status || 'idle')} size="sm" />
                <span class="text-sm font-medium text-on-surface group-hover:text-on-surface transition-colors">{scraper.name}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs text-on-surface-variant tabular-nums">
                  {scraper.lastRun?.churchesFound ?? 0} churches
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </a>
          {/each}
        </div>
      </div>
    </FadeIn>

    <!-- Recent runs -->
    <FadeIn delay={300}>
      <div class="card p-6">
        <h2 class="section-title mb-5">Recent Runs</h2>
        <RunHistoryTable runs={recentRuns} showScraperName={true} onCancel={loadData} />
      </div>
    </FadeIn>
  {/if}
</div>
