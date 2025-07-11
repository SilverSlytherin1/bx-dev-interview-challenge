import { TestBed } from '@suites/unit';
import { MessageEntity } from '../../entities/message.entity';
import { AppService } from './app.service';
import { IAppService } from '../../models/app-service.model';

describe('AppService', () => {
  let appService: IAppService;

  beforeAll(async () => {
    const { unit } = await TestBed.solitary(AppService).compile();

    appService = unit;
  });

  describe('getHello', () => {
    it('should return an instance of IMessageEntity', () => {
      const result = appService.getHello();

      expect(result).toBeInstanceOf(MessageEntity);
    });
  });
});
