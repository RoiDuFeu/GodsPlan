import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  @Index()
  userId!: string;

  @Column({ type: 'jsonb', default: [] })
  subscribedChurches!: string[];

  @Column({ type: 'varchar', length: 10, default: 'fr' })
  language!: string;

  @Column({ type: 'varchar', length: 10, default: 'system' })
  theme!: string;

  @Column({ type: 'boolean', default: false })
  reminderEnabled!: boolean;

  @Column({ type: 'varchar', length: 5, default: '07:00' })
  reminderTime!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
