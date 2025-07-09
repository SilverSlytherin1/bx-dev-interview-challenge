import { Injectable, NotFoundException } from '@nestjs/common';
import { IMessageEntity, MessageEntity } from '../../entities/message.entity';
import { IFileEntity, FileEntity } from '../../entities/file.entity';
import { S3Service } from '../s3/s3.service';
import { IAppService } from './app.service.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AppService implements IAppService {
  private files: Map<string, IFileEntity> = new Map();

  constructor(private readonly s3Service: S3Service) {}

  getHello(): IMessageEntity {
    const message = "I'm Mr. Meeseeks, look at me!";

    const entity = new MessageEntity(message);
    return entity;
  }

  async uploadFile(file: Express.Multer.File): Promise<IFileEntity> {
    const fileId = uuidv4();
    const s3Key = `uploads/${fileId}-${file.originalname}`;

    // Upload to S3
    await this.s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

    // Create file entity
    const fileEntity = new FileEntity(
      fileId,
      file.filename || file.originalname,
      file.originalname,
      file.size,
      file.mimetype,
      new Date(),
      s3Key,
    );

    // Store in memory (in a real app, this would be a database)
    this.files.set(fileId, fileEntity);

    return fileEntity;
  }

  async getFileDownloadUrl(fileId: string): Promise<string> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return await this.s3Service.getFileDownloadUrl(file.s3Key);
  }

  listFiles(): Promise<IFileEntity[]> {
    return Promise.resolve(Array.from(this.files.values()));
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Delete from S3
    await this.s3Service.deleteFile(file.s3Key);

    // Remove from memory storage
    this.files.delete(fileId);
  }
}
