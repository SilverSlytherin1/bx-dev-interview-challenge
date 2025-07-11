export interface FileUploadResponse {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface FileListResponse {
  files: FileUploadResponse[];
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fields: Record<string, string>;
  fileId: string;
  s3Key: string;
}

export interface FileValidationConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFileNameLength: number;
}
