import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Liturgy entity - stores daily Catholic mass readings
 * Scraped from AELF API
 */
@Entity('liturgy')
@Index(['date'], { unique: true })
export class Liturgy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date', unique: true })
  date!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  liturgicalDay?: string; // e.g., "2e dimanche de l'Avent"

  @Column({ type: 'varchar', length: 50, nullable: true })
  liturgicalColor?: string; // e.g., "violet", "blanc", "vert", "rouge"

  @Column({ type: 'jsonb' })
  readingsFr!: {
    title: string;
    reference: string;
    text: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  readingsEn?: {
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

  @Column({ type: 'jsonb', nullable: true })
  psalmEn?: {
    reference: string;
    refrain: string;
    text: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
