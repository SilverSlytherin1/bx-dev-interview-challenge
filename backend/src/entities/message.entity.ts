import { Expose } from 'class-transformer';
import { IMessageEntity } from '../models/message.model';

export class MessageEntity implements IMessageEntity {
  @Expose()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
