<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/state';
  import { getChurch, scrapeMessesInfoStream, scrapeChurchWebsiteStream } from '$lib/api';
  import type { ChurchAdmin, ScreencastFrame } from '$lib/types';
  import FadeIn from '$lib/components/ui/FadeIn.svelte';
  import Skeleton from '$lib/components/ui/Skeleton.svelte';
  import BrowserPreview from '$lib/components/BrowserPreview.svelte';

  let church = $state<ChurchAdmin | null>(null);
  let loading = $state(true);
  let error = $state('');

  let scrapingMessesInfo = $state(false);
  let scrapingWebsite = $state(false);
  let scrapeMessage = $state('');
  let scrapeError = $state('');

  let scrapeFrames = $state<ScreencastFrame[]>([]);
  let scrapeConnected = $state(false);
  let eventSource: EventSource | null = null;

  function handleFrame(event: MessageEvent) {
    const data: ScreencastFrame = JSON.parse(event.data);
    const idx = data.workerIndex ?? 0;
    const existing = scrapeFrames.findIndex((f) => (f.workerIndex ?? 0) === idx);
    if (existing >= 0) {
      scrapeFrames[existing] = data;
      scrapeFrames = [...scrapeFrames];
    } else {
      scrapeFrames = [...scrapeFrames, data];
    }
  }

  function cleanupStream() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    scrapeConnected = false;
  }

  onDestroy(cleanupStream);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let sortedMassSchedules = $derived(
    [...(church?.massSchedules || [])].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.time || '').localeCompare(b.time || '');
    })
  );

  let massByDay = $derived(
    sortedMassSchedules.reduce((acc, s) => {
      const dayName = dayNames[s.dayOfWeek] || `Day ${s.dayOfWeek}`;
      const label = s.date
        ? `${dayName} — ${new Date(s.date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}`
        : dayName;
      (acc[label] ??= []).push(s);
      return acc;
    }, {} as Record<string, typeof sortedMassSchedules>)
  );

  let sortedOfficeSchedules = $derived(
    [...(church?.officeSchedules || [])].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.startTime || '').localeCompare(b.startTime || '');
    })
  );

  let officeByDay = $derived(
    sortedOfficeSchedules.reduce((acc, s) => {
      const dayName = dayNames[s.dayOfWeek] || `Day ${s.dayOfWeek}`;
      const label = s.date
        ? `${dayName} — ${new Date(s.date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}`
        : dayName;
      (acc[label] ??= []).push(s);
      return acc;
    }, {} as Record<string, typeof sortedOfficeSchedules>)
  );

  let sortedEvents = $derived(
    [...(church?.upcomingEvents || [])].sort((a, b) => {
      const cmp = (a.date || '').localeCompare(b.date || '');
      if (cmp !== 0) return cmp;
      return (a.time || '').localeCompare(b.time || '');
    })
  );

  onMount(async () => {
    try {
      church = await getChurch(page.params.id!);
    } catch (e: any) {
      error = e.message || 'Failed to load church';
    }
    loading = false;
  });

  function formatDate(dateStr: string | undefined) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function getMessesInfoUrl(): string | undefined {
    return church?.dataSources?.find((ds) => ds.name === 'messes.info')?.url ?? undefined;
  }

  function startStream(es: EventSource, onResult: (data: any) => void) {
    cleanupStream();
    eventSource = es;
    scrapeFrames = [];
    scrapeConnected = true;
    scrapeMessage = '';
    scrapeError = '';

    es.addEventListener('frame', handleFrame);

    es.addEventListener('result', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onResult(data);
    });

    es.addEventListener('done', async () => {
      cleanupStream();
      church = await getChurch(page.params.id!);
    });

    es.onerror = () => {
      cleanupStream();
    };
  }

  function handleScrapeMessesInfo() {
    const url = getMessesInfoUrl();
    if (!url || !church) return;

    scrapingMessesInfo = true;
    const es = scrapeMessesInfoStream(url, {
      name: church.name,
      address: church.address,
      latitude: church.latitude,
      longitude: church.longitude,
    });

    startStream(es, (data) => {
      scrapingMessesInfo = false;
      if (data.error) {
        scrapeError = data.error;
      } else {
        scrapeMessage = data.message;
      }
    });
  }

  function handleScrapeWebsite() {
    if (!church) return;

    scrapingWebsite = true;
    const es = scrapeChurchWebsiteStream(church.id);

    startStream(es, (data) => {
      scrapingWebsite = false;
      if (data.error) {
        scrapeError = data.error;
      } else {
        scrapeMessage = `${data.message} — ${data.massSchedules} masses, ${data.officeSchedules} office schedules, ${data.events} events (confidence: ${data.confidence}%)`;
      }
    });
  }
</script>

<div class="page-container space-y-6">
  <!-- Back link -->
  <a href="/churches" class="back-link">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
    Back to churches
  </a>

  {#if loading}
    <div class="space-y-4">
      <Skeleton class="h-[120px]" />
      <Skeleton class="h-[200px]" />
    </div>
  {:else if error}
    <div class="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">{error}</div>
  {:else if church}
    <!-- Header -->
    <FadeIn>
      <div class="card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 class="font-headline text-2xl font-bold text-on-surface tracking-tight">{church.name}</h1>
            {#if church.description}
              <p class="text-sm text-on-surface-variant mt-1.5">{church.description}</p>
            {/if}

            <!-- Data availability badges -->
            <div class="flex flex-wrap gap-2 mt-3">
              {#if church.massSchedules?.length > 0}
                <div class="relative inline-flex overflow-hidden rounded-full p-px">
                  <span class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"></span>
                  <span class="inline-flex h-full w-full items-center justify-center rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-gray-50 backdrop-blur-3xl">
                    Mass ({church.massSchedules.length})
                  </span>
                </div>
              {/if}
              {#if church.officeSchedules?.some((s) => s.type === 'confession')}
                <div class="relative inline-flex overflow-hidden rounded-full p-px">
                  <span class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"></span>
                  <span class="inline-flex h-full w-full items-center justify-center rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-gray-50 backdrop-blur-3xl">
                    Confession ({church.officeSchedules.filter((s) => s.type === 'confession').length})
                  </span>
                </div>
              {/if}
              {#if church.officeSchedules?.some((s) => s.type === 'adoration')}
                <div class="relative inline-flex overflow-hidden rounded-full p-px">
                  <span class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"></span>
                  <span class="inline-flex h-full w-full items-center justify-center rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-gray-50 backdrop-blur-3xl">
                    Adoration ({church.officeSchedules.filter((s) => s.type === 'adoration').length})
                  </span>
                </div>
              {/if}
              {#if church.officeSchedules?.some((s) => s.type === 'vespers')}
                <div class="relative inline-flex overflow-hidden rounded-full p-px">
                  <span class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"></span>
                  <span class="inline-flex h-full w-full items-center justify-center rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-gray-50 backdrop-blur-3xl">
                    Vespers
                  </span>
                </div>
              {/if}
              {#if church.officeSchedules?.some((s) => s.type === 'lauds')}
                <div class="relative inline-flex overflow-hidden rounded-full p-px">
                  <span class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"></span>
                  <span class="inline-flex h-full w-full items-center justify-center rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-gray-50 backdrop-blur-3xl">
                    Lauds
                  </span>
                </div>
              {/if}
              {#if church.upcomingEvents?.length > 0}
                <div class="relative inline-flex overflow-hidden rounded-full p-px">
                  <span class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"></span>
                  <span class="inline-flex h-full w-full items-center justify-center rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-gray-50 backdrop-blur-3xl">
                    Events ({church.upcomingEvents.length})
                  </span>
                </div>
              {/if}
              {#if church.contact?.phone}
                <div class="relative inline-flex overflow-hidden rounded-full p-px">
                  <span class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"></span>
                  <span class="inline-flex h-full w-full items-center justify-center rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-gray-50 backdrop-blur-3xl">
                    Phone
                  </span>
                </div>
              {/if}
              {#if church.contact?.website}
                <div class="relative inline-flex overflow-hidden rounded-full p-px">
                  <span class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"></span>
                  <span class="inline-flex h-full w-full items-center justify-center rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-gray-50 backdrop-blur-3xl">
                    Website
                  </span>
                </div>
              {/if}
              {#if church.photos?.length > 0}
                <div class="relative inline-flex overflow-hidden rounded-full p-px">
                  <span class="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#c2c2c2_0%,#505050_50%,#bebebe_100%)]"></span>
                  <span class="inline-flex h-full w-full items-center justify-center rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-gray-50 backdrop-blur-3xl">
                    Photos ({church.photos.length})
                  </span>
                </div>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-2.5 shrink-0">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold
              {church.isActive ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive'}">
              {church.isActive ? 'Active' : 'Inactive'}
            </span>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold
              {church.reliabilityScore >= 70 ? 'bg-success/12 text-success' :
               church.reliabilityScore >= 40 ? 'bg-warning/12 text-warning' :
               'bg-destructive/12 text-destructive'}">
              Reliability: {church.reliabilityScore}
            </span>
          </div>
        </div>
        <div class="flex flex-wrap gap-4 mt-4 text-xs text-on-surface-variant">
          <span>Created: {formatDate(church.createdAt)}</span>
          <span>Updated: {formatDate(church.updatedAt)}</span>
          {#if church.lastVerified}
            <span>Verified: {formatDate(church.lastVerified)}</span>
          {/if}
        </div>

        <!-- Scraper Actions -->
        <div class="flex flex-wrap gap-2.5 mt-5 pt-5 border-t border-outline-variant/20">
          {#if getMessesInfoUrl()}
            <button
              onclick={handleScrapeMessesInfo}
              disabled={scrapingMessesInfo}
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                bg-primary/10 text-primary hover:bg-primary/20 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if scrapingMessesInfo}
                <span class="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                Scraping messes.info...
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Re-scrape messes.info
              {/if}
            </button>
          {/if}
          {#if church.contact?.website}
            <button
              onclick={handleScrapeWebsite}
              disabled={scrapingWebsite}
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if scrapingWebsite}
                <span class="w-3.5 h-3.5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></span>
                Scraping website...
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Scrape parish website
              {/if}
            </button>
          {/if}
        </div>

        {#if scrapeMessage}
          <div class="mt-3 p-3 rounded-xl bg-success/10 text-success text-xs font-medium">{scrapeMessage}</div>
        {/if}
        {#if scrapeError}
          <div class="mt-3 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-medium">{scrapeError}</div>
        {/if}

        {#if scrapeConnected || scrapeFrames.length > 0}
          <div class="mt-5 pt-5 border-t border-outline-variant/20">
            <BrowserPreview frames={scrapeFrames} connected={scrapeConnected} />
          </div>
        {/if}
      </div>
    </FadeIn>

    <!-- Address & Location -->
    <FadeIn delay={60}>
      <div class="card p-6">
        <h2 class="section-title mb-5">Address & Location</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div>
            <p class="stat-label mb-1.5">Street</p>
            <p class="text-on-surface">{church.address?.street || '-'}</p>
          </div>
          <div>
            <p class="stat-label mb-1.5">City</p>
            <p class="text-on-surface">{church.address?.city || '-'}</p>
          </div>
          <div>
            <p class="stat-label mb-1.5">Postal Code</p>
            <p class="text-on-surface tabular-nums">{church.address?.postalCode || '-'}</p>
          </div>
          {#if church.address?.district}
            <div>
              <p class="stat-label mb-1.5">District</p>
              <p class="text-on-surface">{church.address.district}</p>
            </div>
          {/if}
          <div>
            <p class="stat-label mb-1.5">Coordinates</p>
            <p class="text-on-surface tabular-nums">
              {#if church.latitude && church.longitude}
                {church.latitude}, {church.longitude}
              {:else}
                -
              {/if}
            </p>
          </div>
        </div>
      </div>
    </FadeIn>

    <!-- Contact -->
    {#if church.contact && (church.contact.phone || church.contact.email || church.contact.website)}
      <FadeIn delay={120}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Contact</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
            {#if church.contact.phone}
              <div>
                <p class="stat-label mb-1.5">Phone</p>
                <p class="text-on-surface">{church.contact.phone}</p>
              </div>
            {/if}
            {#if church.contact.email}
              <div>
                <p class="stat-label mb-1.5">Email</p>
                <p class="text-on-surface break-all">{church.contact.email}</p>
              </div>
            {/if}
            {#if church.contact.website}
              <div>
                <p class="stat-label mb-1.5">Website</p>
                <a href={church.contact.website} target="_blank" rel="noopener" class="text-on-surface hover:underline break-all text-sm">
                  {church.contact.website}
                </a>
              </div>
            {/if}
          </div>
        </div>
      </FadeIn>
    {/if}

    <!-- Mass Schedules -->
    {#if church.massSchedules?.length > 0}
      <FadeIn delay={180}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Mass Schedules ({church.massSchedules.length})</h2>
          <div class="space-y-4">
            {#each Object.entries(massByDay) as [day, schedules]}
              <div>
                <h3 class="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2.5">{day}</h3>
                <div class="space-y-1.5">
                  {#each schedules as schedule}
                    <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/50">
                      <span class="text-sm font-semibold text-on-surface tabular-nums w-14">{schedule.time}</span>
                      <span class="text-sm text-on-surface-variant">{schedule.rite}</span>
                      {#if schedule.language}
                        <span class="px-2 py-0.5 rounded-full bg-surface-container-highest text-[11px] text-on-surface-variant font-medium">{schedule.language}</span>
                      {/if}
                      {#if schedule.notes}
                        <span class="text-xs text-on-surface-variant/70 ml-auto">{schedule.notes}</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </FadeIn>
    {/if}

    <!-- Office Schedules -->
    {#if church.officeSchedules?.length > 0}
      <FadeIn delay={240}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Office Schedules ({church.officeSchedules.length})</h2>
          <div class="space-y-4">
            {#each Object.entries(officeByDay) as [day, schedules]}
              <div>
                <h3 class="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-2.5">{day}</h3>
                <div class="space-y-1.5">
                  {#each schedules as schedule}
                    <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high/50">
                      <span class="text-sm font-semibold text-on-surface tabular-nums w-28">{schedule.startTime}{schedule.endTime ? ` - ${schedule.endTime}` : ''}</span>
                      <span class="px-2 py-0.5 rounded-full bg-surface-container-highest text-[11px] text-on-surface-variant font-medium capitalize">{schedule.type}</span>
                      {#if schedule.notes}
                        <span class="text-xs text-on-surface-variant/70 ml-auto">{schedule.notes}</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </FadeIn>
    {/if}

    <!-- Rites & Languages -->
    {#if (church.rites?.length > 0) || (church.languages?.length > 0)}
      <FadeIn delay={300}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Rites & Languages</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {#if church.rites?.length > 0}
              <div>
                <p class="stat-label mb-2.5">Rites</p>
                <div class="flex flex-wrap gap-2">
                  {#each church.rites as rite}
                    <span class="px-3 py-1 rounded-full bg-surface-container-highest text-on-surface text-xs font-semibold">{rite}</span>
                  {/each}
                </div>
              </div>
            {/if}
            {#if church.languages?.length > 0}
              <div>
                <p class="stat-label mb-2.5">Languages</p>
                <div class="flex flex-wrap gap-2">
                  {#each church.languages as lang}
                    <span class="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold">{lang}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </FadeIn>
    {/if}

    <!-- Accessibility -->
    {#if church.accessibility}
      <FadeIn delay={360}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Accessibility</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full {church.accessibility.wheelchairAccessible ? 'bg-success' : 'bg-outline-variant/50'}"></span>
              <span class="text-on-surface">Wheelchair accessible</span>
            </div>
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full {church.accessibility.hearingLoop ? 'bg-success' : 'bg-outline-variant/50'}"></span>
              <span class="text-on-surface">Hearing loop</span>
            </div>
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full {church.accessibility.parking ? 'bg-success' : 'bg-outline-variant/50'}"></span>
              <span class="text-on-surface">Parking</span>
            </div>
          </div>
          {#if church.accessibility.notes}
            <p class="text-sm text-on-surface-variant mt-4">{church.accessibility.notes}</p>
          {/if}
        </div>
      </FadeIn>
    {/if}

    <!-- Data Sources -->
    {#if church.dataSources?.length > 0}
      <FadeIn delay={420}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Data Sources ({church.dataSources.length})</h2>
          <div class="space-y-2.5">
            {#each church.dataSources as source}
              <div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-high/50">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-on-surface">{source.name}</p>
                  {#if source.url}
                    <a href={source.url} target="_blank" rel="noopener" class="text-xs text-primary hover:underline break-all">{source.url}</a>
                  {/if}
                  <p class="text-xs text-on-surface-variant mt-1">Last scraped: {formatDate(source.lastScraped)}</p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ml-3
                  {source.reliability >= 70 ? 'bg-success/12 text-success' :
                   source.reliability >= 40 ? 'bg-warning/12 text-warning' :
                   'bg-destructive/12 text-destructive'}">
                  {source.reliability}%
                </span>
              </div>
            {/each}
          </div>
        </div>
      </FadeIn>
    {/if}

    <!-- Upcoming Events -->
    {#if church.upcomingEvents?.length > 0}
      <FadeIn delay={480}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Events ({church.upcomingEvents.length})</h2>
          <div class="space-y-2.5">
            {#each sortedEvents as event}
              <div class="p-4 rounded-xl bg-surface-container-high/50">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-on-surface">{event.title}</p>
                  <span class="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface text-[11px] font-semibold">{event.type}</span>
                </div>
                <p class="text-xs text-on-surface-variant mt-1.5">
                  {formatDate(event.date)}{event.time ? ` at ${event.time}` : ''}
                </p>
              </div>
            {/each}
          </div>
        </div>
      </FadeIn>
    {/if}

    <!-- Photos -->
    {#if church.photos?.length > 0}
      <FadeIn delay={540}>
        <div class="card p-6">
          <h2 class="section-title mb-5">Photos ({church.photos.length})</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {#each church.photos as photo}
              <a href={photo} target="_blank" rel="noopener" class="block aspect-video rounded-xl overflow-hidden bg-surface-container-high group">
                <img src={photo} alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </a>
            {/each}
          </div>
        </div>
      </FadeIn>
    {/if}
  {/if}
</div>
