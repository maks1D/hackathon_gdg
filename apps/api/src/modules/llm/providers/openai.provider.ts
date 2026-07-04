import { Injectable, Logger } from '@nestjs/common';
import type {
  LlmProvider,
  LlmProviderRequest,
  LlmProviderResponse,
} from './llm-provider.interface';

/**
 * OpenAI Provider.
 *
 * To use: install `openai` package and uncomment the real implementation.
 * The stub below allows the boilerplate to compile without API keys.
 */
@Injectable()
export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  readonly defaultModel = process.env['OPENAI_MODEL'] || 'gpt-4o';
  private readonly logger = new Logger(OpenAiProvider.name);

  async complete(request: LlmProviderRequest): Promise<LlmProviderResponse> {
    this.logger.log(`OpenAI call — model: ${request.model}, messages: ${request.messages.length}`);

    // ══════════════════════════════════════════════════════════════════
    // HACKATHON: Replace this stub with real OpenAI SDK call:
    //
    // import OpenAI from 'openai';
    // const client = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] });
    // const response = await client.chat.completions.create({
    //   model: request.model,
    //   messages: request.messages,
    //   temperature: request.temperature,
    //   max_tokens: request.maxTokens,
    // });
    // return {
    //   content: response.choices[0].message.content || '',
    //   usage: {
    //     inputTokens: response.usage?.prompt_tokens || 0,
    //     outputTokens: response.usage?.completion_tokens || 0,
    //     totalTokens: response.usage?.total_tokens || 0,
    //   },
    // };
    // ══════════════════════════════════════════════════════════════════

    // Stub response for development without API keys
    const stubContent = JSON.stringify({
      message: 'This is a stub response from OpenAI provider.',
      model: request.model,
      note: 'Replace with real OpenAI SDK call during hackathon.',
    });

    return {
      content: stubContent,
      usage: {
        inputTokens: this.estimateTokens(request.messages.map((m) => m.content).join(' ')),
        outputTokens: this.estimateTokens(stubContent),
        totalTokens: 0,
      },
    };
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
