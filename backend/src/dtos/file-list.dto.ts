import { Expose } from 'class-transformer';
import { IsArray } from 'class-validator';
import { IFileUploadDto, FileUploadDto } from './file-upload.dto';

export interface IFileListDto {
  files: IFileUploadDto[];
}

export class FileListDto implements IFileListDto {
  @Expose()
  @IsArray()
  files: FileUploadDto[];

  constructor(files: FileUploadDto[]) {
    this.files = files;
  }
}
