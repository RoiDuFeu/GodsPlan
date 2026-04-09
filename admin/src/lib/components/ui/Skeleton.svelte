<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();
</script>

<div class="skeleton {className}"></div>

<style>
  .skeleton {
    background: linear-gradient(
      90deg,
      hsl(var(--surface-container)) 0%,
      hsl(var(--surface-container-high)) 40%,
      hsl(var(--surface-container-highest)) 50%,
      hsl(var(--surface-container-high)) 60%,
      hsl(var(--surface-container)) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.8s ease-in-out infinite;
    border-radius: 0.75rem;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
