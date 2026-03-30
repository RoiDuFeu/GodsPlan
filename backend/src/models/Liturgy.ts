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

  @Column({ type: 'varchar', length: 500, nullable: true })
  usccbLink?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
