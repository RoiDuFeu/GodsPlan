<script lang="ts">
  import { triggerScraper } from '$lib/api';

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
  let submitting = $state(false);
  let errorMsg = $state<string | null>(null);

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
      await triggerScraper(scraperName, departments);
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
  class="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center"
  onclick={onClose}
>
  <!-- Modal -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="bg-surface-container w-full md:max-w-md md:rounded-2xl rounded-t-2xl border border-outline-variant p-6 max-h-[90vh] overflow-y-auto"
    onclick={(e) => e.stopPropagation()}
  >
    <h2 class="font-headline text-lg font-bold text-on-surface mb-1">
      Trigger {scraperName}
    </h2>
    <p class="text-sm text-on-surface-variant mb-5">Start a new scraping run</p>

    {#if supportsDepartments}
      <div class="mb-5">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium text-on-surface">Departments</p>
          <div class="flex gap-2">
            <button onclick={selectAll} class="text-xs text-primary hover:underline">All</button>
            <button onclick={selectNone} class="text-xs text-on-surface-variant hover:underline">None</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          {#each IDF_DEPARTMENTS as dept}
            <button
              onclick={() => toggleDept(dept.code)}
              class="flex items-center gap-2 p-3 rounded-lg text-sm text-left transition-colors min-h-[44px]
                {selectedDepts.has(dept.code)
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-surface-container-high text-on-surface-variant border border-transparent hover:border-outline'}"
            >
              <span class="font-mono text-xs font-bold w-6">{dept.code}</span>
              <span class="truncate">{dept.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if errorMsg}
      <p class="text-sm text-destructive mb-4 bg-destructive/10 rounded-lg p-3">{errorMsg}</p>
    {/if}

    <div class="flex gap-3">
      <button
        onclick={onClose}
        class="flex-1 py-3 rounded-lg text-sm font-medium bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
      >
        Cancel
      </button>
      <button
        onclick={handleTrigger}
        disabled={submitting || (supportsDepartments && selectedDepts.size === 0)}
        class="flex-1 py-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Starting...' : 'Start Scraping'}
      </button>
    </div>
  </div>
</div>
