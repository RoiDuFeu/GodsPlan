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

<div class="card p-6">
  <div class="flex items-center justify-between mb-5">
    <h2 class="section-title">Run Results</h2>
    <button onclick={onDismiss} class="btn-ghost !text-xs">
      Dismiss
    </button>
  </div>

  <!-- Summary cards -->
  {#if displaySummary}
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <div class="bg-surface-dim rounded-xl p-3.5 text-center">
        <p class="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">Total</p>
        <p class="text-lg font-bold text-on-surface mt-1 tabular-nums">{displaySummary.total}</p>
      </div>
      <div class="bg-surface-dim rounded-xl p-3.5 text-center">
        <p class="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">Success</p>
        <p class="text-lg font-bold text-success mt-1 tabular-nums">{displaySummary.success}</p>
      </div>
      <div class="bg-surface-dim rounded-xl p-3.5 text-center">
        <p class="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">Errors</p>
        <p class="text-lg font-bold text-destructive mt-1 tabular-nums">{displaySummary.errors}</p>
      </div>
      <div class="bg-surface-dim rounded-xl p-3.5 text-center">
        <p class="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">No Schedules</p>
        <p class="text-lg font-bold text-warning mt-1 tabular-nums">{displaySummary.missingSchedules}</p>
      </div>
      <div class="bg-surface-dim rounded-xl p-3.5 text-center">
        <p class="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">No Phone</p>
        <p class="text-lg font-bold text-warning mt-1 tabular-nums">{displaySummary.missingPhone}</p>
      </div>
      <div class="bg-surface-dim rounded-xl p-3.5 text-center">
        <p class="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">No Coords</p>
        <p class="text-lg font-bold text-warning mt-1 tabular-nums">{displaySummary.missingCoords}</p>
      </div>
    </div>
  {/if}

  {#if expired && !results}
    <p class="text-sm text-on-surface-variant text-center py-6">
      Detailed results have expired. Only the summary above is available.
    </p>
  {:else if results}
    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-5">
      <div class="flex gap-1.5">
        {#each [
          { key: 'all', label: 'All' },
          { key: 'success', label: 'Complete' },
          { key: 'missing', label: 'Missing data' },
          { key: 'error', label: 'Errors' },
        ] as opt}
          <button
            onclick={() => (filter = opt.key as typeof filter)}
            class="{filter === opt.key ? 'filter-chip-active' : 'filter-chip-inactive'}"
          >
            {opt.label}
          </button>
        {/each}
      </div>
      <input
        type="text"
        placeholder="Search churches..."
        bind:value={searchQuery}
        class="input flex-1 !min-h-[36px] !py-1.5 !text-xs"
      />
    </div>

    <!-- Results table -->
    <div class="max-h-96 overflow-y-auto rounded-xl">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-surface-container z-10">
          <tr class="table-header">
            <th>Church</th>
            <th class="text-center w-16">Schedules</th>
            <th class="text-center w-14">Phone</th>
            <th class="text-center w-14">Email</th>
            <th class="text-center w-14">Web</th>
            <th class="text-center w-14">GPS</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredResults && filteredResults.length > 0}
            {#each filteredResults as church (church.url)}
              <tr class="table-row">
                <td>
                  {#if church.status === 'error'}
                    <span class="text-destructive">{church.name}</span>
                    {#if church.errorMessage}
                      <span class="block text-[10px] text-destructive/60 truncate max-w-xs" title={church.errorMessage}>
                        {church.errorMessage}
                      </span>
                    {/if}
                  {:else}
                    <span class="text-on-surface">{church.name}</span>
                  {/if}
                </td>
                <td class="text-center {church.hasSchedules ? 'text-success' : 'text-on-surface-variant/40'}">{church.hasSchedules ? '\u2713' : '\u2717'}</td>
                <td class="text-center {church.hasPhone ? 'text-success' : 'text-on-surface-variant/40'}">{church.hasPhone ? '\u2713' : '\u2717'}</td>
                <td class="text-center {church.hasEmail ? 'text-success' : 'text-on-surface-variant/40'}">{church.hasEmail ? '\u2713' : '\u2717'}</td>
                <td class="text-center {church.hasWebsite ? 'text-success' : 'text-on-surface-variant/40'}">{church.hasWebsite ? '\u2713' : '\u2717'}</td>
                <td class="text-center {church.hasCoordinates ? 'text-success' : 'text-on-surface-variant/40'}">{church.hasCoordinates ? '\u2713' : '\u2717'}</td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="6" class="py-6 text-center text-on-surface-variant">No results match this filter</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    {#if filteredResults}
      <p class="text-[10px] text-on-surface-variant mt-3 text-right tabular-nums">
        Showing {filteredResults.length} of {results.length} churches
      </p>
    {/if}
  {/if}
</div>
