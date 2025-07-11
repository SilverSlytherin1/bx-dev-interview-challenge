export interface IMessageDto {
  message: string;
}

export interface IFileUploadDto {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  downloadUrl?: string;
}

export interface IFileListDto {
  files: IFileUploadDto[];
}
