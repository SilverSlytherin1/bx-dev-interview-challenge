import { Expose } from 'class-transformer';

export interface IFileEntity {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  s3Key: string;
}

export class FileEntity implements IFileEntity {
  @Expose()
  id: string;

  @Expose()
  fileName: string;

  @Expose()
  originalName: string;

  @Expose()
  size: number;

  @Expose()
  mimeType: string;

  @Expose()
  uploadedAt: Date;

  @Expose()
  s3Key: string;

  constructor(
    id: string,
    fileName: string,
    originalName: string,
    size: number,
    mimeType: string,
    uploadedAt: Date,
    s3Key: string,
  ) {
    this.id = id;
    this.fileName = fileName;
    this.originalName = originalName;
    this.size = size;
    this.mimeType = mimeType;
    this.uploadedAt = uploadedAt;
    this.s3Key = s3Key;
  }
}
