<script lang="ts">
  import type { ChurchResult, ResultsSummary } from '$lib/types';

  interface Props {
    results: ChurchResult[] | null;
    summary: ResultsSummary | null;
    expired: boolean;
    onDismiss: () => void;
  }

  let { results, summary, expired, onDismiss }: Props = $props();

  let filter = $state<'all' | 'success' | 'missing' | 'error'>('all');
  let searchQuery = $state('');

  let displaySummary = $derived.by(() => {
    if (summary) return summary;
    if (!results) return null;
    const success = results.filter(r => r.status === 'success').length;
    return {
      total: results.length,
      success,
      errors: results.filter(r => r.status === 'error').length,
      missingSchedules: results.filter(r => r.status === 'success' && !r.hasSchedules).length,
      missingPhone: results.filter(r => r.status === 'success' && !r.hasPhone).length,
      missingCoords: results.filter(r => r.status === 'success' && !r.hasCoordinates).length,
    };
  });

  let filteredResults = $derived.by(() => {
    if (!results) return null;
    let list = results;

    if (filter === 'success') {
      list = list.filter(r => r.status === 'success' && r.hasSchedules && r.hasPhone && r.hasCoordinates);
    } else if (filter === 'missing') {
      list = list.filter(r => r.status === 'success' && (!r.hasSchedules || !r.hasPhone || !r.hasCoordinates));
    } else if (filter === 'error') {
      list = list.filter(r => r.status === 'error');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q));
    }

    return list;
  });
</script>

<div class="bg-surface-container rounded-xl border border-outline-variant p-5">
  <div class="flex items-center justify-between mb-4">
    <h2 class="font-headline font-bold text-on-surface">Run Results</h2>
    <button
      onclick={onDismiss}
      class="text-xs text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1"
    >
      Dismiss
    </button>
  </div>

  <!-- Summary cards -->
  {#if displaySummary}
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      <div class="bg-surface-dim rounded-lg p-3 text-center">
        <p class="text-xs text-on-surface-variant">Total</p>
        <p class="text-lg font-bold text-on-surface">{displaySummary.total}</p>
      </div>
      <div class="bg-surface-dim rounded-lg p-3 text-center">
        <p class="text-xs text-on-surface-variant">Success</p>
        <p class="text-lg font-bold text-success">{displaySummary.success}</p>
      </div>
      <div class="bg-surface-dim rounded-lg p-3 text-center">
        <p class="text-xs text-on-surface-variant">Errors</p>
        <p class="text-lg font-bold text-destructive">{displaySummary.errors}</p>
      </div>
      <div class="bg-surface-dim rounded-lg p-3 text-center">
        <p class="text-xs text-on-surface-variant">No Schedules</p>
        <p class="text-lg font-bold text-primary">{displaySummary.missingSchedules}</p>
      </div>
      <div class="bg-surface-dim rounded-lg p-3 text-center">
        <p class="text-xs text-on-surface-variant">No Phone</p>
        <p class="text-lg font-bold text-primary">{displaySummary.missingPhone}</p>
      </div>
      <div class="bg-surface-dim rounded-lg p-3 text-center">
        <p class="text-xs text-on-surface-variant">No Coords</p>
        <p class="text-lg font-bold text-primary">{displaySummary.missingCoords}</p>
      </div>
    </div>
  {/if}

  {#if expired && !results}
    <p class="text-sm text-on-surface-variant text-center py-4">
      Detailed results have expired. Only the summary above is available.
    </p>
  {:else if results}
    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <div class="flex gap-1.5">
        {#each [
          { key: 'all', label: 'All' },
          { key: 'success', label: 'Complete' },
          { key: 'missing', label: 'Missing data' },
          { key: 'error', label: 'Errors' },
        ] as opt}
          <button
            onclick={() => (filter = opt.key as typeof filter)}
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors {filter === opt.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}"
          >
            {opt.label}
          </button>
        {/each}
      </div>
      <input
        type="text"
        placeholder="Search churches..."
        bind:value={searchQuery}
        class="flex-1 px-3 py-1.5 rounded-lg text-sm bg-surface-dim text-on-surface placeholder:text-on-surface-variant border border-outline-variant focus:border-primary focus:outline-none"
      />
    </div>

    <!-- Results table -->
    <div class="max-h-96 overflow-y-auto rounded-lg">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-surface-container">
          <tr class="border-b border-outline-variant text-left text-on-surface-variant">
            <th class="py-2 px-2 font-medium">Church</th>
            <th class="py-2 px-2 font-medium text-center w-16">Schedules</th>
            <th class="py-2 px-2 font-medium text-center w-14">Phone</th>
            <th class="py-2 px-2 font-medium text-center w-14">Email</th>
            <th class="py-2 px-2 font-medium text-center w-14">Web</th>
            <th class="py-2 px-2 font-medium text-center w-14">GPS</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredResults && filteredResults.length > 0}
            {#each filteredResults as church (church.url)}
              <tr class="border-b border-outline-variant/30 hover:bg-surface-container-low/50">
                <td class="py-1.5 px-2">
                  {#if church.status === 'error'}
                    <span class="text-destructive">{church.name}</span>
                    {#if church.errorMessage}
                      <span class="block text-[10px] text-destructive/70 truncate max-w-xs" title={church.errorMessage}>
                        {church.errorMessage}
                      </span>
                    {/if}
                  {:else}
                    <span class="text-on-surface">{church.name}</span>
                  {/if}
                </td>
                <td class="py-1.5 px-2 text-center">{church.hasSchedules ? '\u2713' : '\u2717'}</td>
                <td class="py-1.5 px-2 text-center">{church.hasPhone ? '\u2713' : '\u2717'}</td>
                <td class="py-1.5 px-2 text-center">{church.hasEmail ? '\u2713' : '\u2717'}</td>
                <td class="py-1.5 px-2 text-center">{church.hasWebsite ? '\u2713' : '\u2717'}</td>
                <td class="py-1.5 px-2 text-center">{church.hasCoordinates ? '\u2713' : '\u2717'}</td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="6" class="py-4 text-center text-on-surface-variant">No results match this filter</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    {#if filteredResults}
      <p class="text-[10px] text-on-surface-variant mt-2 text-right">
        Showing {filteredResults.length} of {results.length} churches
      </p>
    {/if}
  {/if}
</div>
