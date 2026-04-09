<script lang="ts">
  interface Props {
    status: string;
    size?: 'sm' | 'md';
  }

  let { status, size = 'md' }: Props = $props();

  const styles: Record<string, string> = {
    success: 'bg-success/12 text-success',
    failed: 'bg-destructive/12 text-destructive',
    running: 'bg-secondary/12 text-secondary animate-pulse-glow',
    cancelled: 'bg-muted text-on-surface-variant',
    pending: 'bg-muted text-muted-foreground',
    idle: 'bg-muted text-muted-foreground',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-[11px] px-2.5 py-1',
  };
</script>

<span class="inline-flex items-center rounded-full font-semibold capitalize tracking-wide {styles[status] || styles.idle} {sizeClasses[size]}">
  {#if status === 'running'}
    <span class="w-1.5 h-1.5 bg-current rounded-full mr-1.5 animate-pulse"></span>
  {/if}
  {status}
</span>
