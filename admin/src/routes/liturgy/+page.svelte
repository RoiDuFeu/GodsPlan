<script lang="ts">
  import { getLiturgy, refreshLiturgy } from '$lib/api';
  import type { LiturgyEntry } from '$lib/types';
  import FadeIn from '$lib/components/ui/FadeIn.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';

  let entries = $state<(LiturgyEntry | null)[]>([]);
  let loading = $state(true);
  let refreshing = $state(false);
  let refreshMessage = $state('');
  let weekOffset = $state(0);
  let expandedIndex = $state<number | null>(null);

  let weekDates = $derived(getWeekDates(weekOffset));
  let expandedEntry = $derived(expandedIndex !== null ? entries[expandedIndex] : null);

  function getWeekDates(offset: number): string[] {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + offset * 7);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  function isToday(dateStr: string): boolean {
    return dateStr === new Date().toISOString().split('T')[0];
  }

  function toggleExpand(index: number) {
    expandedIndex = expandedIndex === index ? null : index;
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const colorMap: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-500/30' },
    purple: { bg: 'bg-purple-500/10',  text: 'text-purple-400',  dot: 'bg-purple-500',  border: 'border-purple-500/30' },
    white:  { bg: 'bg-neutral-300/10', text: 'text-neutral-300',  dot: 'bg-neutral-300',  border: 'border-neutral-400/30' },
    red:    { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-500',     border: 'border-red-500/30' },
    rose:   { bg: 'bg-pink-500/10',    text: 'text-pink-400',    dot: 'bg-pink-500',    border: 'border-pink-500/30' },
    gold:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-500',   border: 'border-amber-500/30' },
    black:  { bg: 'bg-neutral-700/10', text: 'text-neutral-400',  dot: 'bg-neutral-600',  border: 'border-neutral-600/30' },
  };

  function getColor(color?: string) {
    return colorMap[color || ''] || colorMap.green;
  }

  async function loadWeek() {
    loading = true;
    expandedIndex = null;
    const results = await Promise.allSettled(
      weekDates.map((date) => getLiturgy(date))
    );
    entries = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
    loading = false;
  }

  async function handleRefresh() {
    refreshing = true;
    refreshMessage = '';
    try {
      const result = await refreshLiturgy(14);
      refreshMessage = result.message;
      await loadWeek();
    } catch (e: any) {
      refreshMessage = `Error: ${e.message}`;
    }
    refreshing = false;
  }

  function formatDateShort(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function formatFullDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function weekLabel(): string {
    if (weekDates.length === 0) return '';
    const start = new Date(weekDates[0] + 'T00:00:00');
    const end = new Date(weekDates[6] + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    if (start.getFullYear() !== end.getFullYear()) {
      return `${start.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })} — ${end.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })}`;
    }
    return `${start.toLocaleDateString('en-GB', opts)} — ${end.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })}`;
  }

  $effect(() => {
    weekDates; // track dependency — re-runs when weekOffset changes
    loadWeek();
  });
</script>

<div class="page-container space-y-6">
  <!-- Header -->
  <FadeIn>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="font-headline text-2xl font-bold text-on-surface tracking-tight">Liturgy</h1>
        <p class="text-sm text-on-surface-variant mt-1">Daily Mass readings — English & French</p>
      </div>
      <button
        onclick={handleRefresh}
        disabled={refreshing}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold
          bg-primary/10 text-primary hover:bg-primary/20 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        {#if refreshing}
          <span class="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
          Refreshing...
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          Refresh next 14 days
        {/if}
      </button>
    </div>
    {#if refreshMessage}
      <div class="mt-3 p-3 rounded-xl {refreshMessage.startsWith('Error') ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'} text-xs font-medium">
        {refreshMessage}
      </div>
    {/if}
  </FadeIn>

  <!-- Week Navigation -->
  <FadeIn delay={60}>
    <div class="flex items-center justify-between">
      <button onclick={() => weekOffset--} aria-label="Previous week" class="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="flex items-center gap-3">
        <span class="text-sm font-semibold text-on-surface">{weekLabel()}</span>
        {#if weekOffset !== 0}
          <button onclick={() => weekOffset = 0} class="px-2.5 py-1 rounded-lg bg-surface-container-high text-[11px] font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
            Today
          </button>
        {/if}
      </div>
      <button onclick={() => weekOffset++} aria-label="Next week" class="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  </FadeIn>

  <!-- Week Grid -->
  {#if loading}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {#each Array(7) as _}
        <Skeleton class="h-[180px]" />
      {/each}
    </div>
  {:else}
    <FadeIn delay={120}>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {#each weekDates as date, i}
          {@const entry = entries[i]}
          {@const colors = getColor(entry?.liturgicalColor)}
          {@const isExpanded = expandedIndex === i}
          <button
            onclick={() => toggleExpand(i)}
            class="card p-4 flex flex-col gap-3 transition-all group text-left
              {isToday(date) ? 'ring-1 ring-primary/40' : ''}
              {isExpanded ? 'ring-1 ring-outline-variant' : 'hover:ring-1 hover:ring-outline-variant/50'}"
          >
            <!-- Day header -->
            <div class="flex items-center justify-between">
              <span class="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">{dayLabels[i]}</span>
              <span class="text-xs tabular-nums font-medium {isToday(date) ? 'text-primary' : 'text-on-surface-variant'}">
                {formatDateShort(date)}
              </span>
            </div>

            {#if entry}
              <!-- Liturgical color dot + name -->
              <div class="flex items-start gap-2">
                <span class="w-2.5 h-2.5 rounded-full mt-1 shrink-0 {colors.dot}"></span>
                <p class="text-xs font-medium text-on-surface leading-snug line-clamp-3">
                  {entry.liturgicalDayFr || entry.liturgicalDay || 'Unknown'}
                </p>
              </div>

              <!-- Saint of the day -->
              {#if entry.saint && entry.saint !== entry.liturgicalDayFr && entry.saint !== 'de la férie'}
                <p class="text-[11px] text-on-surface-variant leading-snug line-clamp-2 -mt-1 capitalize">
                  {entry.saint}
                </p>
              {/if}

              <!-- Readings count -->
              <div class="mt-auto flex flex-wrap gap-1.5">
                {#if entry.readings?.length > 0}
                  <span class="px-2 py-0.5 rounded-full bg-surface-container-highest text-[10px] text-on-surface-variant font-medium">
                    {entry.readings.length} EN
                  </span>
                {/if}
                {#if entry.readingsFr && entry.readingsFr.length > 0}
                  <span class="px-2 py-0.5 rounded-full bg-surface-container-highest text-[10px] text-on-surface-variant font-medium">
                    {entry.readingsFr.length} FR
                  </span>
                {/if}
                {#if entry.psalm}
                  <span class="px-2 py-0.5 rounded-full bg-surface-container-highest text-[10px] text-on-surface-variant font-medium">
                    Psalm
                  </span>
                {/if}
              </div>
            {:else}
              <p class="text-xs text-on-surface-variant/50 italic">No data</p>
            {/if}
          </button>
        {/each}
      </div>
    </FadeIn>

    <!-- Expanded Detail (below grid) -->
    {#if expandedEntry}
      {@const colors = getColor(expandedEntry.liturgicalColor)}
      <FadeIn>
        <div class="card p-6 space-y-5">
          <!-- Header info -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 class="font-headline text-xl font-bold text-on-surface tracking-tight">
                {expandedEntry.liturgicalDayFr || expandedEntry.liturgicalDay || 'Liturgy'}
              </h2>
              <p class="text-xs text-on-surface-variant mt-1">{formatFullDate(expandedEntry.date)}</p>
              {#if expandedEntry.liturgicalDay && expandedEntry.liturgicalDayFr}
                <p class="text-xs text-on-surface-variant/70 mt-0.5">{expandedEntry.liturgicalDay}</p>
              {/if}
              {#if expandedEntry.saint && expandedEntry.saint !== expandedEntry.liturgicalDayFr && expandedEntry.saint !== 'de la férie'}
                <div class="flex items-center gap-2 mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-amber-400 shrink-0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span class="text-sm text-on-surface-variant capitalize">{expandedEntry.saint}</span>
                  {#if expandedEntry.feast}
                    <span class="text-[11px] font-medium text-on-surface-variant/70 px-2 py-0.5 rounded-full bg-surface-container-highest">{expandedEntry.feast}</span>
                  {/if}
                </div>
              {/if}
            </div>
            <div class="flex items-center gap-2 shrink-0">
              {#if expandedEntry.liturgicalColor}
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium capitalize {colors.bg} {colors.text}">
                  <span class="w-2 h-2 rounded-full {colors.dot}"></span>
                  {expandedEntry.liturgicalColor}
                </span>
              {/if}
              {#if expandedEntry.usccbLink}
                <a
                  href={expandedEntry.usccbLink}
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium
                    bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  USCCB
                </a>
              {/if}
            </div>
          </div>

          <!-- English Readings -->
          {#if expandedEntry.readings?.length > 0}
            <div>
              <h3 class="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-3">Readings (English)</h3>
              <div class="space-y-3">
                {#each expandedEntry.readings as reading}
                  <div class="p-4 rounded-xl bg-surface-container-high/50">
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="text-sm font-semibold text-on-surface">{reading.title}</h4>
                      <span class="text-[11px] font-medium text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-highest shrink-0 ml-3">
                        {reading.reference}
                      </span>
                    </div>
                    <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{reading.text || 'No text available'}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- English Psalm -->
          {#if expandedEntry.psalm}
            <div>
              <h3 class="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-3">Responsorial Psalm</h3>
              <div class="p-4 rounded-xl bg-surface-container-high/50">
                <span class="text-[11px] font-medium text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-highest">
                  {expandedEntry.psalm.reference}
                </span>
                {#if expandedEntry.psalm.refrain}
                  <p class="text-sm font-semibold text-primary italic mt-2 mb-3">R. {expandedEntry.psalm.refrain}</p>
                {/if}
                <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{expandedEntry.psalm.text || 'No text available'}</p>
              </div>
            </div>
          {/if}

          <!-- French Readings -->
          {#if expandedEntry.readingsFr && expandedEntry.readingsFr.length > 0}
            <div>
              <h3 class="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-3">Lectures (Francais)</h3>
              <div class="space-y-3">
                {#each expandedEntry.readingsFr as reading}
                  <div class="p-4 rounded-xl bg-surface-container-high/50">
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="text-sm font-semibold text-on-surface">{reading.title}</h4>
                      <span class="text-[11px] font-medium text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-highest shrink-0 ml-3">
                        {reading.reference}
                      </span>
                    </div>
                    <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{reading.text || 'Texte non disponible'}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- French Psalm -->
          {#if expandedEntry.psalmFr}
            <div>
              <h3 class="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-3">Psaume</h3>
              <div class="p-4 rounded-xl bg-surface-container-high/50">
                <span class="text-[11px] font-medium text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-highest">
                  {expandedEntry.psalmFr.reference}
                </span>
                {#if expandedEntry.psalmFr.refrain}
                  <p class="text-sm font-semibold text-primary italic mt-2 mb-3">R. {expandedEntry.psalmFr.refrain}</p>
                {/if}
                <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">{expandedEntry.psalmFr.text || 'Texte non disponible'}</p>
              </div>
            </div>
          {/if}
        </div>
      </FadeIn>
    {/if}
  {/if}
</div>
