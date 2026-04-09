<script lang="ts">
  import { fly, scale } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    options: Option[];
    value: string;
    onchange: (value: string) => void;
  }

  let { options, value, onchange }: Props = $props();
</script>

<div class="flex flex-wrap gap-1.5">
  {#each options as option (option.value)}
    <button
      type="button"
      onclick={() => onchange(option.value)}
      class="filter-chip relative overflow-hidden cursor-pointer
        {value === option.value ? 'filter-chip-active' : 'filter-chip-inactive'}"
    >
      {#if value === option.value}
        <span
          class="absolute inset-0 bg-primary rounded-lg"
          in:scale={{ duration: 300, easing: backOut, start: 0.5 }}
        ></span>
      {/if}
      <span
        class="relative z-10 transition-colors duration-200
          {value === option.value ? 'text-primary-foreground' : ''}"
      >
        {option.label}
      </span>
    </button>
  {/each}
</div>
