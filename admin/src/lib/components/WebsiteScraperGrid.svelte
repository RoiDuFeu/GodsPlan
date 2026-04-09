<script lang="ts">
  import type { ScraperLogEntry, ChurchUpdateData } from '$lib/types';

  interface Props {
    logs: ScraperLogEntry[];
    title?: string;
  }

  let { logs, title = 'Church Progress' }: Props = $props();

  let churches = $derived.by(() => {
    const map = new Map<string, ChurchUpdateData>();
    for (const entry of logs) {
      if (entry.churchUpdate) {
        map.set(entry.churchUpdate.churchId, entry.churchUpdate);
      }
    }
    return map;
  });

  let sortedChurches = $derived.by(() => {
    const arr = Array.from(churches.values());
    const order: Record<string, number> = { scraping: 0, pending: 1, success: 2, no_data: 3, error: 4 };
    return arr.sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));
  });

  let stats = $derived.by(() => {
    const arr = Array.from(churches.values());
    return {
      total: arr.length,
      pending: arr.filter(c => c.status === 'pending').length,
      scraping: arr.filter(c => c.status === 'scraping').length,
      success: arr.filter(c => c.status === 'success').length,
      noData: arr.filter(c => c.status === 'no_data').length,
      error: arr.filter(c => c.status === 'error').length,
    };
  });

  let completedCount = $derived(stats.success + stats.noData + stats.error);

  function statusColor(status: string): string {
    switch (status) {
      case 'pending': return 'border-outline-variant/50 bg-surface-dim';
      case 'scraping': return 'border-secondary/40 bg-secondary/8 animate-pulse';
      case 'success': return 'border-success/40 bg-success/8';
      case 'no_data': return 'border-on-surface-variant/30 bg-surface-container-high';
      case 'error': return 'border-destructive/40 bg-destructive/8';
      default: return 'border-outline-variant/50 bg-surface-dim';
    }
  }

  function statusIcon(status: string): string {
    switch (status) {
      case 'pending': return '\u23F3';
      case 'scraping': return '\u21BB';
      case 'success': return '\u2713';
      case 'no_data': return '\u2014';
      case 'error': return '\u2717';
      default: return '?';
    }
  }

  function statusIconColor(status: string): string {
    switch (status) {
      case 'pending': return 'text-on-surface-variant';
      case 'scraping': return 'text-secondary';
      case 'success': return 'text-success';
      case 'no_data': return 'text-on-surface-variant';
      case 'error': return 'text-destructive';
      default: return 'text-on-surface-variant';
    }
  }
</script>

{#if sortedChurches.length > 0}
  <div class="card p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <h2 class="section-title">{title}</h2>
      {#if stats.total > 0}
        <span class="text-[11px] text-on-surface-variant font-mono tabular-nums">{completedCount}/{stats.total}</span>
      {/if}
    </div>

    <!-- Stats row -->
    <div class="flex flex-wrap gap-5 mb-5 text-xs">
      {#if stats.pending > 0}
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-on-surface-variant/25"></span>
          <span class="text-on-surface-variant font-medium">Pending: <span class="tabular-nums">{stats.pending}</span></span>
        </div>
      {/if}
      {#if stats.scraping > 0}
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
          <span class="text-on-surface-variant font-medium">Scraping: <span class="tabular-nums">{stats.scraping}</span></span>
        </div>
      {/if}
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-success"></span>
        <span class="text-on-surface-variant font-medium">Found: <span class="tabular-nums">{stats.success}</span></span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-on-surface-variant/40"></span>
        <span class="text-on-surface-variant font-medium">No data: <span class="tabular-nums">{stats.noData}</span></span>
      </div>
      {#if stats.error > 0}
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-destructive"></span>
          <span class="text-on-surface-variant font-medium">Error: <span class="tabular-nums">{stats.error}</span></span>
        </div>
      {/if}
    </div>

    <!-- Progress bar -->
    {#if stats.total > 0}
      <div class="w-full h-2 bg-surface-dim rounded-full overflow-hidden mb-6">
        <div
          class="h-full bg-success rounded-full transition-all duration-500 ease-out"
          style="width: {(completedCount / stats.total) * 100}%"
        ></div>
      </div>
    {/if}

    <!-- Card grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 max-h-[600px] overflow-y-auto">
      {#each sortedChurches as church (church.churchId)}
        <div
          class="relative rounded-xl border-2 p-3 transition-all duration-300 {statusColor(church.status)}"
          title={church.websiteUrl}
        >
          <!-- Status icon -->
          <div class="flex items-start justify-between gap-1 mb-1.5">
            <span class="text-lg leading-none {statusIconColor(church.status)}">{statusIcon(church.status)}</span>
            {#if church.confidence != null}
              <span class="text-[10px] font-mono text-on-surface-variant tabular-nums">{church.confidence}%</span>
            {/if}
          </div>

          <!-- Church name -->
          <p class="text-xs font-medium text-on-surface leading-tight line-clamp-2 mb-1" title={church.churchName}>
            {church.churchName}
          </p>

          <!-- Results (when done) -->
          {#if church.status === 'success'}
            <div class="flex gap-2 mt-1.5 text-[10px] text-on-surface-variant tabular-nums">
              {#if church.massSchedules}
                <span title="Masses">{church.massSchedules} masses</span>
              {/if}
              {#if church.officeSchedules}
                <span title="Offices">{church.officeSchedules} offices</span>
              {/if}
              {#if church.events}
                <span title="Events">{church.events} events</span>
              {/if}
            </div>
          {:else if church.status === 'error'}
            <p class="text-[10px] text-destructive/70 line-clamp-1 mt-1" title={church.errorMessage}>
              {church.errorMessage || 'Error'}
            </p>
          {:else if church.status === 'scraping'}
            <p class="text-[10px] text-secondary mt-1 font-medium">Analyzing...</p>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}
