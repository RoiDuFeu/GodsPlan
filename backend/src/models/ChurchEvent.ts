/**
 * Church Event Model (NEW)
 * 
 * For concerts, pilgrimages, processions, conferences, etc.
 * Separate from mass schedules (which are recurring)
 */

export interface ChurchEvent {
  title: string;
  description?: string;
  date: Date; // Event date
  time?: string; // HH:MM format (optional)
  type: EventType;
  location?: string; // If different from church address
  contact?: string;
  registrationUrl?: string;
  isFree?: boolean;
  price?: number;
  metadata?: Record<string, unknown>;
}

export enum EventType {
  CONCERT = 'concert',
  PILGRIMAGE = 'pilgrimage',
  PROCESSION = 'procession',
  CONFERENCE = 'conference',
  RETREAT = 'retreat',
  FESTIVAL = 'festival',
  ADORATION = 'adoration',
  VIGIL = 'vigil',
  MEETING = 'meeting',
  OTHER = 'other',
}
