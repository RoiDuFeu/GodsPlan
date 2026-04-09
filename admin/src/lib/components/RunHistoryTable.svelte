<script lang="ts">
  import type { ScraperRunSummary, ScraperRunDetail } from '$lib/types';
  import { getRunDetail, cancelScraper } from '$lib/api';
  import StatusBadge from './StatusBadge.svelte';
  import ErrorDetails from './ErrorDetails.svelte';

  interface Props {
    runs: ScraperRunSummary[];
    showScraperName?: boolean;
    onCancel?: () => void;
  }

  let { runs, showScraperName = false, onCancel }: Props = $props();

  let expandedId = $state<string | null>(null);
  let expandedDetail = $state<ScraperRunDetail | null>(null);
  let loadingDetail = $state(false);
  let cancellingRun = $state<string | null>(null);

  async function handleCancel(e: MouseEvent, run: ScraperRunSummary) {
    e.stopPropagation();
    cancellingRun = run.id;
    try {
      await cancelScraper(run.scraperName);
      onCancel?.();
    } catch {
      // error handled
    }
    cancellingRun = null;
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      expandedId = null;
      expandedDetail = null;
      return;
    }

    expandedId = id;
    loadingDetail = true;
    try {
      expandedDetail = await getRunDetail(id);
    } catch {
      expandedDetail = null;
    }
    loadingDetail = false;
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}min`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('fr-FR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

{#if runs.length === 0}
  <p class="text-sm text-muted-foreground py-10 text-center">No runs yet</p>
{:else}
  <!-- Desktop table -->
  <div class="hidden md:block overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="table-header">
          {#if showScraperName}
            <th>Scraper</th>
          {/if}
          <th>Status</th>
          <th>Started</th>
          <th>Duration</th>
          <th class="text-right">Churches</th>
          <th class="text-right">Errors</th>
          <th>Depts</th>
        </tr>
      </thead>
      <tbody>
        {#each runs as run}
          <tr
            class="table-row cursor-pointer"
            onclick={() => toggleExpand(run.id)}
          >
            {#if showScraperName}
              <td class="font-medium text-on-surface">{run.scraperName}</td>
            {/if}
            <td>
              <div class="flex items-center gap-2">
                <StatusBadge status={run.status} size="sm" />
                {#if run.status === 'running'}
                  <button
                    onclick={(e) => handleCancel(e, run)}
                    disabled={cancellingRun === run.id}
                    class="px-2 py-0.5 rounded text-[10px] font-semibold bg-destructive/12 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-40"
                  >
                    {cancellingRun === run.id ? '...' : 'Cancel'}
                  </button>
                {/if}
              </div>
            </td>
            <td class="text-on-surface-variant">{formatDate(run.startedAt)}</td>
            <td class="text-on-surface-variant tabular-nums">{formatDuration(run.durationMs)}</td>
            <td class="text-right text-on-surface tabular-nums">{run.churchesFound}</td>
            <td class="text-right tabular-nums {run.errorCount > 0 ? 'text-destructive font-medium' : 'text-on-surface-variant'}">
              {run.errorCount}
            </td>
            <td class="text-on-surface-variant text-xs">
              {run.departments.length > 0 ? run.departments.join(', ') : '-'}
            </td>
          </tr>
          {#if expandedId === run.id}
            <tr>
              <td colspan={showScraperName ? 7 : 6} class="p-5 bg-surface-dim/50">
                {#if loadingDetail}
                  <p class="text-sm text-muted-foreground">Loading errors...</p>
                {:else if expandedDetail}
                  <ErrorDetails errors={expandedDetail.errors} />
                {/if}
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile card view -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="md:hidden space-y-2.5">
    {#each runs as run}
      <div
        class="w-full text-left card p-4 space-y-3 cursor-pointer hover:bg-surface-container-high/30 transition-colors"
        onclick={() => toggleExpand(run.id)}
      >
        <div class="flex items-center justify-between">
          {#if showScraperName}
            <span class="font-medium text-on-surface text-sm">{run.scraperName}</span>
          {:else}
            <span class="text-on-surface-variant text-sm">{formatDate(run.startedAt)}</span>
          {/if}
          <div class="flex items-center gap-2">
            <StatusBadge status={run.status} size="sm" />
            {#if run.status === 'running'}
              <button
                onclick={(e) => handleCancel(e, run)}
                disabled={cancellingRun === run.id}
                class="px-2 py-0.5 rounded text-[10px] font-semibold bg-destructive/12 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-40"
              >
                {cancellingRun === run.id ? '...' : 'Cancel'}
              </button>
            {/if}
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p class="text-muted-foreground">Duration</p>
            <p class="text-on-surface font-medium tabular-nums">{formatDuration(run.durationMs)}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Churches</p>
            <p class="text-on-surface font-medium tabular-nums">{run.churchesFound}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Errors</p>
            <p class="{run.errorCount > 0 ? 'text-destructive' : 'text-on-surface'} font-medium tabular-nums">{run.errorCount}</p>
          </div>
        </div>

        {#if showScraperName}
          <p class="text-xs text-on-surface-variant">{formatDate(run.startedAt)}</p>
        {/if}

        {#if expandedId === run.id}
          <div class="pt-3 border-t border-outline-variant/40" onclick={(e) => e.stopPropagation()}>
            {#if loadingDetail}
              <p class="text-sm text-muted-foreground">Loading...</p>
            {:else if expandedDetail}
              <ErrorDetails errors={expandedDetail.errors} />
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
