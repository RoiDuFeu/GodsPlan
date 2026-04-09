<script lang="ts">
  import type { ScraperLogEntry } from '$lib/types';

  interface Props {
    logs: ScraperLogEntry[];
    connected: boolean;
    isRunning: boolean;
  }

  let { logs, connected, isRunning }: Props = $props();

  let feedEl: HTMLDivElement | undefined = $state();
  let autoScroll = $state(true);
  let prevLogCount = $state(0);

  const levelIcons: Record<string, string> = {
    info: '\u2139',
    success: '\u2713',
    warn: '\u26A0',
    error: '\u2717',
  };

  const levelColors: Record<string, string> = {
    info: 'text-secondary',
    success: 'text-success',
    warn: 'text-warning',
    error: 'text-destructive',
  };

  function handleScroll() {
    if (!feedEl) return;
    const atBottom = feedEl.scrollHeight - feedEl.scrollTop - feedEl.clientHeight < 40;
    autoScroll = atBottom;
  }

  function formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function shortenUrl(url?: string): string {
    if (!url) return '';
    try {
      const u = new URL(url);
      return u.pathname.length > 40 ? '...' + u.pathname.slice(-37) : u.pathname;
    } catch {
      return url.length > 40 ? '...' + url.slice(-37) : url;
    }
  }

  // Auto-scroll when new logs arrive
  $effect(() => {
    if (logs.length > prevLogCount && autoScroll && feedEl) {
      prevLogCount = logs.length;
      requestAnimationFrame(() => {
        feedEl!.scrollTop = feedEl!.scrollHeight;
      });
    }
  });
</script>

<div class="card p-6">
  <div class="flex items-center justify-between mb-5">
    <div class="flex items-center gap-3">
      <h2 class="section-title">Live Activity</h2>
      {#if connected}
        <span class="inline-flex items-center gap-1.5 text-[11px] text-success font-medium">
          <span class="w-2 h-2 bg-success rounded-full animate-pulse"></span>
          Connected
        </span>
      {:else if isRunning}
        <span class="text-[11px] text-on-surface-variant font-medium">Connecting...</span>
      {:else}
        <span class="text-[11px] text-on-surface-variant font-medium">
          {logs.length > 0 ? `${logs.length} log entries` : 'Waiting for run...'}
        </span>
      {/if}
    </div>
    {#if logs.length > 0}
      {@const last = logs[logs.length - 1]}
      {#if last.progress}
        <div class="flex items-center gap-3">
          <div class="w-32 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              class="h-full bg-primary rounded-full transition-all duration-300"
              style="width: {(last.progress.current / last.progress.total) * 100}%"
            ></div>
          </div>
          <span class="text-[11px] text-on-surface-variant font-mono tabular-nums">{last.progress.current}/{last.progress.total}</span>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Log feed -->
  <div
    bind:this={feedEl}
    onscroll={handleScroll}
    class="h-80 overflow-y-auto font-mono text-xs space-y-0.5 bg-surface-dim rounded-xl p-4 scroll-smooth"
  >
    {#if logs.length === 0}
      <div class="flex items-center justify-center h-full text-on-surface-variant text-sm">
        {#if isRunning}
          <span class="animate-pulse">Waiting for logs...</span>
        {:else}
          <span>Trigger a run to see live activity</span>
        {/if}
      </div>
    {:else}
      {#each logs as entry (entry.timestamp + entry.message)}
        <div class="flex gap-2 py-0.5 hover:bg-surface-container-low/50 rounded px-1.5 -mx-1.5">
          <span class="text-on-surface-variant/60 shrink-0 w-16 tabular-nums">{formatTime(entry.timestamp)}</span>
          <span class="shrink-0 w-4 text-center {levelColors[entry.level]}">{levelIcons[entry.level]}</span>
          <span class="text-on-surface/80 flex-1 break-all">
            {entry.message}
            {#if entry.url}
              <span class="text-on-surface-variant/50 ml-1" title={entry.url}>{shortenUrl(entry.url)}</span>
            {/if}
          </span>
          {#if entry.phase}
            <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-medium">{entry.phase}</span>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
