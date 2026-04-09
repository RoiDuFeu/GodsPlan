import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ChurchRite {
  LATIN_TRADITIONAL = 'Tridentine',
  PAUL_VI = 'Paul VI',
  BYZANTINE = 'Byzantine',
  ARMENIAN = 'Armenian',
  MARONITE = 'Maronite',
  OTHER = 'Other',
}

export interface ChurchAddress {
  street: string;
  postalCode: string;
  city: string;
  district?: string;
}

export interface ChurchContact {
  phone?: string;
  email?: string;
  website?: string;
}

export interface MassSchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  time: string; // HH:MM format
  rite: ChurchRite;
  language?: string;
  notes?: string;
}

export interface ChurchAccessibility {
  wheelchairAccessible: boolean;
  hearingLoop: boolean;
  parking: boolean;
  notes?: string;
}

export interface DataSource {
  name: string; // e.g., "messes.info", "diocese-paris", "google-places"
  url?: string;
  lastScraped: Date;
  reliability: number; // 0-100 score
  metadata?: Record<string, unknown>;
}

export interface ChurchEvent {
  title: string;
  description?: string;
  date: Date; // Event date
  time?: string; // HH:MM format (optional)
  type: string; // concert, pilgrimage, procession, conference, etc.
  location?: string; // If different from church address
  contact?: string;
  registrationUrl?: string;
  isFree?: boolean;
  price?: number;
  metadata?: Record<string, unknown>;
}

export interface OfficeSchedule {
  type: 'confession' | 'adoration' | 'vespers' | 'lauds' | 'other';
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime?: string; // HH:MM format (optional)
  notes?: string;
}

@Entity('churches')
export class Church {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb' })
  address!: ChurchAddress;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, select: false })
  @Index({ spatial: true })
  location!: { type: 'Point'; coordinates: [number, number] }; // PostGIS geography point

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number;

  @Column({ type: 'jsonb', nullable: true })
  contact?: ChurchContact;

  @Column({ type: 'jsonb', default: [] })
  massSchedules!: MassSchedule[];

  @Column({
    type: 'varchar',
    array: true,
    default: [ChurchRite.PAUL_VI],
  })
  rites!: ChurchRite[];

  @Column({ type: 'varchar', array: true, default: ['French'] })
  languages!: string[];

  @Column({ type: 'jsonb', nullable: true })
  accessibility?: ChurchAccessibility;

  @Column({ type: 'varchar', array: true, default: [] })
  photos!: string[]; // URLs to photos

  @Column({ type: 'jsonb', default: [] })
  officeSchedules!: OfficeSchedule[]; // Confessions, adoration, vespers, etc.

  @Column({ type: 'jsonb', default: [] })
  upcomingEvents!: ChurchEvent[]; // Concerts, pilgrimages, special events

  @Column({ type: 'jsonb', default: [] })
  dataSources!: DataSource[];

  @Column({ type: 'int', default: 0 })
  reliabilityScore!: number; // Computed from dataSources

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastVerified?: Date;
}
