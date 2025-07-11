import { Injectable, BadRequestException } from '@nestjs/common';

export interface FileValidationConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFileNameLength: number;
}

@Injectable()
export class FileValidationService {
  private readonly config: FileValidationConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      // Video
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ],
    allowedExtensions: [
      // Images
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
      '.bmp',
      '.tiff',
      '.ico',
      // Audio
      '.mp3',
      '.wav',
      '.ogg',
      '.m4a',
      // Video
      '.mp4',
      '.mpeg',
      '.mov',
      '.avi',
      '.webm',
    ],
    maxFileNameLength: 255,
  };

  /**
   * Validates file for multer uploads (Express.Multer.File)
   */
  validateMulterFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.validateFileSize(file.size);
    this.validateMimeType(file.mimetype);
    this.validateFileName(file.originalname);
    this.validateFileExtension(file.originalname);
  }

  /**
   * Validates file metadata for presigned uploads
   */
  validateFileMetadata(
    fileName: string,
    contentType: string,
    contentLength?: number,
  ): void {
    if (!fileName || !contentType) {
      throw new BadRequestException('fileName and contentType are required');
    }

    this.validateFileName(fileName);
    this.validateMimeType(contentType);
    this.validateFileExtension(fileName);

    if (contentLength !== undefined) {
      this.validateFileSize(contentLength);
    }
  }

  private validateFileSize(size: number): void {
    if (size <= 0) {
      throw new BadRequestException('File size must be greater than 0');
    }

    if (size > this.config.maxFileSize) {
      const maxSizeMB = this.config.maxFileSize / (1024 * 1024);
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      );
    }
  }

  private validateMimeType(mimeType: string): void {
    if (!mimeType) {
      throw new BadRequestException('File MIME type is required');
    }

    const normalizedMimeType = mimeType.toLowerCase();
    if (!this.config.allowedMimeTypes.includes(normalizedMimeType)) {
      throw new BadRequestException(
        `File type '${mimeType}' is not allowed. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  private validateFileName(fileName: string): void {
    if (!fileName || fileName.trim().length === 0) {
      throw new BadRequestException('File name is required');
    }

    if (fileName.length > this.config.maxFileNameLength) {
      throw new BadRequestException(
        `File name exceeds maximum length of ${this.config.maxFileNameLength} characters`,
      );
    }

    // Check for dangerous characters
    // eslint-disable-next-line no-control-regex
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      throw new BadRequestException('File name contains invalid characters');
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(fileName)) {
      throw new BadRequestException('File name uses a reserved name');
    }
  }

  private validateFileExtension(fileName: string): void {
    const extension = this.getFileExtension(fileName);

    if (!extension) {
      throw new BadRequestException('File must have an extension');
    }

    if (!this.config.allowedExtensions.includes(extension.toLowerCase())) {
      throw new BadRequestException(
        `File extension '${extension}' is not allowed. Allowed extensions: ${this.config.allowedExtensions.join(', ')}`,
      );
    }
  }

  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
      return '';
    }
    return fileName.substring(lastDotIndex);
  }

  /**
   * Get validation configuration for frontend
   */
  getValidationConfig(): FileValidationConfig {
    return { ...this.config };
  }

  /**
   * Check if file type is allowed
   */
  isFileTypeAllowed(mimeType: string, extension: string): boolean {
    return (
      this.config.allowedMimeTypes.includes(mimeType.toLowerCase()) &&
      this.config.allowedExtensions.includes(extension.toLowerCase())
    );
  }

  /**
   * Format file size for human readability
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
