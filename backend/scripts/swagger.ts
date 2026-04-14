import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import bodyParser from 'body-parser';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.enableCors({
    origin: process.env.CORS_ORIGIN as string,
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(helmet());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Senior App API')
    .setDescription('OpenAPI spec generated from backend routes')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  writeFileSync('swagger.json', JSON.stringify(document, null, 2), 'utf-8');
  await app.close();
  console.log('Swagger spec generated at backend/swagger.json');
  process.exit(0);
}

generateSwagger().catch((error) => {
  console.error('Failed to generate Swagger spec:', error);
  process.exit(1);
});
