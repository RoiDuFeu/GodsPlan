<script lang="ts">
  import type { ScreencastFrame } from '$lib/types';

  interface Props {
    frames: ScreencastFrame[];
    connected: boolean;
  }

  let { frames, connected }: Props = $props();

  // Group latest frame per worker
  let workerFrames = $derived.by(() => {
    const map = new Map<number, ScreencastFrame>();
    for (const frame of frames) {
      const idx = frame.workerIndex ?? 0;
      map.set(idx, frame);
    }
    return map;
  });

  let workerIndices = $derived([...workerFrames.keys()].sort((a, b) => a - b));

  function shortenUrl(url?: string): string {
    if (!url) return '';
    try {
      const u = new URL(url);
      const path = u.pathname + u.search;
      return u.hostname + (path.length > 30 ? path.slice(0, 27) + '...' : path);
    } catch {
      return url.length > 40 ? url.slice(0, 37) + '...' : url;
    }
  }
</script>

<div class="card p-4">
  <div class="flex items-center justify-between mb-3">
    <div class="flex items-center gap-3">
      <h2 class="section-title">Live Browser</h2>
      {#if connected && frames.length > 0}
        <span class="inline-flex items-center gap-1.5 text-[11px] text-success font-medium">
          <span class="w-2 h-2 bg-success rounded-full animate-pulse"></span>
          {workerIndices.length} worker{workerIndices.length > 1 ? 's' : ''}
        </span>
      {:else if connected}
        <span class="text-[11px] text-on-surface-variant font-medium">Waiting for frames...</span>
      {:else}
        <span class="text-[11px] text-on-surface-variant font-medium">
          {frames.length > 0 ? 'Stream ended' : 'No stream'}
        </span>
      {/if}
    </div>
  </div>

  {#if workerIndices.length > 0}
    <div class="flex gap-2 overflow-x-auto pb-1">
      {#each workerIndices as idx}
        {@const frame = workerFrames.get(idx)}
        {#if frame}
          <div class="shrink-0 flex flex-col gap-1 w-56">
            <!-- Title bar -->
            <div class="flex items-center gap-1 px-1.5 py-0.5 bg-surface-dim rounded-t-lg border border-b-0 border-outline-variant/30">
              <div class="flex gap-0.5 mr-1">
                <span class="w-1.5 h-1.5 rounded-full bg-destructive/60"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-warning/60"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-success/60"></span>
              </div>
              <span class="text-[9px] font-mono font-semibold text-primary">W{idx}</span>
              <span class="text-[9px] font-mono text-on-surface-variant/60 truncate">{shortenUrl(frame.pageUrl)}</span>
            </div>

            <!-- Browser viewport -->
            <div class="relative bg-surface-dim rounded-b-lg overflow-hidden border border-t-0 border-outline-variant/30 h-36">
              <img
                src="data:image/jpeg;base64,{frame.image}"
                alt="Worker {idx}"
                class="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <div class="bg-surface-dim rounded-xl border border-outline-variant/30 h-36 flex items-center justify-center">
      <div class="text-center text-on-surface-variant text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-6 h-6 mx-auto mb-1.5 opacity-30">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </svg>
        <span class="opacity-50 text-xs">Browser preview will appear when scraping starts</span>
      </div>
    </div>
  {/if}
</div>
