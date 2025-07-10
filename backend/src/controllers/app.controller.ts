import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Inject,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IMessageDto, MessageDto } from '../dtos/message.dto';
import { IFileUploadDto, FileUploadDto } from '../dtos/file-upload.dto';
import { IFileListDto, FileListDto } from '../dtos/file-list.dto';
import { AppService } from '../services/app/app.service';
import { JwtAuthGuard } from '../services/auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { Mapper } from '../utils/mapper/mapper';

@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

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
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

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
    @Res() res: Response,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    try {
      const userId = req.user.id;
      const downloadUrl = await this.appService.getFileDownloadUrl(id, userId);
      res.redirect(downloadUrl);
    } catch (error) {
      if (error instanceof Error) {
        throw new HttpException(
          `Failed to download file: ${error.message}`,
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        'Failed to download file: Unknown error occurred',
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
}
