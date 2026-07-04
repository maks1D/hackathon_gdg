import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { LlmProviderFactory } from './providers/llm-provider.factory';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { PromptBuilderService } from './prompt-templates/prompt-builder.service';
import { GuardrailService } from './guardrails/guardrail.service';
import { LlmTelemetryService } from './telemetry/llm-telemetry.service';
import { LlmCacheService } from './cache/llm-cache.service';

@Module({
  controllers: [LlmController],
  providers: [
    LlmService,
    LlmProviderFactory,
    OpenAiProvider,
    AnthropicProvider,
    GeminiProvider,
    PromptBuilderService,
    GuardrailService,
    LlmTelemetryService,
    LlmCacheService,
  ],
  exports: [LlmService, LlmTelemetryService],
})
export class LlmModule {}
