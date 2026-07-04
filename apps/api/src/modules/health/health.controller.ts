import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database connectivity check
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch {
          return { database: { status: 'down' } };
        }
      },
      // Memory check
      async (): Promise<HealthIndicatorResult> => {
        const memUsage = process.memoryUsage();
        return {
          memory: {
            status: 'up',
            heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            rssMB: Math.round(memUsage.rss / 1024 / 1024),
          },
        };
      },
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  ready() {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }
}
