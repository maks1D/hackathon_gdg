import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { BillingModule } from './modules/billing/billing.module';
import { LlmModule } from './modules/llm/llm.module';
import { HealthModule } from './modules/health/health.module';
import { TrizModule } from './modules/triz/triz.module';

import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';

@Module({
  imports: [
    // ─── Cache (in-memory, switchable to Redis) ─────────────────────
    CacheModule.register({
      isGlobal: true,
      ttl: parseInt(process.env['CACHE_TTL_SECONDS'] || '3600', 10) * 1000,
      max: 500,
    }),

    // ─── Database ───────────────────────────────────────────────────
    PrismaModule,

    // ─── Feature modules ────────────────────────────────────────────
    UsersModule,
    BillingModule,
    LlmModule,
    HealthModule,
    TrizModule,
  ],
  providers: [
    // ─── Global exception filter ────────────────────────────────────
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // ─── Global logging interceptor ─────────────────────────────────
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // ─── Global response transform interceptor ──────────────────────
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
