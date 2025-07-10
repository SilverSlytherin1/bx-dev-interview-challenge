import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { User } from './user.entity';

export interface IFileEntity {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  s3Key: string;
  userId?: string;
}

@Entity('files')
export class FileEntity implements IFileEntity {
  @PrimaryGeneratedColumn('uuid')
  @Expose()
  id: string;

  @Column({ name: 'filename' })
  @Expose()
  fileName: string;

  @Column({ name: 'original_name' })
  @Expose()
  originalName: string;

  @Column()
  @Expose()
  size: number;

  @Column({ name: 'mime_type' })
  @Expose()
  mimeType: string;

  @Column({ name: 's3_key' })
  @Expose()
  s3Key: string;

  @Column({ name: 'user_id', nullable: true })
  @Expose()
  userId?: string;

  @ManyToOne(() => User, (user) => user.files, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @CreateDateColumn({ name: 'uploaded_at' })
  @Expose()
  uploadedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @Expose()
  updatedAt: Date;
}
