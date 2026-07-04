import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { PromptBuilderService } from './prompt-templates/prompt-builder.service';
import { GuardrailService } from './guardrails/guardrail.service';
import { LlmTelemetryService } from './telemetry/llm-telemetry.service';
import { LlmCacheService } from './cache/llm-cache.service';
import { LlmSchemaRegistry } from './schemas/schema-registry';
import { LlmCompletionRequestDto } from './dto/llm.dto';
import type { LlmCompletionResponse, LlmProviderType } from '@libs/shared';

/**
 * Main LLM Engineering Service.
 *
 * This is NOT a simple API wrapper. It orchestrates:
 * 1. Prompt construction (template + context injection)
 * 2. Cache lookup (deduplication of identical requests)
 * 3. Provider-agnostic LLM call (OpenRouter)
 * 4. Structured output validation (Zod schemas)
 * 5. Guardrail evaluation (confidence, hallucination checks)
 * 6. Telemetry logging (tokens, cost, latency)
 * 7. Human-in-the-loop flagging for low-confidence outputs
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly provider: OpenRouterProvider,
    private readonly promptBuilder: PromptBuilderService,
    private readonly guardrails: GuardrailService,
    private readonly telemetry: LlmTelemetryService,
    private readonly cache: LlmCacheService,
  ) {}

  async complete(
    dto: LlmCompletionRequestDto,
    personId?: string,
  ): Promise<LlmCompletionResponse> {
    const startTime = Date.now();

    // ─── 1. Build the final prompt ──────────────────────────────────
    const builtPrompt = this.promptBuilder.build({
      userPrompt: dto.prompt,
      systemPrompt: dto.systemPrompt,
      context: dto.context,
      templateName: dto.templateName,
      variables: dto.variables,
    });

    // ─── 2. Cache lookup ────────────────────────────────────────────
    const providerType = 'openrouter' as LlmProviderType;
    const model = dto.model || this.provider.defaultModel;

    const cacheKey = this.cache.generateKey(builtPrompt, providerType, model);
    const cachedResult = await this.cache.get(cacheKey);

    if (cachedResult) {
      this.logger.debug('Cache HIT — returning cached LLM response');
      await this.telemetry.logCall({
        personId,
        provider: providerType,
        model: model,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        latencyMs: Date.now() - startTime,
        promptHash: cacheKey,
        cached: true,
        success: true,
      });
      return { ...cachedResult, cached: true };
    }

    // ─── 3. Get provider & call LLM ─────────────────────────────────
    let rawResponse: string;
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    try {
      const result = await this.provider.complete({
        messages: builtPrompt,
        model,
        temperature: dto.temperature ?? 0.7,
        maxTokens: dto.maxTokens ?? 2048,
      });
      rawResponse = result.content;
      usage = result.usage;
    } catch (error) {
      const latency = Date.now() - startTime;
      await this.telemetry.logCall({
        personId,
        provider: providerType,
        model,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        latencyMs: latency,
        promptHash: cacheKey,
        cached: false,
        success: false,
        errorMessage: (error as Error).message,
      });
      throw error;
    }

    // ─── 4. Structured output validation (Zod) ─────────────────────
    let structuredOutput: Record<string, unknown> | undefined;
    if (dto.outputSchemaName) {
      const schema = LlmSchemaRegistry.get(dto.outputSchemaName);
      if (schema) {
        const parsed = schema.safeParse(this.tryParseJson(rawResponse));
        if (parsed.success) {
          structuredOutput = parsed.data as Record<string, unknown>;
        } else {
          this.logger.warn(
            `Structured output validation failed for schema "${dto.outputSchemaName}": ${parsed.error.message}`,
          );
          // Flag for human review on schema mismatch
          await this.guardrails.flagForReview({
            personId,
            llmOutput: rawResponse,
            prompt: dto.prompt,
            reason: 'schema_mismatch',
            confidence: 0.3,
          });
        }
      }
    }

    // ─── 5. Guardrail evaluation ────────────────────────────────────
    const guardrailResult = await this.guardrails.evaluate({
      output: rawResponse,
      structuredOutput,
      prompt: dto.prompt,
      personId,
    });

    // ─── 6. Telemetry ───────────────────────────────────────────────
    const latency = Date.now() - startTime;
    const costUsd = this.telemetry.calculateCost(
      usage.inputTokens,
      usage.outputTokens,
      providerType,
    );

    await this.telemetry.logCall({
      personId,
      provider: providerType,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      costUsd,
      latencyMs: latency,
      promptHash: cacheKey,
      cached: false,
      success: true,
    });

    // ─── 7. Build response ──────────────────────────────────────────
    const response: LlmCompletionResponse = {
      content: rawResponse,
      structuredOutput,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        costUsd,
        latencyMs: latency,
        timestamp: new Date(),
      },
      provider: providerType,
      model,
      confidence: guardrailResult.confidence,
      flaggedForReview: guardrailResult.flagged,
      cached: false,
    };

    // ─── 8. Cache the result ────────────────────────────────────────
    await this.cache.set(cacheKey, response);

    return response;
  }

  /**
   * Get business metrics for LLM usage.
   * Measures ROI: time saved, cost saved — NOT just token accuracy.
   */
  async getBusinessMetrics(personId?: string) {
    return this.telemetry.getBusinessMetrics(personId);
  }

  private tryParseJson(str: string): unknown {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
      return JSON.parse(str);
    } catch {
      return str;
    }
  }
}
