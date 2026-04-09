<script lang="ts">
  import { onMount } from 'svelte';
  import { getChurches } from '$lib/api';
  import type { ChurchAdmin } from '$lib/types';
  import FadeIn from '$lib/components/ui/FadeIn.svelte';
  import NumberTicker from '$lib/components/ui/NumberTicker.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import SelectChips from '$lib/components/ui/SelectChips.svelte';

  let churches = $state<ChurchAdmin[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state('');

  let cityFilter = $state('');
  let nameFilter = $state('');
  let reliabilityFilter = $state<'all' | 'excellent' | 'good' | 'fair' | 'poor'>('all');
  let officeFilter = $state<'all' | 'confession' | 'adoration' | 'vespers' | 'lauds'>('all');
  let currentPage = $state(0);
  const pageSize = 50;

  let debounceTimer: ReturnType<typeof setTimeout>;

  async function loadData() {
    loading = true;
    error = '';
    try {
      const res = await getChurches(cityFilter || undefined, pageSize, currentPage * pageSize);
      churches = res.data;
      total = res.meta.total;
    } catch (e: any) {
      error = e.message || 'Failed to load churches';
    }
    loading = false;
  }

  function onCityInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    cityFilter = value;
    currentPage = 0;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadData, 400);
  }

  function goToPage(page: number) {
    currentPage = page;
    loadData();
  }

  onMount(() => {
    loadData();
    return () => clearTimeout(debounceTimer);
  });

  let filteredChurches = $derived(
    churches.filter((c) => {
      if (nameFilter && !c.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (reliabilityFilter !== 'all') {
        const s = c.reliabilityScore;
        if (reliabilityFilter === 'excellent' && s < 90) return false;
        if (reliabilityFilter === 'good' && (s < 70 || s >= 90)) return false;
        if (reliabilityFilter === 'fair' && (s < 40 || s >= 70)) return false;
        if (reliabilityFilter === 'poor' && s >= 40) return false;
      }
      if (officeFilter !== 'all') {
        if (!c.officeSchedules?.some((o) => o.type === officeFilter)) return false;
      }
      return true;
    })
  );

  let totalPages = $derived(Math.ceil(total / pageSize));
</script>

<div class="page-container space-y-6">
  <!-- Header -->
  <FadeIn>
    <div class="page-header">
      <h1 class="page-title">Churches</h1>
      <p class="page-subtitle">
        <NumberTicker value={total} duration={800} /> churches in database
      </p>
    </div>
  </FadeIn>

  <!-- Filters -->
  <FadeIn delay={60}>
    <div class="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        placeholder="Filter by name..."
        bind:value={nameFilter}
        class="input flex-1"
      />
      <input
        type="text"
        placeholder="Search by city..."
        value={cityFilter}
        oninput={onCityInput}
        class="input flex-1"
      />
      <SelectChips
        options={[
          { value: 'all', label: 'All reliability' },
          { value: 'excellent', label: 'Excellent (90+)' },
          { value: 'good', label: 'Good (70–89)' },
          { value: 'fair', label: 'Fair (40–69)' },
          { value: 'poor', label: 'Poor (<40)' },
        ]}
        value={reliabilityFilter}
        onchange={(v) => reliabilityFilter = v as typeof reliabilityFilter}
      />
      <SelectChips
        options={[
          { value: 'all', label: 'All offices' },
          { value: 'confession', label: 'Confession' },
          { value: 'adoration', label: 'Adoration' },
          { value: 'vespers', label: 'Vespers' },
          { value: 'lauds', label: 'Lauds' },
        ]}
        value={officeFilter}
        onchange={(v) => officeFilter = v as typeof officeFilter}
      />
    </div>
  </FadeIn>

  {#if error}
    <div class="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">{error}</div>
  {/if}

  {#if loading}
    <div class="space-y-2">
      {#each Array(8) as _}
        <Skeleton class="h-[52px]" />
      {/each}
    </div>
  {:else}
    <!-- Table (desktop) -->
    <FadeIn delay={100}>
      <div class="hidden md:block card overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="table-header">
              <th>Name</th>
              <th>City</th>
              <th>Postal</th>
              <th class="text-center">Masses</th>
              <th class="text-center">Reliability</th>
              <th class="text-center">Data</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredChurches as church}
              <tr
                class="table-row cursor-pointer"
                onclick={() => window.location.href = `/churches/${church.id}`}
              >
                <td class="font-medium text-on-surface">{church.name}</td>
                <td class="text-on-surface-variant">{church.address?.city || '-'}</td>
                <td class="text-on-surface-variant tabular-nums">{church.address?.postalCode || '-'}</td>
                <td class="text-center text-on-surface-variant tabular-nums">{church.massSchedules?.length || 0}</td>
                <td class="text-center">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold
                    {church.reliabilityScore >= 70 ? 'bg-success/12 text-success' :
                     church.reliabilityScore >= 40 ? 'bg-warning/12 text-warning' :
                     'bg-destructive/12 text-destructive'}">
                    {church.reliabilityScore}
                  </span>
                </td>
                <td>
                  <div class="flex items-center justify-center gap-2">
                    <span title="Phone" class="w-2 h-2 rounded-full transition-colors {church.contact?.phone ? 'bg-success' : 'bg-outline-variant/50'}"></span>
                    <span title="Email" class="w-2 h-2 rounded-full transition-colors {church.contact?.email ? 'bg-success' : 'bg-outline-variant/50'}"></span>
                    <span title="Website" class="w-2 h-2 rounded-full transition-colors {church.contact?.website ? 'bg-success' : 'bg-outline-variant/50'}"></span>
                    <span title="GPS" class="w-2 h-2 rounded-full transition-colors {church.latitude && church.longitude ? 'bg-success' : 'bg-outline-variant/50'}"></span>
                  </div>
                </td>
              </tr>
            {/each}
            {#if filteredChurches.length === 0}
              <tr>
                <td colspan="6" class="px-4 py-10 text-center text-on-surface-variant">No churches found</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </FadeIn>

    <!-- Cards (mobile) -->
    <div class="md:hidden space-y-2.5">
      {#each filteredChurches as church}
        <a
          href="/churches/{church.id}"
          class="block card-hover p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-medium text-on-surface truncate">{church.name}</p>
              <p class="text-xs text-on-surface-variant mt-1">
                {church.address?.city || '-'}{church.address?.postalCode ? ` (${church.address.postalCode})` : ''}
              </p>
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0
              {church.reliabilityScore >= 70 ? 'bg-success/12 text-success' :
               church.reliabilityScore >= 40 ? 'bg-warning/12 text-warning' :
               'bg-destructive/12 text-destructive'}">
              {church.reliabilityScore}
            </span>
          </div>
          <div class="flex items-center gap-3 mt-2.5 text-xs text-on-surface-variant">
            <span class="tabular-nums">{church.massSchedules?.length || 0} masses</span>
            <div class="flex items-center gap-1.5">
              <span title="Phone" class="w-2 h-2 rounded-full {church.contact?.phone ? 'bg-success' : 'bg-outline-variant/50'}"></span>
              <span title="Email" class="w-2 h-2 rounded-full {church.contact?.email ? 'bg-success' : 'bg-outline-variant/50'}"></span>
              <span title="Website" class="w-2 h-2 rounded-full {church.contact?.website ? 'bg-success' : 'bg-outline-variant/50'}"></span>
              <span title="GPS" class="w-2 h-2 rounded-full {church.latitude && church.longitude ? 'bg-success' : 'bg-outline-variant/50'}"></span>
            </div>
          </div>
        </a>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between pt-2">
        <p class="text-xs text-on-surface-variant tabular-nums">
          Page {currentPage + 1} of {totalPages}
        </p>
        <div class="flex gap-2">
          <button
            disabled={currentPage === 0}
            onclick={() => goToPage(currentPage - 1)}
            class="btn-ghost !text-xs"
          >
            Previous
          </button>
          <button
            disabled={currentPage >= totalPages - 1}
            onclick={() => goToPage(currentPage + 1)}
            class="btn-ghost !text-xs"
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
