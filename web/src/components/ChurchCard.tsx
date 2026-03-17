import { MapPin, Navigation } from 'lucide-react';
import type { ChurchListItem } from '../lib/types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { formatDistance, getConfidenceBadgeColor, getConfidenceLabel } from '../lib/utils';
import { cn } from '../lib/utils';

interface ChurchCardProps {
  church: ChurchListItem;
  onClick?: () => void;
  isSelected?: boolean;
}

export function ChurchCard({ church, onClick, isSelected }: ChurchCardProps) {
  const confidenceColor = getConfidenceBadgeColor(church.reliabilityScore / 100);
  const confidenceLabel = getConfidenceLabel(church.reliabilityScore / 100);
  
  const addressString = [
    church.address.street,
    church.address.postalCode,
    church.address.city
  ].filter(Boolean).join(', ');

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
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
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1 truncate">
              {church.name}
            </h3>
            
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{addressString}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-xs', confidenceColor)}>
                {confidenceLabel}
              </Badge>
              
              {church.distance !== undefined && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Navigation className="w-3 h-3" />
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
