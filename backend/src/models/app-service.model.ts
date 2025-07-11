import { IMessageEntity } from './message.model';
import { IFileEntity } from './file.model';
import { Readable } from 'stream';

export interface IAppService {
  getHello(): IMessageEntity;
  uploadFile(file: Express.Multer.File, userId?: string): Promise<IFileEntity>;
  getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    contentLength?: number,
    userId?: string,
  ): Promise<{
    uploadUrl: string;
    fields: Record<string, string>;
    fileId: string;
    s3Key: string;
  }>;
  confirmUpload(fileId: string, userId?: string): Promise<IFileEntity>;
  getFileDownloadUrl(
    fileId: string,
    userId?: string,
  ): Promise<{ mimetype: string; url: string; originalName: string }>;
  getFileStream(
    fileId: string,
    userId?: string,
  ): Promise<{
    stream: Readable;
    mimetype: string;
    originalName: string;
    size: number;
  } | null>;
  listFiles(userId?: string): Promise<IFileEntity[]>;
  deleteFile(fileId: string, userId?: string): Promise<void>;
  checkS3Health(): Promise<void>;
}
