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
