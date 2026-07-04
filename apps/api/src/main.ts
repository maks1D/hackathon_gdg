import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');

  // ─── Global prefix ────────────────────────────────────────────────
  const apiPrefix = process.env['API_PREFIX'] || 'api';
  app.setGlobalPrefix(apiPrefix);

  // ─── CORS ─────────────────────────────────────────────────────────
  app.enableCors({
    origin: true, // Pozwala na każdy origin (odbija origin z żądania)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ─── Global Validation Pipe ───────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger / OpenAPI ────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Build with AI — API')
    .setDescription('GDG Hackathon Backend API with LLM Engineering')
    .setVersion('1.0')
    .addTag('users', 'User management (Person entity)')
    .addTag('billing', 'Subscription & usage tracking')
    .addTag('llm', 'LLM Engineering module')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // ─── Start ────────────────────────────────────────────────────────
  const port = process.env['PORT'] || process.env['API_PORT'] || 3000;
  await app.listen(port);
  logger.log(`🚀 API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
