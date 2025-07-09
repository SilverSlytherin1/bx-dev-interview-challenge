import { Expose } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export interface IFileUploadDto {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  downloadUrl?: string;
}

export class FileUploadDto implements IFileUploadDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsString()
  fileName: string;

  @Expose()
  @IsString()
  originalName: string;

  @Expose()
  @IsNumber()
  size: number;

  @Expose()
  @IsString()
  mimeType: string;

  @Expose()
  @IsDateString()
  uploadedAt: Date;

  @Expose()
  @IsOptional()
  @IsString()
  downloadUrl?: string;

  constructor(
    id: string,
    fileName: string,
    originalName: string,
    size: number,
    mimeType: string,
    uploadedAt: Date,
    downloadUrl?: string,
  ) {
    this.id = id;
    this.fileName = fileName;
    this.originalName = originalName;
    this.size = size;
    this.mimeType = mimeType;
    this.uploadedAt = uploadedAt;
    this.downloadUrl = downloadUrl;
  }
}
