import { Injectable, Logger } from '@nestjs/common';
import type {
  LlmProvider,
  LlmProviderRequest,
  LlmProviderResponse,
} from './llm-provider.interface';

/**
 * Anthropic Provider.
 *
 * To use: install `@anthropic-ai/sdk` package and uncomment the real implementation.
 */
@Injectable()
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  readonly defaultModel = process.env['ANTHROPIC_MODEL'] || 'claude-sonnet-4-20250514';
  private readonly logger = new Logger(AnthropicProvider.name);

  async complete(request: LlmProviderRequest): Promise<LlmProviderResponse> {
    this.logger.log(`Anthropic call — model: ${request.model}, messages: ${request.messages.length}`);

    // ══════════════════════════════════════════════════════════════════
    // HACKATHON: Replace with real Anthropic SDK call:
    //
    // import Anthropic from '@anthropic-ai/sdk';
    // const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
    // const systemMsg = request.messages.find(m => m.role === 'system')?.content || '';
    // const userMessages = request.messages.filter(m => m.role !== 'system');
    // const response = await client.messages.create({
    //   model: request.model,
    //   max_tokens: request.maxTokens,
    //   system: systemMsg,
    //   messages: userMessages,
    // });
    // ══════════════════════════════════════════════════════════════════

    const stubContent = JSON.stringify({
      message: 'Stub response from Anthropic provider.',
      model: request.model,
    });

    return {
      content: stubContent,
      usage: {
        inputTokens: Math.ceil(request.messages.map((m) => m.content).join(' ').length / 4),
        outputTokens: Math.ceil(stubContent.length / 4),
        totalTokens: 0,
      },
    };
  }
}
