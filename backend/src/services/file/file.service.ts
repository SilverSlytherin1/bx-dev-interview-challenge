import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FileEntity } from '../../entities/file.entity';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class FileService {
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

  async getFileDownloadUrl(fileId: string, userId?: string): Promise<string> {
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

    return await this.s3Service.getFileDownloadUrl(file.s3Key);
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
}
