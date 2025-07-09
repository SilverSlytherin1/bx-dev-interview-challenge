import { IMessageEntity } from '@/entities/message.entity';
import { IFileEntity } from '@/entities/file.entity';

export interface IAppService {
  getHello(): IMessageEntity;
  uploadFile(file: Express.Multer.File): Promise<IFileEntity>;
  getFileDownloadUrl(fileId: string): Promise<string>;
  listFiles(): Promise<IFileEntity[]>;
  deleteFile(fileId: string): Promise<void>;
}
