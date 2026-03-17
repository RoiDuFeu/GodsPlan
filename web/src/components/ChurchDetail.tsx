import { X, MapPin, Clock, ExternalLink, Calendar } from 'lucide-react';
import type { Church } from '../lib/types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { getConfidenceBadgeColor, getConfidenceLabel } from '../lib/utils';
import { cn } from '../lib/utils';

interface ChurchDetailProps {
  church: Church;
  onClose: () => void;
}

const DAYS_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function ChurchDetail({ church, onClose }: ChurchDetailProps) {
  const confidenceColor = getConfidenceBadgeColor(church.reliabilityScore / 100);
  const confidenceLabel = getConfidenceLabel(church.reliabilityScore / 100);
  
  const lat = parseFloat(church.latitude);
  const lng = parseFloat(church.longitude);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  // Format address string
  const addressString = [
    church.address.street,
    church.address.postalCode,
    church.address.city
  ].filter(Boolean).join(', ');

  // Group mass schedules by day
  const schedulesByDay = church.massSchedules.reduce((acc, schedule) => {
    const day = DAYS_NAMES[schedule.dayOfWeek];
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {} as Record<string, typeof church.massSchedules>);

  // Sort days in week order
  const sortedDays = DAYS_NAMES.filter(day => schedulesByDay[day]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div 
        className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="church-detail-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h2 id="church-detail-title" className="text-2xl font-bold mb-2">
              {church.name}
            </h2>
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{addressString}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Confidence & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={cn('text-sm px-3 py-1', confidenceColor)}>
              Fiabilité: {confidenceLabel} ({church.reliabilityScore}%)
            </Badge>
            
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Itinéraire
              </Button>
            </a>
          </div>

          {/* Mass Schedules */}
          {sortedDays.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5" />
                  Horaires des messes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedDays.map((day) => {
                    const daySchedules = schedulesByDay[day];
                    const times = daySchedules.map(s => s.time).join(', ');
                    const rite = daySchedules[0]?.rite;
                    const language = daySchedules[0]?.language;
                    
                    return (
                      <div key={day} className="border-b last:border-b-0 pb-3 last:pb-0">
                        <div className="font-semibold text-sm mb-1">
                          {day}
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <Clock className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-muted-foreground">
                              {times || 'Pas de messe'}
                            </div>
                            {rite && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Rite: {rite}
                              </div>
                            )}
                            {language && (
                              <div className="text-xs text-muted-foreground">
                                Langue: {language}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {sortedDays.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
              Aucun horaire de messe disponible
            </div>
          )}

          {/* Data Sources */}
          {church.dataSources.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <div className="font-semibold mb-1">Sources:</div>
              <ul className="space-y-1">
                {church.dataSources.map((source, index) => (
                  <li key={index}>
                    • {source.type}
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 underline hover:text-primary"
                      >
                        Voir la source
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
