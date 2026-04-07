<script lang="ts">
  import type { ScraperError } from '$lib/types';

  interface Props {
    errors: ScraperError[];
  }

  let { errors }: Props = $props();
</script>

{#if errors.length === 0}
  <p class="text-sm text-muted-foreground py-2">No errors</p>
{:else}
  <div class="space-y-2 max-h-64 overflow-y-auto">
    {#each errors as err}
      <div class="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-sm">
        <p class="text-destructive font-medium break-all">{err.message}</p>
        {#if err.url}
          <p class="text-on-surface-variant text-xs mt-1 break-all">{err.url}</p>
        {/if}
        {#if err.church}
          <p class="text-on-surface-variant text-xs mt-1">{err.church}</p>
        {/if}
        <p class="text-muted-foreground text-[10px] mt-1">{new Date(err.timestamp).toLocaleString()}</p>
      </div>
    {/each}
  </div>
{/if}
