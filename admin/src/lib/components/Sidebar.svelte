<script lang="ts">
  import { page } from '$app/state';

  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'grid' },
    { href: '/scrapers', label: 'Scrapers', icon: 'bot' },
    { href: '/churches', label: 'Churches', icon: 'church' },
    { href: '/liturgy', label: 'Liturgy', icon: 'book' },
    { href: '/coverage', label: 'Coverage', icon: 'map' },
  ];

  const iconPaths: Record<string, string> = {
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    bot: 'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7v1a2 2 0 0 1-2 2h-1v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3H5a2 2 0 0 1-2-2v-1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
    church: 'M12 3L2 12h3v8h4v-5h6v5h4v-8h3L12 3z',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
    map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zm7-1 8 4v13l-8-4V5z',
  };
</script>

<aside class="hidden lg:flex flex-col w-64 bg-surface-dim border-r border-outline-variant h-screen sticky top-0">
  <!-- Logo -->
  <div class="p-6 pb-5">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-on-surface">
          <path d="M12 3L2 12h3v8h4v-5h6v5h4v-8h3L12 3z" />
        </svg>
      </div>
      <div>
        <h1 class="font-headline text-lg font-bold text-on-surface tracking-tight">GodsPlan</h1>
        <p class="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Admin</p>
      </div>
    </div>
  </div>

  <!-- Nav -->
  <nav class="flex-1 px-3 space-y-0.5">
    {#each navItems as item}
      {@const active = page.url.pathname === item.href || (item.href !== '/' && page.url.pathname.startsWith(item.href))}
      <a
        href={item.href}
        class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
          {active
            ? 'bg-surface-container-high text-on-surface'
            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-[18px] h-[18px] shrink-0">
          <path d={iconPaths[item.icon]} />
        </svg>
        {item.label}
      </a>
    {/each}
  </nav>

  <!-- Footer -->
  <div class="p-4 mx-3 mb-3 rounded-xl bg-surface-container">
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-success animate-pulse"></div>
      <p class="text-[11px] text-on-surface-variant font-medium">System online</p>
    </div>
    <p class="text-[10px] text-muted-foreground mt-1">v1.0.0</p>
  </div>
</aside>
