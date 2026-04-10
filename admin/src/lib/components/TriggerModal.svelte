<script lang="ts">
  import { triggerScraper } from '$lib/api';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  interface Props {
    scraperName: string;
    supportsDepartments: boolean;
    onClose: () => void;
    onTriggered: () => void;
  }

  let { scraperName, supportsDepartments, onClose, onTriggered }: Props = $props();

  const IDF_DEPARTMENTS = [
    { code: '75', name: 'Paris' },
    { code: '77', name: 'Seine-et-Marne' },
    { code: '78', name: 'Yvelines' },
    { code: '91', name: 'Essonne' },
    { code: '92', name: 'Hauts-de-Seine' },
    { code: '93', name: 'Seine-Saint-Denis' },
    { code: '94', name: 'Val-de-Marne' },
    { code: '95', name: "Val-d'Oise" },
  ];

  let selectedDepts = $state<Set<string>>(new Set(['75']));
  let concurrency = $state(4);
  let onlyMissingData = $state(false);
  let submitting = $state(false);
  let errorMsg = $state<string | null>(null);

  const supportsEnrichment = $derived(scraperName === 'church-website' || scraperName === 'google-maps');

  let resourceLevel = $derived(
    concurrency <= 3 ? 'low' : concurrency <= 6 ? 'moderate' : 'high'
  );
  let estimatedRam = $derived(concurrency * 200);

  function toggleDept(code: string) {
    const next = new Set(selectedDepts);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    selectedDepts = next;
  }

  function selectAll() {
    selectedDepts = new Set(IDF_DEPARTMENTS.map((d) => d.code));
  }

  function selectNone() {
    selectedDepts = new Set();
  }

  async function handleTrigger() {
    submitting = true;
    errorMsg = null;
    try {
      const departments = supportsDepartments ? Array.from(selectedDepts) : [];
      await triggerScraper(scraperName, departments, concurrency, {
        onlyMissingData: supportsEnrichment && onlyMissingData,
      });
      onTriggered();
      onClose();
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to trigger';
    }
    submitting = false;
  }
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
  onclick={onClose}
  transition:fade={{ duration: 200 }}
>
  <!-- Modal -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="bg-surface-container w-full md:max-w-md md:rounded-2xl rounded-t-2xl border border-outline-variant/50 p-6 max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/20"
    onclick={(e) => e.stopPropagation()}
    in:fly={{ y: 100, duration: 300, easing: cubicOut }}
    out:fly={{ y: 100, duration: 200 }}
  >
    <h2 class="font-headline text-lg font-bold text-on-surface mb-1 tracking-tight">
      Trigger {scraperName}
    </h2>
    <p class="text-sm text-on-surface-variant mb-6">Start a new scraping run</p>

    {#if supportsDepartments}
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-semibold text-on-surface">Departments</p>
          <div class="flex gap-3">
            <button onclick={selectAll} class="text-xs text-on-surface font-medium hover:underline">All</button>
            <button onclick={selectNone} class="text-xs text-on-surface-variant font-medium hover:underline">None</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          {#each IDF_DEPARTMENTS as dept}
            <button
              onclick={() => toggleDept(dept.code)}
              class="flex items-center gap-2.5 p-3 rounded-xl text-sm text-left transition-all duration-150 min-h-[44px]
                {selectedDepts.has(dept.code)
                  ? 'bg-surface-container-highest text-on-surface border border-outline'
                  : 'bg-surface-container-high text-on-surface-variant border border-transparent hover:border-outline-variant'}"
            >
              <span class="font-mono text-xs font-bold w-6 tabular-nums">{dept.code}</span>
              <span class="truncate">{dept.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if supportsEnrichment}
      <div class="mb-6">
        <button
          onclick={() => onlyMissingData = !onlyMissingData}
          class="w-full flex items-center justify-between p-3.5 rounded-xl text-sm transition-all duration-150
            {onlyMissingData
              ? 'bg-surface-container-highest text-on-surface border border-outline'
              : 'bg-surface-container-high text-on-surface-variant border border-transparent hover:border-outline-variant'}"
        >
          <div class="flex flex-col items-start gap-0.5">
            <span class="font-semibold">Only missing data</span>
            <span class="text-xs opacity-70">{scraperName === 'google-maps' ? 'Skip churches already enriched by Google Maps' : 'Skip churches that already have mass schedules'}</span>
          </div>
          {#if onlyMissingData}
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          {/if}
        </button>
      </div>
    {/if}

    <!-- Concurrency selector -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <p class="text-sm font-semibold text-on-surface">Parallel threads</p>
        <span class="slider-value font-mono text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg {
          resourceLevel === 'low' ? 'bg-success/10 text-success' :
          resourceLevel === 'moderate' ? 'bg-warning/10 text-warning' :
          'bg-destructive/10 text-destructive'
        }">{concurrency}</span>
      </div>

      <div class="slider-container">
        <input
          type="range"
          min="1"
          max="10"
          bind:value={concurrency}
          class="custom-slider"
          style="--progress: {((concurrency - 1) / 9) * 100}%; --track-color: {
            resourceLevel === 'low' ? 'hsl(var(--success))' :
            resourceLevel === 'moderate' ? 'hsl(var(--warning))' :
            'hsl(var(--destructive))'
          }"
        />
        <!-- Tick marks -->
        <div class="slider-ticks">
          {#each Array(10) as _, i}
            <div
              class="slider-tick"
              class:active={i + 1 <= concurrency}
              style:--tick-color={
                (i + 1) <= 3 ? 'hsl(var(--success))' :
                (i + 1) <= 6 ? 'hsl(var(--warning))' :
                'hsl(var(--destructive))'
              }
            ></div>
          {/each}
        </div>
      </div>

      <!-- Labels -->
      <div class="flex justify-between text-[10px] text-on-surface-variant mt-2 px-0.5 tabular-nums select-none">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>

      <!-- Resource warning -->
      <div class="mt-3 rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2.5 {
        resourceLevel === 'low' ? 'bg-success/8 text-success' :
        resourceLevel === 'moderate' ? 'bg-warning/8 text-warning' :
        'bg-destructive/8 text-destructive'
      }">
        <span class="text-base leading-none">{resourceLevel === 'low' ? '🟢' : resourceLevel === 'moderate' ? '🟡' : '🔴'}</span>
        <span>
          {#if resourceLevel === 'low'}
            Low impact — ~{estimatedRam}MB RAM
          {:else if resourceLevel === 'moderate'}
            Moderate — ~{estimatedRam}MB RAM expected
          {:else}
            High impact — ~{estimatedRam}MB RAM. Each browser uses 100-300MB.
          {/if}
        </span>
      </div>
    </div>

    {#if errorMsg}
      <p class="text-sm text-destructive mb-5 bg-destructive/8 rounded-xl p-3.5 font-medium">{errorMsg}</p>
    {/if}

    <div class="flex gap-3">
      <button onclick={onClose} class="btn-secondary flex-1">
        Cancel
      </button>
      <button
        onclick={handleTrigger}
        disabled={submitting || (supportsDepartments && selectedDepts.size === 0)}
        class="btn-primary flex-1"
      >
        {#if submitting}
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/>
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          </svg>
          Starting...
        {:else}
          Start Scraping
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .slider-container {
    position: relative;
    padding: 4px 0;
  }

  .custom-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--track-color) 0%,
      var(--track-color) var(--progress),
      hsl(var(--surface-container-high)) var(--progress),
      hsl(var(--surface-container-high)) 100%
    );
    outline: none;
    cursor: pointer;
    position: relative;
    z-index: 2;
  }

  /* Webkit thumb */
  .custom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--track-color);
    box-shadow: 0 0 0 4px hsl(var(--surface-container)), 0 2px 8px rgba(0, 0, 0, 0.4);
    cursor: grab;
    transition: box-shadow 0.15s ease, transform 0.15s ease;
  }

  .custom-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 4px hsl(var(--surface-container)), 0 0 12px color-mix(in srgb, var(--track-color) 40%, transparent);
  }

  .custom-slider::-webkit-slider-thumb:active {
    cursor: grabbing;
    transform: scale(1.05);
  }

  /* Firefox thumb */
  .custom-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: var(--track-color);
    box-shadow: 0 0 0 4px hsl(var(--surface-container)), 0 2px 8px rgba(0, 0, 0, 0.4);
    cursor: grab;
    transition: box-shadow 0.15s ease, transform 0.15s ease;
  }

  .custom-slider::-moz-range-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 4px hsl(var(--surface-container)), 0 0 12px color-mix(in srgb, var(--track-color) 40%, transparent);
  }

  .custom-slider::-moz-range-track {
    background: transparent;
    height: 6px;
  }

  /* Tick marks */
  .slider-ticks {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    display: flex;
    justify-content: space-between;
    padding: 0 8px;
    pointer-events: none;
    z-index: 1;
  }

  .slider-tick {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: hsl(var(--outline));
    transition: background 0.15s ease, transform 0.15s ease;
  }

  .slider-tick.active {
    background: var(--tick-color);
    transform: scale(1.2);
  }
</style>
