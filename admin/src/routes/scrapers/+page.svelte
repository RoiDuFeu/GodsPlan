<script lang="ts">
  import { onMount } from 'svelte';
  import { getScrapers, purgeData } from '$lib/api';
  import type { ScraperInfo } from '$lib/types';
  import ScraperCard from '$lib/components/ScraperCard.svelte';
  import TriggerModal from '$lib/components/TriggerModal.svelte';
  import FadeIn from '$lib/components/ui/FadeIn.svelte';
  import StaggerChildren from '$lib/components/ui/StaggerChildren.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

  let scrapers = $state<ScraperInfo[]>([]);
  let loading = $state(true);
  let modalScraper = $state<ScraperInfo | null>(null);
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let showPurgeConfirm = $state(false);
  let purging = $state(false);
  let purgeResult = $state<{ churches: number; scraperRuns: number } | null>(null);
  let purgeError = $state<string | null>(null);

  async function handlePurge() {
    purging = true;
    purgeError = null;
    try {
      const result = await purgeData();
      purgeResult = result.deleted;
      showPurgeConfirm = false;
      await loadData();
    } catch (e: any) {
      purgeError = e.message || 'Failed to purge data';
    } finally {
      purging = false;
    }
  }

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

<div class="page-container space-y-8">
  <FadeIn>
    <div class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">Scrapers</h1>
          <p class="page-subtitle">Manage and monitor all data scrapers</p>
        </div>
        <button
          class="btn btn-danger"
          onclick={() => { showPurgeConfirm = true; purgeResult = null; purgeError = null; }}
        >
          Purge Database
        </button>
      </div>
    </div>
  </FadeIn>

  {#if loading}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {#each Array(3) as _}
        <Skeleton class="h-[240px]" />
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <StaggerChildren items={scrapers} stagger={80}>
        {#snippet children(scraper)}
          <ScraperCard {scraper} onTrigger={openTrigger} />
        {/snippet}
      </StaggerChildren>
    </div>
  {/if}
</div>

{#if purgeResult}
  <div class="fixed bottom-6 right-6 z-50 bg-green-900/90 text-green-100 px-5 py-3 rounded-lg shadow-lg border border-green-700 flex items-center gap-3">
    <span>Purged {purgeResult.churches} churches and {purgeResult.scraperRuns} scraper runs</span>
    <button class="text-green-300 hover:text-white" onclick={() => (purgeResult = null)}>&#x2715;</button>
  </div>
{/if}

{#if showPurgeConfirm}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
    onclick={() => (showPurgeConfirm = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 class="text-lg font-semibold text-red-400 mb-3">Purge All Data</h2>
      <p class="text-sm text-[var(--color-on-surface-variant)] mb-4">
        This will permanently delete <strong>all churches</strong> and <strong>all scraper run history</strong> from the database. This action cannot be undone.
      </p>
      {#if purgeError}
        <p class="text-sm text-red-400 bg-red-900/30 rounded px-3 py-2 mb-4">{purgeError}</p>
      {/if}
      <div class="flex justify-end gap-3">
        <button class="btn btn-secondary" onclick={() => (showPurgeConfirm = false)} disabled={purging}>
          Cancel
        </button>
        <button class="btn btn-danger" onclick={handlePurge} disabled={purging}>
          {purging ? 'Purging...' : 'Yes, Purge Everything'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if modalScraper}
  <TriggerModal
    scraperName={modalScraper.name}
    supportsDepartments={modalScraper.supportsDepartments}
    onClose={() => (modalScraper = null)}
    onTriggered={loadData}
  />
{/if}
