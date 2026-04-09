/**
 * FrenchScheduleParser — Heuristic parser for French Catholic church schedules.
 *
 * Extracts mass times, confession/adoration schedules, and events from
 * unstructured French text found on parish websites. No external API needed.
 */

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface ParsedMassSchedule {
  dayOfWeek: number;
  time: string; // HH:MM
  rite?: string;
  language?: string;
  notes?: string;
}

export interface ParsedOfficeSchedule {
  type: 'confession' | 'adoration' | 'vespers' | 'lauds' | 'other';
  dayOfWeek: number;
  startTime: string; // HH:MM
  endTime?: string; // HH:MM
  notes?: string;
}

export interface ParsedEvent {
  title: string;
  date?: string; // ISO date string
  time?: string; // HH:MM
  type: string;
  description?: string;
}

export interface ParsedScheduleData {
  massSchedules: ParsedMassSchedule[];
  officeSchedules: ParsedOfficeSchedule[];
  events: ParsedEvent[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

const DAY_GROUPS: Record<string, number[]> = {
  'en semaine': [1, 2, 3, 4, 5],
  'jours de semaine': [1, 2, 3, 4, 5],
  'du lundi au vendredi': [1, 2, 3, 4, 5],
  'du lundi au samedi': [1, 2, 3, 4, 5, 6],
  'week-end': [0, 6],
  'le week-end': [0, 6],
  'tous les jours': [0, 1, 2, 3, 4, 5, 6],
  'chaque jour': [0, 1, 2, 3, 4, 5, 6],
};

/** Regex matching French time patterns: 18h30, 9h, 18:30, 9 h 00, 09H30 */
const TIME_REGEX = /(\d{1,2})\s*[hH:]\s*(\d{0,2})/g;

/** Broader time pattern for detecting schedule-relevant lines */
const HAS_TIME_REGEX = /\d{1,2}\s*[hH:]\s*\d{0,2}/;

const SECTION_KEYWORDS = {
  mass: [
    'messe', 'messes', 'eucharistie', 'célébration', 'celebrations',
    'celebrer', 'horaires des messes', 'horaire des messes',
  ],
  confession: [
    'confession', 'confessions', 'réconciliation', 'reconciliation',
    'sacrement de réconciliation', 'sacrement de pénitence', 'pénitence',
  ],
  adoration: [
    'adoration', 'saint-sacrement', 'saint sacrement', 'exposition',
  ],
  vespers: ['vêpres', 'vepres'],
  lauds: ['laudes'],
  office: ['office', 'offices', 'complies', 'liturgie des heures'],
  event: [
    'concert', 'pèlerinage', 'pelerinage', 'retraite', 'conférence',
    'conference', 'événement', 'evenement', 'agenda', 'actualité',
    'actualite', 'procession', 'fête', 'fete',
  ],
};

const LATIN_RITE_KEYWORDS = [
  'forme extraordinaire', 'rite tridentin', 'messe en latin',
  'usus antiquior', 'vetus ordo', 'messe traditionnelle',
  'rite extraordinaire', 'rite ancien', 'saint pie v',
  'messe tridentine',
];

const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  Latin: ['en latin', 'latin'],
  English: ['en anglais', 'english'],
  Spanish: ['en espagnol', 'español'],
  Portuguese: ['en portugais', 'português'],
  Italian: ['en italien', 'italiano'],
  Polish: ['en polonais', 'polski'],
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeTime(hours: string, minutes: string): string | null {
  const h = parseInt(hours, 10);
  const m = parseInt(minutes || '0', 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function extractTimes(text: string): string[] {
  const times: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(TIME_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const t = normalizeTime(match[1], match[2]);
    if (t) times.push(t);
  }
  return times;
}

function extractTimeRange(text: string): { start: string; end?: string } | null {
  // "de 10h à 12h", "de 10h00 à 12h00", "10h-12h"
  const rangeRegex = /(?:de\s+)?(\d{1,2})\s*[hH:]\s*(\d{0,2})\s*(?:à|[-–])\s*(\d{1,2})\s*[hH:]\s*(\d{0,2})/i;
  const match = rangeRegex.exec(text);
  if (!match) return null;
  const start = normalizeTime(match[1], match[2]);
  const end = normalizeTime(match[3], match[4]);
  if (!start) return null;
  return { start, end: end || undefined };
}

function extractDays(text: string): number[] {
  const lower = text.toLowerCase();
  const days = new Set<number>();

  // Check day groups first (longer patterns)
  for (const [pattern, dayList] of Object.entries(DAY_GROUPS)) {
    if (lower.includes(pattern)) {
      dayList.forEach((d) => days.add(d));
    }
  }

  // Check "du X au Y" range pattern
  const rangeRegex = /du\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+au\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/gi;
  let rangeMatch: RegExpExecArray | null;
  while ((rangeMatch = rangeRegex.exec(lower)) !== null) {
    const from = DAY_MAP[rangeMatch[1].toLowerCase()];
    const to = DAY_MAP[rangeMatch[2].toLowerCase()];
    if (from !== undefined && to !== undefined) {
      // Handle wrap-around (e.g., samedi au dimanche)
      let d = from;
      while (d !== to) {
        days.add(d);
        d = (d + 1) % 7;
      }
      days.add(to);
    }
  }

  // Check individual day names
  for (const [name, num] of Object.entries(DAY_MAP)) {
    if (lower.includes(name)) {
      days.add(num);
    }
  }

  return Array.from(days).sort((a, b) => a - b);
}

function detectRite(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const keyword of LATIN_RITE_KEYWORDS) {
    if (lower.includes(keyword)) return 'Tridentine';
  }
  if (lower.includes('byzantin')) return 'Byzantine';
  if (lower.includes('maronite')) return 'Maronite';
  if (lower.includes('arménien') || lower.includes('armenien')) return 'Armenian';
  return undefined;
}

function detectLanguage(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return lang;
    }
  }
  return undefined;
}

function classifySection(text: string): 'mass' | 'confession' | 'adoration' | 'vespers' | 'lauds' | 'office' | 'event' | null {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(SECTION_KEYWORDS)) {
    scores[category] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[category] += kw.length; // longer keywords get more weight
      }
    }
  }

  const best = Object.entries(scores).reduce(
    (acc, [cat, score]) => (score > acc.score ? { category: cat, score } : acc),
    { category: null as string | null, score: 0 },
  );

  return best.score > 0 ? (best.category as ReturnType<typeof classifySection>) : null;
}

// ── Section Splitting ───────────────────────────────────────────────────────

interface TextSection {
  heading: string;
  body: string;
  category: ReturnType<typeof classifySection>;
}

function splitIntoSections(text: string): TextSection[] {
  // Split on lines that look like headings (short, no time, often uppercase or title-like)
  const lines = text.split('\n');
  const sections: TextSection[] = [];
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isHeading =
      trimmed.length < 80 &&
      !HAS_TIME_REGEX.test(trimmed) &&
      (trimmed === trimmed.toUpperCase() ||
        /^[A-ZÀ-Ú]/.test(trimmed)) &&
      classifySection(trimmed) !== null;

    if (isHeading && currentBody.length > 0) {
      const fullText = currentHeading + '\n' + currentBody.join('\n');
      sections.push({
        heading: currentHeading,
        body: currentBody.join('\n'),
        category: classifySection(fullText),
      });
      currentHeading = trimmed;
      currentBody = [];
    } else if (isHeading && currentBody.length === 0) {
      currentHeading = trimmed;
    } else {
      currentBody.push(trimmed);
    }
  }

  // Push last section
  if (currentBody.length > 0 || currentHeading) {
    const fullText = currentHeading + '\n' + currentBody.join('\n');
    sections.push({
      heading: currentHeading,
      body: currentBody.join('\n'),
      category: classifySection(fullText),
    });
  }

  return sections;
}

// ── Main Parser ─────────────────────────────────────────────────────────────

export function parseSchedules(text: string): ParsedScheduleData {
  const result: ParsedScheduleData = {
    massSchedules: [],
    officeSchedules: [],
    events: [],
  };

  const sections = splitIntoSections(text);

  // If we got no classified sections, try parsing the whole text as mass schedules
  const classified = sections.filter((s) => s.category !== null);
  if (classified.length === 0) {
    result.massSchedules = parseMassLines(text);
    return result;
  }

  for (const section of sections) {
    const fullText = section.heading + '\n' + section.body;

    switch (section.category) {
      case 'mass':
        result.massSchedules.push(...parseMassLines(fullText));
        break;
      case 'confession':
        result.officeSchedules.push(...parseOfficeLines(fullText, 'confession'));
        break;
      case 'adoration':
        result.officeSchedules.push(...parseOfficeLines(fullText, 'adoration'));
        break;
      case 'vespers':
        result.officeSchedules.push(...parseOfficeLines(fullText, 'vespers'));
        break;
      case 'lauds':
        result.officeSchedules.push(...parseOfficeLines(fullText, 'lauds'));
        break;
      case 'office':
        result.officeSchedules.push(...parseOfficeLines(fullText, 'other'));
        break;
      case 'event':
        result.events.push(...parseEventLines(fullText));
        break;
      default:
        // Unclassified sections — check if they contain times + days
        if (HAS_TIME_REGEX.test(fullText)) {
          result.massSchedules.push(...parseMassLines(fullText));
        }
        break;
    }
  }

  // Deduplicate mass schedules by (dayOfWeek, time)
  result.massSchedules = deduplicateMass(result.massSchedules);

  return result;
}

// ── Mass Schedule Parsing ───────────────────────────────────────────────────

function parseMassLines(text: string): ParsedMassSchedule[] {
  const schedules: ParsedMassSchedule[] = [];
  const lines = text.split('\n');

  // Track context: last seen day(s) carry forward across lines
  let contextDays: number[] = [];
  const globalRite = detectRite(text);
  const globalLanguage = detectLanguage(text);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lineDays = extractDays(trimmed);
    const lineTimes = extractTimes(trimmed);
    const lineRite = detectRite(trimmed) || globalRite;
    const lineLanguage = detectLanguage(trimmed) || globalLanguage;

    if (lineDays.length > 0) {
      contextDays = lineDays;
    }

    if (lineTimes.length > 0 && contextDays.length > 0) {
      for (const day of contextDays) {
        for (const time of lineTimes) {
          schedules.push({
            dayOfWeek: day,
            time,
            rite: lineRite,
            language: lineLanguage,
          });
        }
      }
    } else if (lineTimes.length > 0 && contextDays.length === 0) {
      // Times without day context — could be daily
      for (const time of lineTimes) {
        schedules.push({
          dayOfWeek: -1, // unknown
          time,
          rite: lineRite,
          language: lineLanguage,
          notes: trimmed.length < 120 ? trimmed : undefined,
        });
      }
    }
  }

  // Filter out unknown-day entries if we have known-day entries
  const knownDay = schedules.filter((s) => s.dayOfWeek >= 0);
  if (knownDay.length > 0) {
    return knownDay;
  }
  // If all entries have unknown day, default to Sunday (most likely)
  return schedules.map((s) => (s.dayOfWeek === -1 ? { ...s, dayOfWeek: 0 } : s));
}

// ── Office Schedule Parsing (Confession, Adoration, etc.) ──────────────────

function parseOfficeLines(
  text: string,
  type: 'confession' | 'adoration' | 'vespers' | 'lauds' | 'other',
): ParsedOfficeSchedule[] {
  const schedules: ParsedOfficeSchedule[] = [];
  const lines = text.split('\n');

  let contextDays: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lineDays = extractDays(trimmed);
    if (lineDays.length > 0) {
      contextDays = lineDays;
    }

    // Try time range first ("de 10h à 12h")
    const range = extractTimeRange(trimmed);
    if (range && contextDays.length > 0) {
      for (const day of contextDays) {
        schedules.push({
          type,
          dayOfWeek: day,
          startTime: range.start,
          endTime: range.end,
        });
      }
      continue;
    }

    // Fall back to individual times
    const lineTimes = extractTimes(trimmed);
    if (lineTimes.length > 0 && contextDays.length > 0) {
      for (const day of contextDays) {
        // If we have 2 times on the same line, treat as range
        if (lineTimes.length === 2) {
          schedules.push({
            type,
            dayOfWeek: day,
            startTime: lineTimes[0],
            endTime: lineTimes[1],
          });
        } else {
          for (const time of lineTimes) {
            schedules.push({
              type,
              dayOfWeek: day,
              startTime: time,
            });
          }
        }
      }
    }
  }

  return schedules;
}

// ── Event Parsing ───────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3,
  mai: 4, juin: 5, juillet: 6, août: 7, aout: 7,
  septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
};

function parseEventLines(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    // Try to extract a date
    const dateMatch = trimmed.match(
      /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)(?:\s+(\d{4}))?/i,
    );

    let date: string | undefined;
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = MONTH_MAP[dateMatch[2].toLowerCase()];
      const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
      if (month !== undefined && day >= 1 && day <= 31) {
        date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    const times = extractTimes(trimmed);
    const time = times.length > 0 ? times[0] : undefined;

    // Classify event type
    const lower = trimmed.toLowerCase();
    let eventType = 'other';
    if (lower.includes('concert')) eventType = 'concert';
    else if (lower.includes('pèlerinage') || lower.includes('pelerinage')) eventType = 'pilgrimage';
    else if (lower.includes('retraite')) eventType = 'retreat';
    else if (lower.includes('conférence') || lower.includes('conference')) eventType = 'conference';
    else if (lower.includes('procession')) eventType = 'procession';
    else if (lower.includes('fête') || lower.includes('fete')) eventType = 'celebration';

    // Only add if we have both a title and a date (otherwise it's not a usable event)
    const title = trimmed.slice(0, 120);
    if (date && title.length > 0) {
      events.push({
        title,
        date,
        time,
        type: eventType,
      });
    }
  }

  return events;
}

// ── Deduplication ───────────────────────────────────────────────────────────

function deduplicateMass(schedules: ParsedMassSchedule[]): ParsedMassSchedule[] {
  const seen = new Set<string>();
  return schedules.filter((s) => {
    const key = `${s.dayOfWeek}:${s.time}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
