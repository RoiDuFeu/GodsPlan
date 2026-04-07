<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { getScrapers, getScraperHistory, cancelScraper, getRunResults } from '$lib/api';
  import type { ScraperInfo, ScraperRunSummary, ChurchResult, ResultsSummary } from '$lib/types';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import RunHistoryTable from '$lib/components/RunHistoryTable.svelte';
  import TriggerModal from '$lib/components/TriggerModal.svelte';
  import LiveActivityFeed from '$lib/components/LiveActivityFeed.svelte';
  import RunResultsPanel from '$lib/components/RunResultsPanel.svelte';

  let scraper = $state<ScraperInfo | null>(null);
  let runs = $state<ScraperRunSummary[]>([]);
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);
  let loading = $state(true);
  let showModal = $state(false);
  let cancelling = $state(false);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  // Results state
  let lastCompletedRunId = $state<string | null>(null);
  let churchResults = $state<ChurchResult[] | null>(null);
  let resultsSummary = $state<ResultsSummary | null>(null);
  let resultsExpired = $state(false);

  let scraperName = $derived(page.params.name ?? '');

  let wasRunning = false;

  async function loadData() {
    try {
      const [scrapersData, historyData] = await Promise.all([
        getScrapers(),
        getScraperHistory(scraperName, currentPage),
      ]);
      scraper = scrapersData.find((s) => s.name === scraperName) || null;
      runs = historyData.runs;
      totalPages = historyData.pagination.totalPages;
      total = historyData.pagination.total;

      // Detect run completion: was running, now stopped
      if (wasRunning && scraper && !scraper.isRunning && scraper.lastRun) {
        loadResults(scraper.lastRun.id);
      }
      wasRunning = scraper?.isRunning ?? false;
    } catch {
      // silently handle
    }
    loading = false;
  }

  async function handleCancel() {
    if (!scraper) return;
    cancelling = true;
    try {
      await cancelScraper(scraper.name);
    } catch {
      // error handled
    }
    cancelling = false;
  }

  async function loadResults(runId: string) {
    try {
      lastCompletedRunId = runId;
      const data = await getRunResults(runId);
      churchResults = data.results;
      resultsSummary = data.summary;
      resultsExpired = data.expired;
    } catch {
      // silently handle
    }
  }

  function dismissResults() {
    lastCompletedRunId = null;
    churchResults = null;
    resultsSummary = null;
  }

  function goToPage(p: number) {
    currentPage = p;
    loadData();
  }

  onMount(() => {
    loadData();
    wasRunning = scraper?.isRunning ?? false;
    pollInterval = setInterval(loadData, 10000);
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  });
</script>

<div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
  <!-- Back link -->
  <a href="/scrapers" class="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
    Back to scrapers
  </a>

  {#if loading}
    <div class="bg-surface-container rounded-xl border border-outline-variant p-6 h-32 animate-pulse"></div>
  {:else if !scraper}
    <div class="bg-surface-container rounded-xl border border-outline-variant p-8 text-center">
      <p class="text-on-surface-variant">Scraper "{scraperName}" not found</p>
    </div>
  {:else}
    <!-- Header -->
    <div class="bg-surface-container rounded-xl border border-outline-variant p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="font-headline text-xl font-bold text-on-surface">{scraper.name}</h1>
              <StatusBadge status={scraper.isRunning ? 'running' : (scraper.lastRun?.status || 'idle')} />
            </div>
            <p class="text-sm text-on-surface-variant mt-1">{scraper.description}</p>
          </div>
        </div>
        <div class="flex gap-2">
          {#if scraper.isRunning}
            <button
              onclick={handleCancel}
              disabled={cancelling}
              class="px-5 py-3 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-40 min-h-[44px]"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Run'}
            </button>
          {:else}
            <button
              onclick={() => (showModal = true)}
              class="px-5 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-h-[44px]"
            >
              Trigger Run
            </button>
          {/if}
        </div>
      </div>

      {#if scraper.lastRun}
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-outline-variant">
          <div>
            <p class="text-xs text-on-surface-variant">Last run</p>
            <p class="text-sm font-medium text-on-surface mt-1">
              {new Date(scraper.lastRun.startedAt).toLocaleString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p class="text-xs text-on-surface-variant">Duration</p>
            <p class="text-sm font-medium text-on-surface mt-1">
              {scraper.lastRun.durationMs ? `${(scraper.lastRun.durationMs / 1000).toFixed(1)}s` : '-'}
            </p>
          </div>
          <div>
            <p class="text-xs text-on-surface-variant">Churches found</p>
            <p class="text-sm font-medium text-on-surface mt-1">{scraper.lastRun.churchesFound}</p>
          </div>
          <div>
            <p class="text-xs text-on-surface-variant">Success rate</p>
            <p class="text-sm font-medium text-on-surface mt-1">
              {scraper.successRate !== null ? `${scraper.successRate}%` : '-'}
            </p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Live Activity Feed -->
    {#if scraper.isRunning && scraper.runningId}
      {@const activeRunId = scraper.runningId}
      <LiveActivityFeed runId={activeRunId} isRunning={scraper.isRunning} />
    {/if}

    <!-- Run Results (shown after a run completes) -->
    {#if lastCompletedRunId && (churchResults || resultsSummary)}
      <RunResultsPanel
        results={churchResults}
        summary={resultsSummary}
        expired={resultsExpired}
        onDismiss={dismissResults}
      />
    {/if}

    <!-- Run history -->
    <div class="bg-surface-container rounded-xl border border-outline-variant p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-headline font-bold text-on-surface">Run History</h2>
        <span class="text-xs text-on-surface-variant">{total} total runs</span>
      </div>

      <RunHistoryTable {runs} onCancel={loadData} />

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="flex items-center justify-center gap-2 mt-6">
          <button
            onclick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            class="px-3 py-2 rounded-lg text-sm bg-surface-container-high text-on-surface hover:bg-surface-container-highest disabled:opacity-30 min-h-[36px]"
          >
            Prev
          </button>
          <span class="text-sm text-on-surface-variant px-3">
            {currentPage} / {totalPages}
          </span>
          <button
            onclick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            class="px-3 py-2 rounded-lg text-sm bg-surface-container-high text-on-surface hover:bg-surface-container-highest disabled:opacity-30 min-h-[36px]"
          >
            Next
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if showModal && scraper}
  <TriggerModal
    scraperName={scraper.name}
    supportsDepartments={scraper.supportsDepartments}
    onClose={() => (showModal = false)}
    onTriggered={loadData}
  />
{/if}
