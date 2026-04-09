import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Liturgy entity - stores daily Catholic mass readings
 * Sources: AELF API (French) + catholic-readings-api/USCCB (English)
 */
@Entity('liturgy')
@Index(['date'], { unique: true })
export class Liturgy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date', unique: true })
  date!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  liturgicalDay?: string; // English: e.g., "Holy Week"

  @Column({ type: 'varchar', length: 255, nullable: true })
  liturgicalDayFr?: string; // French: e.g., "Jeudi dans l'Octave de Pâques"

  @Column({ type: 'varchar', length: 50, nullable: true })
  liturgicalColor?: string; // e.g., "purple", "white", "green", "red"

  // English readings (from USCCB)
  @Column({ type: 'jsonb' })
  readings!: {
    title: string;
    reference: string;
    text: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  psalm?: {
    reference: string;
    refrain: string;
    text: string;
  };

  // French readings (from AELF)
  @Column({ type: 'jsonb', nullable: true })
  readingsFr?: {
    title: string;
    reference: string;
    text: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  psalmFr?: {
    reference: string;
    refrain: string;
    text: string;
  };

  @Column({ type: 'varchar', length: 500, nullable: true })
  usccbLink?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
