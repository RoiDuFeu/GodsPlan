import type { Church } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SwipeableMassRow } from '@/components/SwipeableMassRow';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ChurchDetailPanelProps {
  church: Church;
  onBack: () => void;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function ChurchDetailPanel({ church, onBack }: ChurchDetailPanelProps) {
  const { t } = useTranslation();
  const lat = parseFloat(church.latitude);
  const lng = parseFloat(church.longitude);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const addressString = [
    church.address.street,
    church.address.postalCode,
    church.address.city
  ].filter(Boolean).join(', ');

  const dayNames = DAY_KEYS.map(key => t(`days.${key}`));

  const schedulesByDay = church.massSchedules.reduce((acc, schedule) => {
    const day = dayNames[schedule.dayOfWeek];
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {} as Record<string, typeof church.massSchedules>);

  const sortedDays = dayNames.filter(day => schedulesByDay[day]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Compact sticky header */}
      <div className="flex-shrink-0 border-b border-border">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-300"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          {t('churchDetail.backToList')}
        </button>

        {/* Church name + actions — compact inline */}
        <div className="px-4 pb-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg sacred-gradient flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-primary-foreground text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-headline font-extrabold text-lg tracking-tighter leading-tight">{church.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-label uppercase tracking-widest text-muted-foreground truncate">
                {church.address.district || addressString}
              </span>
              <div className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded text-primary shrink-0">
                <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-[10px] font-bold">{church.reliabilityScore}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Address + route button */}
        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-on-surface-variant text-xs min-w-0">
            <span className="material-symbols-outlined text-sm opacity-60 shrink-0">location_on</span>
            <span className="truncate">{addressString}</span>
          </div>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 px-3 py-1.5 bg-secondary-container text-secondary rounded-md font-bold text-[11px] transition-all hover:shadow-[0_0_16px_hsl(var(--secondary)/0.2)] shrink-0"
          >
            {t('churchDetail.routes')}
            <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-0.5 transition-transform">directions</span>
          </a>
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Mass Schedule */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="material-symbols-outlined text-primary text-lg">schedule</span>
              <h3 className="font-headline font-bold text-sm">{t('churchDetail.massSchedule')}</h3>
            </div>

            {sortedDays.length > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden bg-surface-container">
                {sortedDays.map((day, index) => {
                  const daySchedules = schedulesByDay[day];
                  const times = daySchedules.map(s => s.time).join(' \u2022 ');
                  const rite = daySchedules[0]?.rite;
                  const language = daySchedules[0]?.language;

                  return (
                    <SwipeableMassRow
                      key={day}
                      churchId={church.id}
                      dayOfWeek={daySchedules[0].dayOfWeek}
                      className={index < sortedDays.length - 1 ? 'border-b border-border' : undefined}
                    >
                      <div className="px-3 py-2.5">
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <span className="font-label text-[9px] uppercase tracking-widest text-primary block">
                              {day}
                            </span>
                            <span className="font-headline font-bold text-[13px]">{times || t('churchDetail.noMass')}</span>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-1.5">
                            {rite && (
                              <span className="text-[9px] text-secondary bg-secondary-container px-1.5 py-0.5 rounded">{rite}</span>
                            )}
                            {language && (
                              <span className="text-[9px] text-muted-foreground">{language}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </SwipeableMassRow>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-outline-variant/30 p-5 text-center">
                <span className="material-symbols-outlined text-2xl text-muted-foreground mb-1">schedule</span>
                <p className="text-xs text-muted-foreground">{t('churchDetail.noSchedule')}</p>
              </div>
            )}
          </div>

          {/* Confession Schedule */}
          {church.confessionSchedules && church.confessionSchedules.length > 0 && (() => {
            const confByDay = church.confessionSchedules!.reduce((acc, s) => {
              const day = dayNames[s.dayOfWeek];
              if (!acc[day]) acc[day] = [];
              acc[day].push(s);
              return acc;
            }, {} as Record<string, typeof church.confessionSchedules>);
            const confDays = dayNames.filter(d => confByDay[d]);

            return (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="material-symbols-outlined text-primary text-lg">sentiment_satisfied</span>
                  <h3 className="font-headline font-bold text-sm">{t('churchDetail.confession')}</h3>
                </div>
                <div className="rounded-lg border border-border overflow-hidden bg-surface-container">
                  {confDays.map((day, index) => {
                    const slots = confByDay[day]!;
                    return (
                      <div
                        key={day}
                        className={cn(
                          'px-3 py-2.5 hover:bg-surface-bright transition-colors',
                          index < confDays.length - 1 && 'border-b border-border'
                        )}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <span className="font-label text-[9px] uppercase tracking-widest text-primary block">
                              {day}
                            </span>
                            <span className="font-headline font-bold text-[13px]">
                              {slots.map(s => `${s.startTime} – ${s.endTime}`).join(' • ')}
                            </span>
                          </div>
                          {slots.some(s => s.note) && (
                            <span className="text-[9px] text-muted-foreground italic shrink-0">
                              {slots.find(s => s.note)?.note}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* About */}
          {church.description && (
            <div className="border-b border-border pb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-lg">history_edu</span>
                <h3 className="font-headline font-bold text-sm">{t('common.about')}</h3>
              </div>
              <p className="text-on-surface-variant leading-relaxed text-xs">{church.description}</p>
            </div>
          )}

          {/* Contact */}
          {church.contact && (church.contact.phone || church.contact.email) && (
            <div className="border-b border-border pb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-lg">contact_support</span>
                <h3 className="font-headline font-bold text-sm">{t('common.contact')}</h3>
              </div>
              <div className="space-y-1.5">
                {church.contact.phone && (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-high border border-border">
                    <span className="material-symbols-outlined text-secondary text-lg">call</span>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-label">{t('common.phone')}</p>
                      <a href={`tel:${church.contact.phone}`} className="text-xs font-bold hover:text-primary transition-colors">
                        {church.contact.phone}
                      </a>
                    </div>
                  </div>
                )}
                {church.contact.email && (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-high border border-border">
                    <span className="material-symbols-outlined text-secondary text-lg">mail</span>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-label">{t('common.email')}</p>
                      <a href={`mailto:${church.contact.email}`} className="text-xs font-bold hover:text-primary transition-colors">
                        {church.contact.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sources footer */}
          {church.dataSources.length > 0 && (
            <div className="flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-label uppercase tracking-widest text-muted-foreground">
                {church.dataSources.map(s => s.type).join(', ')}
              </span>
              <span className="text-[9px] font-label uppercase tracking-widest text-muted-foreground">
                {t('common.updated')} {new Date(church.updatedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
