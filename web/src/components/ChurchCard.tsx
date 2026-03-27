import type { ChurchListItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/lib/utils';

interface ChurchCardProps {
  church: ChurchListItem;
  onClick?: () => void;
  isSelected?: boolean;
}

export function ChurchCard({ church, onClick, isSelected }: ChurchCardProps) {
  const addressString = [
    church.address.street,
    church.address.postalCode,
    church.address.city
  ].filter(Boolean).join(', ');

  return (
    <div
      className={cn(
        'group bg-surface-container-low rounded-xl overflow-hidden cursor-pointer transition-all duration-500',
        'hover:shadow-2xl hover:bg-surface-container',
        isSelected && 'ring-2 ring-primary shadow-lg'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Church ${church.name}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300',
            isSelected
              ? 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]'
              : 'bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110'
          )}>
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-base font-headline group-hover:text-primary transition-colors truncate">
                {church.name}
              </h3>
              {church.distance !== undefined && (
                <span className="text-xs text-muted-foreground font-label uppercase tracking-widest ml-2 whitespace-nowrap">
                  {formatDistance(church.distance)}
                </span>
              )}
            </div>

            {/* Address */}
            <div className="flex items-center gap-1.5 text-sm text-on-surface-variant mb-2">
              <span className="material-symbols-outlined text-sm opacity-60">location_on</span>
              <span className="line-clamp-1">{addressString}</span>
            </div>

            {/* Score + Next mass */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded text-primary">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-[0.6875rem] font-bold tracking-widest">{church.reliabilityScore}%</span>
              </div>
              {church.nextMassTime && (
                <div className="flex items-center gap-1 bg-secondary/10 px-2 py-0.5 rounded text-secondary">
                  <span className="material-symbols-outlined text-xs">schedule</span>
                  <span className="text-[0.6875rem] font-bold">{church.nextMassTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
