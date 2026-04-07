<script lang="ts">
  import type { DepartmentCoverage } from '$lib/types';

  interface Props {
    departments: DepartmentCoverage[];
    onTriggerDept: (code: string) => void;
  }

  let { departments, onTriggerDept }: Props = $props();

  function getStatusColor(dept: DepartmentCoverage): string {
    if (!dept.lastScrapedAt) return 'border-destructive/40 bg-destructive/5';
    const daysSince = (Date.now() - new Date(dept.lastScrapedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return 'border-success/40 bg-success/5';
    if (daysSince < 30) return 'border-warning/40 bg-warning/5';
    return 'border-destructive/40 bg-destructive/5';
  }

  function getStatusLabel(dept: DepartmentCoverage): string {
    if (!dept.lastScrapedAt) return 'Never scraped';
    const daysSince = Math.floor((Date.now() - new Date(dept.lastScrapedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return 'Yesterday';
    return `${daysSince}d ago`;
  }
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
  {#each departments as dept}
    <div class="rounded-xl border-2 p-4 {getStatusColor(dept)} flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="font-mono text-lg font-bold text-on-surface">{dept.code}</span>
        <span class="text-[10px] text-on-surface-variant font-medium uppercase tracking-wide">
          {getStatusLabel(dept)}
        </span>
      </div>
      <p class="text-sm font-medium text-on-surface truncate">{dept.name}</p>
      <div class="text-xs text-on-surface-variant space-y-0.5 mt-1">
        <p><span class="font-medium text-on-surface">{dept.totalChurches}</span> churches</p>
        <p><span class="font-medium text-on-surface">{dept.withSchedules}</span> with schedules</p>
      </div>
      <button
        onclick={() => onTriggerDept(dept.code)}
        class="mt-auto text-xs font-medium py-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors min-h-[36px]"
      >
        Scrape
      </button>
    </div>
  {/each}
</div>
