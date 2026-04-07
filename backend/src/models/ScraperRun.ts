import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export interface ScraperError {
  church?: string;
  url?: string;
  message: string;
  timestamp: string;
}

@Entity('scraper_runs')
export class ScraperRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  scraperName!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status!: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

  @Column({ type: 'varchar', array: true, default: '{}' })
  departments!: string[];

  @Column({ type: 'int', default: 0 })
  churchesFound!: number;

  @Column({ type: 'int', default: 0 })
  churchesSaved!: number;

  @Column({ type: 'int', default: 0 })
  errorCount!: number;

  @Column({ type: 'jsonb', default: '[]' })
  errors!: ScraperError[];

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  durationMs!: number | null;
}
