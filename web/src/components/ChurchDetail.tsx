import { MapPin, Clock, ExternalLink, Calendar, Church as ChurchIcon, Navigation2 } from 'lucide-react';
import type { Church } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getConfidenceBadgeColor, getConfidenceLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ChurchDetailProps {
  church: Church | null;
  onClose: () => void;
}

const DAYS_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function ChurchDetail({ church, onClose }: ChurchDetailProps) {
  if (!church) return null;

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
    <Dialog open={!!church} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 space-y-4">
            {/* Church Icon + Title */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
                <ChurchIcon className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-2.5">
                <DialogTitle className="text-2xl font-semibold leading-tight pr-8">
                  {church.name}
                </DialogTitle>
                <div className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{addressString}</span>
                </div>
              </div>
            </div>

            {/* Badges & Actions */}
            <div className="flex items-center gap-3 flex-wrap pt-2">
              <Badge 
                variant="secondary"
                className={cn('text-sm px-3 py-1.5 font-medium', confidenceColor)}
              >
                Fiabilité: {confidenceLabel} ({church.reliabilityScore}%)
              </Badge>
              
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
              >
                <Button
                  variant="default"
                  size="default"
                  className="gap-2 shadow-md"
                >
                  <Navigation2 className="w-4 h-4" />
                  Itinéraire
                </Button>
              </a>
            </div>
          </DialogHeader>

          <Separator className="my-2" />

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Mass Schedules */}
            {sortedDays.length > 0 ? (
              <Card className="border-2 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2.5 text-lg font-semibold">
                    <Calendar className="w-5 h-5 text-primary" />
                    Horaires des messes
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-0 p-0">
                  {sortedDays.map((day, index) => {
                    const daySchedules = schedulesByDay[day];
                    const times = daySchedules.map(s => s.time).join(', ');
                    const rite = daySchedules[0]?.rite;
                    const language = daySchedules[0]?.language;
                    
                    return (
                      <div key={day} className={cn(
                        'px-6 py-4',
                        index % 2 === 0 ? 'bg-muted/5' : 'bg-background'
                      )}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="font-semibold text-sm min-w-[100px]">
                            {day}
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium">
                                {times || 'Pas de messe'}
                              </span>
                            </div>
                            {(rite || language) && (
                              <div className="pl-6 space-y-0.5 text-xs text-muted-foreground leading-relaxed">
                                {rite && <div>Rite: {rite}</div>}
                                {language && <div>Langue: {language}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Aucun horaire de messe disponible
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Additional Info */}
            {church.description && (
              <>
                <Separator />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {church.description}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Contact Info */}
            {church.contact && (church.contact.phone || church.contact.email || church.contact.website) && (
              <>
                <Separator />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm leading-relaxed">
                    {church.contact.phone && (
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground min-w-[90px] font-medium">Téléphone:</span>
                        <a href={`tel:${church.contact.phone}`} className="hover:underline text-primary">
                          {church.contact.phone}
                        </a>
                      </div>
                    )}
                    {church.contact.email && (
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground min-w-[90px] font-medium">Email:</span>
                        <a href={`mailto:${church.contact.email}`} className="hover:underline text-primary">
                          {church.contact.email}
                        </a>
                      </div>
                    )}
                    {church.contact.website && (
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground min-w-[90px] font-medium">Site web:</span>
                        <a 
                          href={church.contact.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline text-primary inline-flex items-center gap-1.5"
                        >
                          Visiter
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Data Sources */}
            {church.dataSources.length > 0 && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                  <div className="font-semibold">Sources de données:</div>
                  <div className="space-y-1">
                    {church.dataSources.map((source, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span>• {source.type}</span>
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline text-primary"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
