import { IMessageEntity } from '@/entities/message.entity';
import { IFileEntity } from '@/entities/file.entity';

export interface IAppService {
  getHello(): IMessageEntity;
  uploadFile(file: Express.Multer.File, userId?: string): Promise<IFileEntity>;
  getFileDownloadUrl(fileId: string, userId?: string): Promise<string>;
  listFiles(userId?: string): Promise<IFileEntity[]>;
  deleteFile(fileId: string, userId?: string): Promise<void>;
}
