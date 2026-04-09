<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { getLiturgy, refreshLiturgy } from '$lib/api';
  import type { LiturgyEntry } from '$lib/types';
  import FadeIn from '$lib/components/ui/FadeIn.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

  let liturgy = $state<LiturgyEntry | null>(null);
  let loading = $state(true);
  let error = $state('');
  let refreshing = $state(false);
  let refreshMessage = $state('');

  const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
    green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    purple: { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/30' },
    white:  { bg: 'bg-neutral-300/10', text: 'text-neutral-300',  border: 'border-neutral-400/30' },
    red:    { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30' },
    rose:   { bg: 'bg-pink-500/10',    text: 'text-pink-400',    border: 'border-pink-500/30' },
    gold:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30' },
    black:  { bg: 'bg-neutral-700/10', text: 'text-neutral-400',  border: 'border-neutral-600/30' },
  };

  function getColorStyle(color?: string) {
    return colorStyles[color || ''] || colorStyles.green;
  }

  function formatFullDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatTimestamp(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function adjacentDate(offset: number): string {
    const d = new Date((page.params as any).date + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  }

  async function handleRefresh() {
    refreshing = true;
    refreshMessage = '';
    try {
      await refreshLiturgy(1);
      liturgy = await getLiturgy((page.params as any).date);
      refreshMessage = 'Refreshed successfully';
    } catch (e: any) {
      refreshMessage = `Error: ${e.message}`;
    }
    refreshing = false;
  }

  onMount(async () => {
    try {
      liturgy = await getLiturgy((page.params as any).date);
    } catch (e: any) {
      error = e.message || 'Failed to load liturgy';
    }
    loading = false;
  });
</script>

<div class="page-container space-y-6">
  <!-- Back link -->
  <a href="/liturgy" class="back-link">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
    Back to liturgy
  </a>

  {#if loading}
    <div class="space-y-4">
      <Skeleton class="h-[120px]" />
      <Skeleton class="h-[300px]" />
    </div>
  {:else if error}
    <div class="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">{error}</div>
  {:else if liturgy}
    {@const colors = getColorStyle(liturgy.liturgicalColor)}

    <!-- Header -->
    <FadeIn>
      <div class="card p-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
              {formatFullDate(liturgy.date)}
            </p>
            <h1 class="font-headline text-2xl font-bold text-on-surface tracking-tight">
              {liturgy.liturgicalDayFr || liturgy.liturgicalDay || 'Liturgy'}
            </h1>
            {#if liturgy.liturgicalDay && liturgy.liturgicalDayFr}
              <p class="text-sm text-on-surface-variant mt-1.5">{liturgy.liturgicalDay}</p>
            {/if}

            <!-- Liturgical color badge -->
            {#if liturgy.liturgicalColor}
              <div class="flex items-center gap-2 mt-3">
                <span class="w-3 h-3 rounded-full {colors.bg} border {colors.border}"></span>
                <span class="text-xs font-medium {colors.text} capitalize">{liturgy.liturgicalColor}</span>
              </div>
            {/if}
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              onclick={handleRefresh}
              disabled={refreshing}
              class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
                bg-primary/10 text-primary hover:bg-primary/20 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if refreshing}
                <span class="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              {/if}
              Refresh
            </button>
            {#if liturgy.usccbLink}
              <a
                href={liturgy.usccbLink}
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
                  bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                USCCB
              </a>
            {/if}
          </div>
        </div>

        {#if refreshMessage}
          <div class="mt-3 p-3 rounded-xl {refreshMessage.startsWith('Error') ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'} text-xs font-medium">
            {refreshMessage}
          </div>
        {/if}

        <div class="flex flex-wrap gap-4 mt-4 text-xs text-on-surface-variant">
          <span>Synced: {formatTimestamp(liturgy.updatedAt)}</span>
        </div>
      </div>
    </FadeIn>

    <!-- Day navigation -->
    <FadeIn delay={60}>
      <div class="flex items-center justify-between">
        <a href="/liturgy/{adjacentDate(-1)}" aria-label="Previous day" class="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M15 18l-6-6 6-6"/></svg>
        </a>
        <span class="text-xs text-on-surface-variant font-medium">Navigate days</span>
        <a href="/liturgy/{adjacentDate(1)}" aria-label="Next day" class="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M9 18l6-6-6-6"/></svg>
        </a>
      </div>
    </FadeIn>

    <!-- English Readings -->
    {#if liturgy.readings?.length > 0}
      <FadeIn delay={120}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Readings (English)</h2>
          <div class="space-y-5">
            {#each liturgy.readings as reading}
              <div class="p-4 rounded-xl bg-surface-container-high/50">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-semibold text-on-surface">{reading.title}</h3>
                  <span class="text-[11px] font-medium text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-highest">
                    {reading.reference}
                  </span>
                </div>
                <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{reading.text || 'No text available'}</p>
              </div>
            {/each}
          </div>
        </div>
      </FadeIn>
    {/if}

    <!-- English Psalm -->
    {#if liturgy.psalm}
      <FadeIn delay={180}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Responsorial Psalm</h2>
          <div class="p-4 rounded-xl bg-surface-container-high/50">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-medium text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-highest">
                {liturgy.psalm.reference}
              </span>
            </div>
            {#if liturgy.psalm.refrain}
              <p class="text-sm font-semibold text-primary italic mb-3">R. {liturgy.psalm.refrain}</p>
            {/if}
            <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{liturgy.psalm.text || 'No text available'}</p>
          </div>
        </div>
      </FadeIn>
    {/if}

    <!-- French Readings -->
    {#if liturgy.readingsFr && liturgy.readingsFr.length > 0}
      <FadeIn delay={240}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Lectures (Francais)</h2>
          <div class="space-y-5">
            {#each liturgy.readingsFr as reading}
              <div class="p-4 rounded-xl bg-surface-container-high/50">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-semibold text-on-surface">{reading.title}</h3>
                  <span class="text-[11px] font-medium text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-highest">
                    {reading.reference}
                  </span>
                </div>
                <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{reading.text || 'Texte non disponible'}</p>
              </div>
            {/each}
          </div>
        </div>
      </FadeIn>
    {/if}

    <!-- French Psalm -->
    {#if liturgy.psalmFr}
      <FadeIn delay={300}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Psaume</h2>
          <div class="p-4 rounded-xl bg-surface-container-high/50">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-medium text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-highest">
                {liturgy.psalmFr.reference}
              </span>
            </div>
            {#if liturgy.psalmFr.refrain}
              <p class="text-sm font-semibold text-primary italic mb-3">R. {liturgy.psalmFr.refrain}</p>
            {/if}
            <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{liturgy.psalmFr.text || 'Texte non disponible'}</p>
          </div>
        </div>
      </FadeIn>
    {/if}
  {/if}
</div>
