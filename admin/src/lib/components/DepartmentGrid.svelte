<script lang="ts">
  import type { DepartmentCoverage } from '$lib/types';

  interface Props {
    departments: DepartmentCoverage[];
    onTriggerDept: (code: string) => void;
  }

  let { departments, onTriggerDept }: Props = $props();

  function getStatusColor(dept: DepartmentCoverage): string {
    if (!dept.lastScrapedAt) return 'border-destructive/30 bg-destructive/5';
    const daysSince = (Date.now() - new Date(dept.lastScrapedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return 'border-success/30 bg-success/5';
    if (daysSince < 30) return 'border-warning/30 bg-warning/5';
    return 'border-destructive/30 bg-destructive/5';
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
    <div class="rounded-2xl border-2 p-4 {getStatusColor(dept)} flex flex-col gap-2.5 transition-all duration-200 hover:shadow-md hover:shadow-black/5">
      <div class="flex items-center justify-between">
        <span class="font-mono text-lg font-bold text-on-surface tabular-nums">{dept.code}</span>
        <span class="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
          {getStatusLabel(dept)}
        </span>
      </div>
      <p class="text-sm font-medium text-on-surface truncate">{dept.name}</p>
      <div class="text-xs text-on-surface-variant space-y-0.5 mt-0.5">
        <p><span class="font-medium text-on-surface tabular-nums">{dept.totalChurches}</span> churches</p>
        <p><span class="font-medium text-on-surface tabular-nums">{dept.withSchedules}</span> with schedules</p>
      </div>
      <button
        onclick={() => onTriggerDept(dept.code)}
        class="btn-secondary mt-auto !py-2 !min-h-[34px] !text-xs"
      >
        Scrape
      </button>
    </div>
  {/each}
</div>
