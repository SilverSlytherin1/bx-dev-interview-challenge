import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FileEntity } from '../../entities/file.entity';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly s3Service: S3Service,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<FileEntity> {
    const fileId = uuidv4();
    const s3Key = `uploads/${fileId}-${file.originalname}`;

    // Upload to S3
    await this.s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

    // Create file entity
    const fileEntity = this.fileRepository.create({
      fileName: file.filename || file.originalname,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      s3Key,
      userId,
    });

    return await this.fileRepository.save(fileEntity);
  }

  async getFileDownloadUrl(
    fileId: string,
    userId?: string,
  ): Promise<{ mimetype: string; url: string; originalName: string }> {
    const whereCondition: { id: string; userId?: string } = { id: fileId };
    if (userId) {
      whereCondition.userId = userId;
    }

    const file = await this.fileRepository.findOne({
      where: whereCondition,
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return {
      mimetype: file.mimeType,
      url: await this.s3Service.getFileDownloadUrl(file.s3Key),
      originalName: file.originalName,
    };
  }

  async listFiles(userId?: string): Promise<FileEntity[]> {
    const whereCondition: { userId?: string } = {};
    if (userId) {
      whereCondition.userId = userId;
    }

    return await this.fileRepository.find({
      where: whereCondition,
      order: { uploadedAt: 'DESC' },
    });
  }

  async deleteFile(fileId: string, userId?: string): Promise<void> {
    const whereCondition: { id: string; userId?: string } = { id: fileId };
    if (userId) {
      whereCondition.userId = userId;
    }

    const file = await this.fileRepository.findOne({
      where: whereCondition,
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Delete from S3
    await this.s3Service.deleteFile(file.s3Key);

    // Remove from database
    await this.fileRepository.remove(file);
  }

  async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    contentLength?: number,
    userId?: string,
  ): Promise<{
    uploadUrl: string;
    fields: Record<string, string>;
    fileId: string;
    s3Key: string;
  }> {
    this.logger.log(`Generating presigned URL for file: ${fileName}`);
    this.logger.debug(`Content-Type: ${contentType}, Size: ${contentLength}`);

    const fileId = uuidv4();
    const s3Key = `uploads/${fileId}-${fileName}`;

    const presignedData = await this.s3Service.getPresignedUploadUrl(
      s3Key,
      contentType,
      contentLength,
    );

    this.logger.log(
      `Generated presigned URL successfully for file ID: ${fileId}`,
    );

    // Create file entity with pending status - we'll update it after successful upload
    const fileEntity = this.fileRepository.create({
      id: fileId,
      fileName: fileName,
      originalName: fileName,
      size: contentLength || 0,
      mimeType: contentType,
      s3Key,
      userId,
      uploadedAt: new Date(), // We'll update this when upload is confirmed
    });

    await this.fileRepository.save(fileEntity);

    return {
      ...presignedData,
      fileId,
      s3Key,
    };
  }

  async confirmUpload(fileId: string, userId?: string): Promise<FileEntity> {
    const whereCondition: { id: string; userId?: string } = { id: fileId };
    if (userId) {
      whereCondition.userId = userId;
    }

    const file = await this.fileRepository.findOne({
      where: whereCondition,
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Verify the file actually exists in S3
    try {
      const fileExists = await this.s3Service.fileExists(file.s3Key);
      if (!fileExists) {
        throw new Error('File not found in S3 storage');
      }

      // Get file metadata from S3 to update our database
      const metadata = await this.s3Service.getFileMetadata(file.s3Key);
      if (metadata.contentLength && metadata.contentLength !== file.size) {
        file.size = metadata.contentLength;
      }
    } catch (error) {
      throw new Error(
        `Failed to verify file in S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Update the upload timestamp to confirm successful upload
    file.uploadedAt = new Date();
    return await this.fileRepository.save(file);
  }

  async checkS3Health(): Promise<void> {
    // Try to list objects to verify S3 connectivity
    await this.s3Service.listFiles('health-check');
  }

  async getFileStream(
    fileId: string,
    userId?: string,
  ): Promise<{
    stream: import('stream').Readable;
    mimetype: string;
    originalName: string;
    size: number;
  } | null> {
    const whereCondition: { id: string; userId?: string } = { id: fileId };
    if (userId) {
      whereCondition.userId = userId;
    }

    const file = await this.fileRepository.findOne({
      where: whereCondition,
    });

    if (!file) {
      return null;
    }

    try {
      const stream = await this.s3Service.getFileStream(file.s3Key);
      if (!stream) {
        return null;
      }

      return {
        stream,
        mimetype: file.mimeType,
        originalName: file.originalName,
        size: file.size,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error getting file stream for ${fileId}: ${errorMessage}`,
      );
      return null;
    }
  }
}
