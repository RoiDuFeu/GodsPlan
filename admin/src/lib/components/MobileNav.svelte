<script lang="ts">
  import { page } from '$app/state';

  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { href: '/scrapers', label: 'Scrapers', icon: 'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7v1a2 2 0 0 1-2 2h-1v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3H5a2 2 0 0 1-2-2v-1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z' },
    { href: '/churches', label: 'Churches', icon: 'M12 3L2 12h3v8h4v-5h6v5h4v-8h3L12 3z' },
    { href: '/coverage', label: 'Coverage', icon: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zm7-1 8 4v13l-8-4V5z' },
  ];
</script>

<nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-dim/95 backdrop-blur-xl border-t border-outline-variant safe-area-bottom">
  <div class="flex items-center justify-around px-2">
    {#each navItems as item}
      {@const active = page.url.pathname === item.href || (item.href !== '/' && page.url.pathname.startsWith(item.href))}
      <a
        href={item.href}
        class="flex flex-col items-center gap-1 py-3 px-3 min-h-[56px] text-[10px] font-semibold transition-colors relative
          {active ? 'text-on-surface' : 'text-on-surface-variant'}"
      >
        {#if active}
          <span class="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-on-surface"></span>
        {/if}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
          <path d={item.icon} />
        </svg>
        {item.label}
      </a>
    {/each}
  </div>
</nav>

<style>
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
</style>
