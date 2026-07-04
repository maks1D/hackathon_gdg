import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { LlmProviderType, LlmBusinessMetrics } from '@libs/shared';

export interface TelemetryLogRequest {
  personId?: string;
  provider: LlmProviderType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  promptHash: string;
  cached: boolean;
  success: boolean;
  errorMessage?: string;
}

/**
 * LLM Telemetry Service.
 *
 * Tracks BUSINESS metrics, not just technical metrics:
 * - Cost per call / per user
 * - Time saved (estimated)
 * - Cache hit rate (cost optimization)
 * - ROI indicators
 */
@Injectable()
export class LlmTelemetryService {
  private readonly logger = new Logger(LlmTelemetryService.name);

  /** Cost per 1K tokens (configurable via env) */
  private readonly costPer1kInput =
    parseFloat(process.env['COST_PER_1K_INPUT_TOKENS'] || '0.005');
  private readonly costPer1kOutput =
    parseFloat(process.env['COST_PER_1K_OUTPUT_TOKENS'] || '0.015');

  /** Estimated minutes saved per successful LLM call (conservative) */
  private readonly MINUTES_SAVED_PER_CALL = 5;

  /** Estimated cost of human labor per minute in USD */
  private readonly HUMAN_COST_PER_MINUTE = 0.5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate cost for a specific call based on token usage.
   */
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    _provider: LlmProviderType,
  ): number {
    const inputCost = (inputTokens / 1000) * this.costPer1kInput;
    const outputCost = (outputTokens / 1000) * this.costPer1kOutput;
    return Math.round((inputCost + outputCost) * 1000000) / 1000000; // 6 decimal precision
  }

  /**
   * Persist a call log entry to the database.
   */
  async logCall(request: TelemetryLogRequest): Promise<void> {
    if (process.env['ENABLE_LLM_TELEMETRY'] === 'false') return;

    try {
      await this.prisma.llmCallLog.create({
        data: {
          personId: request.personId || null,
          provider: request.provider,
          model: request.model,
          inputTokens: request.inputTokens,
          outputTokens: request.outputTokens,
          totalTokens: request.inputTokens + request.outputTokens,
          costUsd: request.costUsd,
          latencyMs: request.latencyMs,
          promptHash: request.promptHash,
          cached: request.cached,
          success: request.success,
          errorMessage: request.errorMessage || null,
        },
      });
    } catch (error) {
      // Telemetry should never block the main flow
      this.logger.error(`Failed to log telemetry: ${(error as Error).message}`);
    }
  }

  /**
   * Get business-focused metrics.
   * Returns ROI indicators: time saved, cost saved, NOT just token accuracy.
   */
  async getBusinessMetrics(personId?: string): Promise<LlmBusinessMetrics> {
    const where = personId ? { personId } : {};

    const logs = await this.prisma.llmCallLog.findMany({ where });

    const totalCalls = logs.length;
    const successfulCalls = logs.filter((l) => l.success).length;
    const cachedCalls = logs.filter((l) => l.cached).length;
    const totalTokens = logs.reduce((sum, l) => sum + l.totalTokens, 0);
    const totalCostUsd = logs.reduce((sum, l) => sum + l.costUsd, 0);
    const totalLatency = logs.reduce((sum, l) => sum + l.latencyMs, 0);

    // Business value calculations
    const estimatedTimeSavedMinutes =
      successfulCalls * this.MINUTES_SAVED_PER_CALL;
    const estimatedCostSavedUsd =
      estimatedTimeSavedMinutes * this.HUMAN_COST_PER_MINUTE - totalCostUsd;

    return {
      totalCalls,
      totalTokens,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      averageLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
      cacheHitRate: totalCalls > 0 ? Math.round((cachedCalls / totalCalls) * 100) / 100 : 0,
      estimatedTimeSavedMinutes,
      estimatedCostSavedUsd: Math.round(estimatedCostSavedUsd * 100) / 100,
    };
  }
}
