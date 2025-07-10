import { Injectable } from '@nestjs/common';
import { IMessageEntity, MessageEntity } from '../../entities/message.entity';
import { IFileEntity } from '../../entities/file.entity';
import { FileService } from '../file/file.service';
import { IAppService } from './app.service.interface';

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

  async getFileDownloadUrl(fileId: string, userId?: string): Promise<string> {
    return await this.fileService.getFileDownloadUrl(fileId, userId);
  }

  listFiles(userId?: string): Promise<IFileEntity[]> {
    return this.fileService.listFiles(userId);
  }

  async deleteFile(fileId: string, userId?: string): Promise<void> {
    return await this.fileService.deleteFile(fileId, userId);
  }
}
