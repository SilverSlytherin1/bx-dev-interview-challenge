import { Injectable } from '@nestjs/common';
import { MessageEntity } from '../../entities/message.entity';
import { IMessageEntity } from '../../models/message.model';
import { IFileEntity } from '../../models/file.model';
import { FileService } from '../file/file.service';
import { IAppService } from '../../models/app-service.model';

@Injectable()
export class AppService implements IAppService {
  constructor(private readonly fileService: FileService) {}

  getHello(): IMessageEntity {
    const message = "I'm Mr. Meeseeks, look at me!";

    const entity = new MessageEntity(message);
    return entity;
  }

  async uploadFile(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<IFileEntity> {
    return await this.fileService.uploadFile(file, userId);
  }

  async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    contentLength?: number,
    userId?: string,
  ): Promise<{
    uploadUrl: string;
    fields: Record<string, string>;
    fileId: string;
    s3Key: string;
  }> {
    return await this.fileService.getPresignedUploadUrl(
      fileName,
      contentType,
      contentLength,
      userId,
    );
  }

  async confirmUpload(fileId: string, userId?: string): Promise<IFileEntity> {
    return await this.fileService.confirmUpload(fileId, userId);
  }

  async getFileDownloadUrl(
    fileId: string,
    userId?: string,
  ): Promise<{ mimetype: string; url: string; originalName: string }> {
    return await this.fileService.getFileDownloadUrl(fileId, userId);
  }

  async getFileStream(
    fileId: string,
    userId?: string,
  ): Promise<{
    stream: import('stream').Readable;
    mimetype: string;
    originalName: string;
    size: number;
  } | null> {
    try {
      return await this.fileService.getFileStream(fileId, userId);
    } catch {
      return null;
    }
  }

  listFiles(userId?: string): Promise<IFileEntity[]> {
    return this.fileService.listFiles(userId);
  }

  async deleteFile(fileId: string, userId?: string): Promise<void> {
    return await this.fileService.deleteFile(fileId, userId);
  }

  async checkS3Health(): Promise<void> {
    // Delegate to file service which uses S3 service
    return await this.fileService.checkS3Health();
  }
}
