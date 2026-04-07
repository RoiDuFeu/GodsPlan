<script lang="ts">
  import type { ScraperInfo } from '$lib/types';
  import StatusBadge from './StatusBadge.svelte';

  interface Props {
    scraper: ScraperInfo;
    onTrigger: (name: string) => void;
  }

  let { scraper, onTrigger }: Props = $props();

  function formatDuration(ms: number | null): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}min`;
  }

  function formatTime(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
</script>

<div class="bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col gap-4 hover:border-outline transition-colors">
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h3 class="font-headline font-bold text-on-surface truncate">{scraper.name}</h3>
      <p class="text-sm text-on-surface-variant mt-1 line-clamp-2">{scraper.description}</p>
    </div>
    <StatusBadge status={scraper.isRunning ? 'running' : (scraper.lastRun?.status || 'idle')} />
  </div>

  <div class="grid grid-cols-2 gap-3 text-sm">
    <div>
      <p class="text-on-surface-variant text-xs">Last run</p>
      <p class="text-on-surface font-medium">{formatTime(scraper.lastRun?.startedAt ?? null)}</p>
    </div>
    <div>
      <p class="text-on-surface-variant text-xs">Duration</p>
      <p class="text-on-surface font-medium">{formatDuration(scraper.lastRun?.durationMs ?? null)}</p>
    </div>
    <div>
      <p class="text-on-surface-variant text-xs">Churches</p>
      <p class="text-on-surface font-medium">{scraper.lastRun?.churchesFound ?? '-'}</p>
    </div>
    <div>
      <p class="text-on-surface-variant text-xs">Success rate</p>
      <p class="text-on-surface font-medium">{scraper.successRate !== null ? `${scraper.successRate}%` : '-'}</p>
    </div>
  </div>

  <div class="flex gap-2 mt-auto">
    <a
      href="/scrapers/{scraper.name}"
      class="flex-1 text-center text-sm font-medium py-2.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
    >
      Details
    </a>
    <button
      onclick={() => onTrigger(scraper.name)}
      disabled={scraper.isRunning}
      class="flex-1 text-sm font-medium py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {scraper.isRunning ? 'Running...' : 'Trigger'}
    </button>
  </div>
</div>
