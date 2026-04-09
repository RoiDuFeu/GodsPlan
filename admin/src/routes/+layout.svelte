<script lang="ts">
  import '../app.css';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import MobileNav from '$lib/components/MobileNav.svelte';

  let { children } = $props();
</script>

<div class="flex min-h-screen bg-surface">
  <Sidebar />

  <main class="flex-1 min-w-0 pb-20 lg:pb-0">
    <div class="page-enter">
      {@render children()}
    </div>
  </main>

  <MobileNav />
</div>
