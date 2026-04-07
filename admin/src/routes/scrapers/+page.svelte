<script lang="ts">
  import { onMount } from 'svelte';
  import { getScrapers } from '$lib/api';
  import type { ScraperInfo } from '$lib/types';
  import ScraperCard from '$lib/components/ScraperCard.svelte';
  import TriggerModal from '$lib/components/TriggerModal.svelte';

  let scrapers = $state<ScraperInfo[]>([]);
  let loading = $state(true);
  let modalScraper = $state<ScraperInfo | null>(null);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  async function loadData() {
    try {
      scrapers = await getScrapers();
    } catch {
      // silently handle
    }
    loading = false;
  }

  function openTrigger(name: string) {
    const scraper = scrapers.find((s) => s.name === name);
    if (scraper) modalScraper = scraper;
  }

  onMount(() => {
    loadData();
    pollInterval = setInterval(loadData, 10000);
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  });
</script>

<div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
  <div>
    <h1 class="font-headline text-2xl font-bold text-on-surface">Scrapers</h1>
    <p class="text-sm text-on-surface-variant mt-1">Manage and monitor all data scrapers</p>
  </div>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each Array(3) as _}
        <div class="bg-surface-container rounded-xl border border-outline-variant p-5 h-48 animate-pulse"></div>
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each scrapers as scraper}
        <ScraperCard {scraper} onTrigger={openTrigger} />
      {/each}
    </div>
  {/if}
</div>

{#if modalScraper}
  <TriggerModal
    scraperName={modalScraper.name}
    supportsDepartments={modalScraper.supportsDepartments}
    onClose={() => (modalScraper = null)}
    onTriggered={loadData}
  />
{/if}
