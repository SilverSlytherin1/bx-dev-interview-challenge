import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app/app.service';
import { S3Service } from './services/s3/s3.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, S3Service],
})
export class AppModule {}
