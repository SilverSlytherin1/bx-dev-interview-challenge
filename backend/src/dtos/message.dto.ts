import { Expose } from 'class-transformer';
import { IMessageDto } from '../models/dto.model';

export class MessageDto implements IMessageDto {
  @Expose()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
