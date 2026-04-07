<script lang="ts">
  interface Props {
    status: string;
    size?: 'sm' | 'md';
  }

  let { status, size = 'md' }: Props = $props();

  const styles: Record<string, string> = {
    success: 'bg-success/15 text-success',
    failed: 'bg-destructive/15 text-destructive',
    running: 'bg-secondary/15 text-secondary animate-pulse-glow',
    cancelled: 'bg-primary/15 text-primary',
    pending: 'bg-muted text-muted-foreground',
    idle: 'bg-muted text-muted-foreground',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };
</script>

<span class="inline-flex items-center rounded-full font-medium capitalize {styles[status] || styles.idle} {sizeClasses[size]}">
  {#if status === 'running'}
    <span class="w-1.5 h-1.5 bg-current rounded-full mr-1.5"></span>
  {/if}
  {status}
</span>
