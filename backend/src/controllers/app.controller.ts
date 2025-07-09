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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IMessageDto, MessageDto } from '../dtos/message.dto';
import { IFileUploadDto, FileUploadDto } from '../dtos/file-upload.dto';
import { IFileListDto, FileListDto } from '../dtos/file-list.dto';
import { AppService } from '../services/app/app.service';
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
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<IFileUploadDto> {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    try {
      const entity = await this.appService.uploadFile(file);

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
  async listFiles(): Promise<IFileListDto> {
    try {
      const entities = await this.appService.listFiles();

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
  async downloadFile(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const downloadUrl = await this.appService.getFileDownloadUrl(id);
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
  async deleteFile(@Param('id') id: string): Promise<IMessageDto> {
    try {
      await this.appService.deleteFile(id);
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
