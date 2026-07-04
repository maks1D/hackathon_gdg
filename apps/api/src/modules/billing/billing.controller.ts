import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateSubscriptionDto, RecordUsageDto } from './dto/billing.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a subscription' })
  createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.billingService.createSubscription(dto);
  }

  @Get('subscriptions/:personId')
  @ApiOperation({ summary: 'Get subscriptions for a person' })
  getSubscriptions(@Param('personId') personId: string) {
    return this.billingService.getSubscriptions(personId);
  }

  @Put('subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Cancel a subscription' })
  cancelSubscription(@Param('id') id: string) {
    return this.billingService.cancelSubscription(id);
  }

  @Post('usage')
  @ApiOperation({ summary: 'Record a usage event' })
  recordUsage(@Body() dto: RecordUsageDto) {
    return this.billingService.recordUsage(dto);
  }

  @Get('usage/:personId')
  @ApiOperation({ summary: 'Get usage summary for a person' })
  getUsageSummary(@Param('personId') personId: string) {
    return this.billingService.getUsageSummary(personId);
  }
}
