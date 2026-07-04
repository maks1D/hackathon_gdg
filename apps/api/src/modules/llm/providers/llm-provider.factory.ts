import { Injectable, Logger } from '@nestjs/common';
import { OpenAiProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import type { LlmProvider } from './llm-provider.interface';
import type { LlmProviderType } from '@libs/shared';

/**
 * Factory for creating/resolving LLM providers at runtime.
 * Supports switching between providers without code changes.
 */
@Injectable()
export class LlmProviderFactory {
  private readonly logger = new Logger(LlmProviderFactory.name);
  private readonly providers: Map<string, LlmProvider>;

  constructor(
    private readonly openai: OpenAiProvider,
    private readonly anthropic: AnthropicProvider,
    private readonly gemini: GeminiProvider,
  ) {
    this.providers = new Map<string, LlmProvider>([
      ['openai', this.openai],
      ['anthropic', this.anthropic],
      ['gemini', this.gemini],
    ]);
  }

  getProvider(type: LlmProviderType | string): LlmProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      this.logger.warn(`Unknown provider "${type}", falling back to OpenAI`);
      return this.openai;
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
