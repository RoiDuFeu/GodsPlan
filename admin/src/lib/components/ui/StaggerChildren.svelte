<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';

  interface Props {
    /** Base delay for the first item (ms) */
    baseDelay?: number;
    /** Delay increment between items (ms) */
    stagger?: number;
    /** Animation duration (ms) */
    duration?: number;
    /** Vertical offset */
    y?: number;
    /** Items to iterate over */
    items: any[];
    /** Snippet receiving (item, index) */
    children: import('svelte').Snippet<[any, number]>;
  }

  let {
    baseDelay = 0,
    stagger = 60,
    duration = 400,
    y = 16,
    items,
    children,
  }: Props = $props();

  let visible = $state(false);

  onMount(() => {
    visible = true;
  });
</script>

{#if visible}
  {#each items as item, i}
    <div
      in:fly={{ y, duration, delay: baseDelay + i * stagger, easing: cubicOut }}
      style="will-change: transform, opacity;"
    >
      {@render children(item, i)}
    </div>
  {/each}
{/if}
