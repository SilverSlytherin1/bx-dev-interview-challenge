import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Request,
  Response,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response as ExpressResponse } from 'express';
import { FileListDto, IFileListDto } from '../dtos/file-list.dto';
import { FileUploadDto, IFileUploadDto } from '../dtos/file-upload.dto';
import { IMessageDto, MessageDto } from '../dtos/message.dto';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { AppService } from '../services/app/app.service';
import { JwtAuthGuard } from '../services/auth/jwt-auth.guard';
import { FileValidationService } from '../services/validation/file-validation.service';
import { Mapper } from '../utils/mapper/mapper';

@Controller()
export class AppController {
  constructor(
    @Inject(AppService) private readonly appService: AppService,
    private readonly fileValidationService: FileValidationService,
  ) {}

  @Get('hello')
  getHello(): IMessageDto {
    const entity = this.appService.getHello();

    const dto = Mapper.mapData(MessageDto, entity);
    return dto;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ): Promise<IFileUploadDto> {
    // Validate file using the validation service
    this.fileValidationService.validateMulterFile(file);

    try {
      const userId = req.user.id;
      const entity = await this.appService.uploadFile(file, userId);

      // Map entity to DTO and include download URL
      const dto = new FileUploadDto(
        entity.id,
        entity.fileName,
        entity.originalName,
        entity.size,
        entity.mimeType,
        entity.uploadedAt,
        `/api/files/${entity.id}/download`,
      );

      return dto;
    } catch (error) {
      if (error instanceof Error) {
        throw new HttpException(
          `Failed to upload file: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Failed to upload file: Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload/presigned')
  @UseGuards(JwtAuthGuard)
  async getPresignedUploadUrl(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: { fileName: string; contentType: string; contentLength?: number },
  ): Promise<{
    uploadUrl: string;
    fields: Record<string, string>;
    fileId: string;
    s3Key: string;
  }> {
    try {
      const userId = req.user.id;
      const { fileName, contentType, contentLength } = body;

      // Validate file metadata using the validation service
      this.fileValidationService.validateFileMetadata(
        fileName,
        contentType,
        contentLength,
      );

      const presignedData = await this.appService.getPresignedUploadUrl(
        fileName,
        contentType,
        contentLength,
        userId,
      );

      return presignedData;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HTTP exceptions as-is
      }
      if (error instanceof Error) {
        throw new HttpException(
          `Failed to generate presigned URL: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Failed to generate presigned URL: Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('upload/:fileId/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmUpload(
    @Param('fileId') fileId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<IFileUploadDto> {
    try {
      const userId = req.user.id;
      const entity = await this.appService.confirmUpload(fileId, userId);

      const dto = new FileUploadDto(
        entity.id,
        entity.fileName,
        entity.originalName,
        entity.size,
        entity.mimeType,
        entity.uploadedAt,
        `/api/files/${entity.id}/download`,
      );

      return dto;
    } catch (error) {
      if (error instanceof Error) {
        throw new HttpException(
          `Failed to confirm upload: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Failed to confirm upload: Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('files')
  @UseGuards(JwtAuthGuard)
  async listFiles(@Request() req: AuthenticatedRequest): Promise<IFileListDto> {
    try {
      const userId = req.user.id;
      const entities = await this.appService.listFiles(userId);

      const fileDtos = entities.map(
        (entity) =>
          new FileUploadDto(
            entity.id,
            entity.fileName,
            entity.originalName,
            entity.size,
            entity.mimeType,
            entity.uploadedAt,
            `/api/files/${entity.id}/download`,
          ),
      );

      return new FileListDto(fileDtos);
    } catch (error) {
      if (error instanceof Error) {
        throw new HttpException(
          `Failed to list files: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Failed to list files: Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('files/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Response() res: ExpressResponse,
    @Query('method') method?: 'direct' | 'presigned',
  ): Promise<void> {
    try {
      const userId = req.user.id;

      if (method === 'direct') {
        // Direct download through backend - stream from S3 to client
        const fileStream = await this.appService.getFileStream(id, userId);
        if (!fileStream) {
          throw new HttpException('File not found', HttpStatus.NOT_FOUND);
        }

        const { stream, mimetype, originalName, size } = fileStream;
        res.setHeader('Content-Type', mimetype);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${originalName}"`,
        );
        res.setHeader('Content-Length', size.toString());

        // Pipe the stream directly to response
        stream.pipe(res);
        return;
      } else {
        // Default behavior: proxy through backend (fetch from S3 and send)
        const downloadData = await this.appService.getFileDownloadUrl(
          id,
          userId,
        );
        if (!downloadData) {
          throw new HttpException('File not found', HttpStatus.NOT_FOUND);
        }

        const { url, mimetype, originalName } = downloadData;
        const response = await fetch(url);
        if (!response.ok) {
          throw new HttpException('Failed to fetch file', HttpStatus.NOT_FOUND);
        }

        const fileBuffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', mimetype);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${originalName}"`,
        );
        res.setHeader('Content-Length', fileBuffer.length.toString());
        res.send(fileBuffer);
        return;
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(
          `Failed to download file: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Failed to download file: Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('files/:id/download-url')
  @UseGuards(JwtAuthGuard)
  async getFileDownloadUrl(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ url: string }> {
    try {
      const userId = req.user.id;
      const downloadData = await this.appService.getFileDownloadUrl(id, userId);
      if (!downloadData) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      return { url: downloadData.url };
    } catch (error) {
      if (error instanceof Error) {
        throw new HttpException(
          `Failed to get download URL: ${error.message}`,
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        'Failed to get download URL: Unknown error occurred',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete('files/:id')
  @UseGuards(JwtAuthGuard)
  async deleteFile(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<IMessageDto> {
    try {
      const userId = req.user.id;
      await this.appService.deleteFile(id, userId);
      return new MessageDto('File deleted successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new HttpException(
          `Failed to delete file: ${error.message}`,
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        `Failed to delete file: Unknown error occurred`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('health/s3')
  @UseGuards(JwtAuthGuard)
  async checkS3Health(): Promise<{ status: string; message: string }> {
    try {
      await this.appService.checkS3Health();
      return {
        status: 'healthy',
        message: 'S3 connection is working correctly',
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'unhealthy',
          message: `S3 connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('files/validation-config')
  getFileValidationConfig() {
    return this.fileValidationService.getValidationConfig();
  }
}
