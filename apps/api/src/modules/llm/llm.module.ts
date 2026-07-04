import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { PromptBuilderService } from './prompt-templates/prompt-builder.service';
import { GuardrailService } from './guardrails/guardrail.service';
import { LlmTelemetryService } from './telemetry/llm-telemetry.service';
import { LlmCacheService } from './cache/llm-cache.service';

@Module({
  controllers: [LlmController],
  providers: [
    LlmService,
    OpenRouterProvider,
    PromptBuilderService,
    GuardrailService,
    LlmTelemetryService,
    LlmCacheService,
  ],
  exports: [LlmService, LlmTelemetryService],
})
export class LlmModule {}
