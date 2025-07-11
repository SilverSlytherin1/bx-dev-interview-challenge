import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MulterModule } from '@nestjs/platform-express';
import getCommonConfig from './configs/common';
import { typeOrmConfig } from './configs/database.config';
import { AppController } from './controllers/app.controller';
import { AuthController } from './controllers/auth.controller';
import { AppService } from './services/app/app.service';
import { AuthService } from './services/auth/auth.service';
import { FileService } from './services/file/file.service';
import { S3Service } from './services/s3/s3.service';
import { FileValidationService } from './services/validation/file-validation.service';
import { JwtStrategy } from './services/auth/jwt.strategy';
import { User } from './entities/user.entity';
import { FileEntity } from './entities/file.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [getCommonConfig] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: typeOrmConfig,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, FileEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    MulterModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit - matches validation service
      },
    }),
  ],
  controllers: [AppController, AuthController],
  providers: [
    AppService,
    AuthService,
    FileService,
    S3Service,
    FileValidationService,
    JwtStrategy,
  ],
})
export class AppModule {}
