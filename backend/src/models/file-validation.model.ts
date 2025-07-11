export interface FileValidationConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFileNameLength: number;
}
