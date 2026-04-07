<script lang="ts">
  import type { ScraperLogEntry } from '$lib/types';

  interface Props {
    runId: string;
    isRunning: boolean;
  }

  let { runId, isRunning }: Props = $props();

  let logs = $state<ScraperLogEntry[]>([]);
  let connected = $state(false);
  let feedEl: HTMLDivElement | undefined = $state();
  let autoScroll = $state(true);
  let eventSource: EventSource | null = null;

  const levelIcons: Record<string, string> = {
    info: '\u2139',
    success: '\u2713',
    warn: '\u26A0',
    error: '\u2717',
  };

  const levelColors: Record<string, string> = {
    info: 'text-secondary',
    success: 'text-success',
    warn: 'text-primary',
    error: 'text-destructive',
  };

  function connect(id: string) {
    disconnect();
    logs = [];
    connected = false;

    eventSource = new EventSource(`/api/v1/admin/scrapers/runs/${id}/logs`);

    eventSource.onopen = () => {
      connected = true;
    };

    eventSource.onmessage = (event) => {
      const entry: ScraperLogEntry = JSON.parse(event.data);
      logs = [...logs, entry];

      if (autoScroll && feedEl) {
        requestAnimationFrame(() => {
          feedEl!.scrollTop = feedEl!.scrollHeight;
        });
      }
    };

    eventSource.addEventListener('done', () => {
      connected = false;
      disconnect();
    });

    eventSource.onerror = () => {
      connected = false;
      disconnect();
    };
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

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

  // React to runId / isRunning changes
  $effect(() => {
    if (runId && isRunning) {
      connect(runId);
    }
    return () => disconnect();
  });
</script>

<div class="bg-surface-container rounded-xl border border-outline-variant p-5">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-3">
      <h2 class="font-headline font-bold text-on-surface">Live Activity</h2>
      {#if connected}
        <span class="inline-flex items-center gap-1.5 text-xs text-success">
          <span class="w-2 h-2 bg-success rounded-full animate-pulse"></span>
          Connected
        </span>
      {:else if isRunning}
        <span class="text-xs text-on-surface-variant">Connecting...</span>
      {:else}
        <span class="text-xs text-on-surface-variant">
          {logs.length > 0 ? `${logs.length} log entries` : 'Waiting for run...'}
        </span>
      {/if}
    </div>
    {#if logs.length > 0}
      {@const last = logs[logs.length - 1]}
      {#if last.progress}
        <div class="flex items-center gap-2">
          <div class="w-32 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              class="h-full bg-primary rounded-full transition-all duration-300"
              style="width: {(last.progress.current / last.progress.total) * 100}%"
            ></div>
          </div>
          <span class="text-xs text-on-surface-variant font-mono">{last.progress.current}/{last.progress.total}</span>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Log feed -->
  <div
    bind:this={feedEl}
    onscroll={handleScroll}
    class="h-80 overflow-y-auto font-mono text-xs space-y-0.5 bg-surface-dim rounded-lg p-3 scroll-smooth"
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
        <div class="flex gap-2 py-0.5 hover:bg-surface-container-low/50 rounded px-1 -mx-1">
          <span class="text-on-surface-variant shrink-0 w-16">{formatTime(entry.timestamp)}</span>
          <span class="shrink-0 w-4 text-center {levelColors[entry.level]}">{levelIcons[entry.level]}</span>
          <span class="text-on-surface flex-1 break-all">
            {entry.message}
            {#if entry.url}
              <span class="text-on-surface-variant ml-1" title={entry.url}>{shortenUrl(entry.url)}</span>
            {/if}
          </span>
          {#if entry.phase}
            <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">{entry.phase}</span>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
