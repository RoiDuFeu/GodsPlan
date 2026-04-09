<script lang="ts">
  import { cubicOut } from 'svelte/easing';

  interface Props {
    /** Target value to animate to */
    value: number;
    /** Animation duration in ms */
    duration?: number;
    /** Delay before starting in ms */
    delay?: number;
    /** Number of decimal places */
    decimals?: number;
    /** Format with locale separators */
    locale?: boolean;
    /** CSS class for the number */
    class?: string;
  }

  let {
    value,
    duration = 1200,
    delay = 0,
    decimals = 0,
    locale = true,
    class: className = '',
  }: Props = $props();

  let displayValue = $state(0);
  let el: HTMLSpanElement | undefined = $state();
  let hasAnimated = false;
  let animFrameId: number | null = null;

  function animateTo(target: number) {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
    }
    const start = displayValue;
    const range = target - start;
    if (range === 0) return;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = cubicOut(progress);
      displayValue = start + range * eased;

      if (progress < 1) {
        animFrameId = requestAnimationFrame(tick);
      } else {
        displayValue = target;
        animFrameId = null;
      }
    }

    animFrameId = requestAnimationFrame(tick);
  }

  // Observe element visibility for initial animation
  $effect(() => {
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          hasAnimated = true;
          setTimeout(() => animateTo(value), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  // Re-animate when value prop changes (after initial animation)
  let prevValue: number | undefined;
  $effect(() => {
    const v = value; // track the prop
    if (hasAnimated && prevValue !== undefined && prevValue !== v) {
      animateTo(v);
    }
    prevValue = v;
  });

  let formatted = $derived.by(() => {
    const num = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue);
    if (locale) {
      return Number(num).toLocaleString('fr-FR');
    }
    return String(num);
  });
</script>

<span bind:this={el} class="tabular-nums {className}">
  {formatted}
</span>
