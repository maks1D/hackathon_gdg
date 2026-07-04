import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto, RecordUsageDto } from './dto/billing.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Subscriptions ────────────────────────────────────────────────

  async createSubscription(dto: CreateSubscriptionDto) {
    this.logger.log(
      `Creating ${dto.type} subscription for person ${dto.personId}`,
    );
    return this.prisma.subscription.create({
      data: {
        personId: dto.personId,
        type: dto.type,
        status: dto.status || 'ACTIVE',
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      },
    });
  }

  async getSubscriptions(personId: string) {
    return this.prisma.subscription.findMany({
      where: { personId },
      orderBy: { startDate: 'desc' },
    });
  }

  async cancelSubscription(id: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED', endDate: new Date() },
    });
  }

  // ─── Usage Tracking (Pay-per-Use) ─────────────────────────────────

  async recordUsage(dto: RecordUsageDto) {
    return this.prisma.usageRecord.create({
      data: {
        personId: dto.personId,
        action: dto.action,
        units: dto.units || 1,
        cost: dto.cost || 0,
      },
    });
  }

  async getUsageSummary(personId: string) {
    const records = await this.prisma.usageRecord.findMany({
      where: { personId },
      orderBy: { timestamp: 'desc' },
    });

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalUnits = records.reduce((sum, r) => sum + r.units, 0);

    return {
      records,
      summary: {
        totalCost,
        totalUnits,
        recordCount: records.length,
      },
    };
  }
}
