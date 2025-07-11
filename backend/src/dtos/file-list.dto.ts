import { Expose } from 'class-transformer';
import { IsArray } from 'class-validator';
import { FileUploadDto } from './file-upload.dto';
import { IFileListDto } from '../models/dto.model';

export class FileListDto implements IFileListDto {
  @Expose()
  @IsArray()
  files: FileUploadDto[];

  constructor(files: FileUploadDto[]) {
    this.files = files;
  }
}
