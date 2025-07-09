import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new ConsoleLogger({
    prefix: 'Bonusx',
  });
  const app = await NestFactory.create(AppModule, {
    abortOnError: true,
    logger,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: '*',
  });

  const port = process.env.PORT ?? 3000;

  await app.listen(port, () => {
    logger.log(
      `🚀 Bonusx File Uploader is running on: http://localhost:${port}`,
    );
  });
}

void bootstrap();
