import { MapPin, Church } from 'lucide-react';
import type { ChurchListItem } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { ScoreBar } from '@/components/ScoreBar';
import { formatDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200',
        'hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-xl',
        'border-2 bg-card',
        isSelected 
          ? 'border-primary border-2 shadow-lg ring-2 ring-primary/20' 
          : 'border-border hover:border-primary/50 hover:ring-2 hover:ring-primary/20'
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
      aria-label={`Église ${church.name}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Church Icon - Badge circulaire coloré */}
          <div className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200",
            isSelected 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110"
          )}>
            <Church className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Nom */}
            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
              {church.name}
            </h3>
            
            {/* Adresse */}
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground leading-relaxed">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{addressString}</span>
            </div>

            {/* Footer: Score + Distance */}
            <div className="flex items-center justify-between gap-3 pt-1">
              {/* Score Bar */}
              <ScoreBar score={church.reliabilityScore} />
              
              {/* Distance */}
              {church.distance !== undefined && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{formatDistance(church.distance)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
