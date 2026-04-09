<script lang="ts">
  import { fly, blur } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  interface Props {
    /** Delay before animation starts (ms) */
    delay?: number;
    /** Animation duration (ms) */
    duration?: number;
    /** Vertical offset in px (positive = from below) */
    y?: number;
    /** Blur amount in px */
    amount?: number;
    children: import('svelte').Snippet;
  }

  let { delay = 0, duration = 500, y = 12, amount = 4, children }: Props = $props();

  let visible = $state(false);
  let el: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          visible = true;
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  });
</script>

<div bind:this={el}>
  {#if visible}
    <div
      in:fly={{ y, duration, delay, easing: cubicOut }}
      style="will-change: transform, opacity;"
    >
      {@render children()}
    </div>
  {/if}
</div>
