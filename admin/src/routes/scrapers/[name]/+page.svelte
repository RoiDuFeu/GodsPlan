<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { getScrapers, getScraperHistory, cancelScraper, getRunResults } from '$lib/api';
  import type { ScraperInfo, ScraperRunSummary, ScraperLogEntry, ChurchResult, ResultsSummary, ScreencastFrame } from '$lib/types';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import RunHistoryTable from '$lib/components/RunHistoryTable.svelte';
  import TriggerModal from '$lib/components/TriggerModal.svelte';
  import LiveActivityFeed from '$lib/components/LiveActivityFeed.svelte';
  import BrowserPreview from '$lib/components/BrowserPreview.svelte';
  import WebsiteScraperGrid from '$lib/components/WebsiteScraperGrid.svelte';
  import RunResultsPanel from '$lib/components/RunResultsPanel.svelte';
  import FadeIn from '$lib/components/ui/FadeIn.svelte';
  import NumberTicker from '$lib/components/ui/NumberTicker.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

  let scraper = $state<ScraperInfo | null>(null);
  let runs = $state<ScraperRunSummary[]>([]);
  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);
  let loading = $state(true);
  let showModal = $state(false);
  let cancelling = $state(false);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  // SSE state — single connection, shared by all components
  let sseLogs = $state<ScraperLogEntry[]>([]);
  let sseFrames = $state<ScreencastFrame[]>([]);
  let sseConnected = $state(false);
  let sseRunId = $state<string | null>(null);
  let eventSource: EventSource | null = null;

  // Results state
  let lastCompletedRunId = $state<string | null>(null);
  let churchResults = $state<ChurchResult[] | null>(null);
  let resultsSummary = $state<ResultsSummary | null>(null);
  let resultsExpired = $state(false);

  let scraperName = $derived(page.params.name ?? '');

  let wasRunning = false;

  // ── SSE management ──────────────────────────────────────────────────────

  function connectSSE(runId: string) {
    if (sseRunId === runId && eventSource) return;
    disconnectSSE();
    sseLogs = [];
    sseFrames = [];
    sseConnected = false;
    sseRunId = runId;

    eventSource = new EventSource(`/api/v1/admin/scrapers/runs/${runId}/logs`);

    eventSource.onopen = () => {
      sseConnected = true;
    };

    eventSource.onmessage = (event) => {
      const entry: ScraperLogEntry = JSON.parse(event.data);
      sseLogs = [...sseLogs, entry];
    };

    eventSource.addEventListener('frame', (event: MessageEvent) => {
      const data: ScreencastFrame = JSON.parse(event.data);
      // Keep only last frame per worker (avoid memory bloat)
      const idx = data.workerIndex ?? 0;
      const existing = sseFrames.findIndex((f) => (f.workerIndex ?? 0) === idx);
      if (existing >= 0) {
        sseFrames[existing] = data;
        sseFrames = [...sseFrames];
      } else {
        sseFrames = [...sseFrames, data];
      }
    });

    eventSource.addEventListener('done', () => {
      sseConnected = false;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    });

    eventSource.onerror = () => {
      sseConnected = false;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }

  function disconnectSSE() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  // ── Data loading ────────────────────────────────────────────────────────

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

      if (scraper?.isRunning && scraper.runningId) {
        connectSSE(scraper.runningId);
      }

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
      disconnectSSE();
    };
  });
</script>

<div class="page-container space-y-8">
  <!-- Back link -->
  <a href="/scrapers" class="back-link">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
    Back to scrapers
  </a>

  {#if loading}
    <Skeleton class="h-[160px]" />
  {:else if !scraper}
    <div class="card p-10 text-center">
      <p class="text-on-surface-variant">Scraper "{scraperName}" not found</p>
    </div>
  {:else}
    <!-- Header -->
    <FadeIn>
      <div class="card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <div>
              <div class="flex items-center gap-3">
                <h1 class="font-headline text-xl font-bold text-on-surface">{scraper.name}</h1>
                <StatusBadge status={scraper.isRunning ? 'running' : (scraper.lastRun?.status || 'idle')} />
              </div>
              <p class="text-sm text-on-surface-variant mt-1.5">{scraper.description}</p>
            </div>
          </div>
          <div class="flex gap-2.5">
            {#if scraper.isRunning}
              <button onclick={handleCancel} disabled={cancelling} class="btn-danger">
                {cancelling ? 'Cancelling...' : 'Cancel Run'}
              </button>
            {:else}
              <button onclick={() => (showModal = true)} class="btn-primary">
                Trigger Run
              </button>
            {/if}
          </div>
        </div>

        {#if scraper.lastRun}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-6 pt-6 border-t border-outline-variant/50">
            <div>
              <p class="stat-label">Last run</p>
              <p class="text-sm font-medium text-on-surface mt-1.5">
                {new Date(scraper.lastRun.startedAt).toLocaleString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <p class="stat-label">Duration</p>
              <p class="text-sm font-medium text-on-surface mt-1.5 tabular-nums">
                {scraper.lastRun.durationMs ? `${(scraper.lastRun.durationMs / 1000).toFixed(1)}s` : '-'}
              </p>
            </div>
            <div>
              <p class="stat-label">Churches found</p>
              <p class="text-sm font-medium text-on-surface mt-1.5 tabular-nums">
                <NumberTicker value={scraper.lastRun.churchesFound} duration={800} />
              </p>
            </div>
            <div>
              <p class="stat-label">Success rate</p>
              <p class="text-sm font-medium text-on-surface mt-1.5 tabular-nums">
                {scraper.successRate !== null ? `${scraper.successRate}%` : '-'}
              </p>
            </div>
          </div>
        {/if}
      </div>
    </FadeIn>

    <!-- Per-church progress grid -->
    {#if (scraper.name === 'church-website' || scraper.name === 'messes.info') && sseLogs.length > 0}
      <FadeIn>
        <WebsiteScraperGrid
          logs={sseLogs}
          title={scraper.name === 'church-website' ? 'Website Analysis' : 'Church Scraping'}
        />
      </FadeIn>
    {/if}

    <!-- Live Activity Feed -->
    {#if sseRunId && sseLogs.length > 0}
      <FadeIn>
        <LiveActivityFeed logs={sseLogs} connected={sseConnected} isRunning={scraper.isRunning} />
      </FadeIn>
    {/if}

    <!-- Live Browser Preview -->
    {#if sseRunId && (sseFrames.length > 0 || scraper.isRunning)}
      <FadeIn>
        <BrowserPreview frames={sseFrames} connected={sseConnected} />
      </FadeIn>
    {/if}

    <!-- Run Results -->
    {#if lastCompletedRunId && (churchResults || resultsSummary)}
      <FadeIn>
        <RunResultsPanel
          results={churchResults}
          summary={resultsSummary}
          expired={resultsExpired}
          onDismiss={dismissResults}
        />
      </FadeIn>
    {/if}

    <!-- Run history -->
    <FadeIn delay={100}>
      <div class="card p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="section-title">Run History</h2>
          <span class="text-xs text-on-surface-variant tabular-nums">{total} total runs</span>
        </div>

        <RunHistoryTable {runs} onCancel={loadData} />

        <!-- Pagination -->
        {#if totalPages > 1}
          <div class="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-outline-variant/40">
            <button
              onclick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              class="btn-ghost !text-xs"
            >
              Prev
            </button>
            <span class="text-sm text-on-surface-variant tabular-nums px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onclick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              class="btn-ghost !text-xs"
            >
              Next
            </button>
          </div>
        {/if}
      </div>
    </FadeIn>
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
