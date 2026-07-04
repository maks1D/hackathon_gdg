import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import type {
  LlmProvider,
  LlmProviderRequest,
  LlmProviderResponse,
} from './llm-provider.interface';

/**
 * OpenRouter Provider.
 *
 * Uses the native Node.js `fetch` API to call OpenRouter's OpenAI-compatible endpoint.
 * This allows us to access dozens of models (OpenAI, Anthropic, Google, etc.) using
 * a single API key and interface, without needing the heavy OpenAI SDK dependency.
 */
@Injectable()
export class OpenRouterProvider implements LlmProvider {
  readonly name = 'openrouter';
  // Fallback to a fast, cheap model if none specified
  readonly defaultModel = process.env['OPENROUTER_DEFAULT_MODEL'] || 'google/gemini-2.5-flash';
  private readonly logger = new Logger(OpenRouterProvider.name);

  async complete(request: LlmProviderRequest): Promise<LlmProviderResponse> {
    const apiKey = process.env['OPENROUTER_API_KEY'];
    if (!apiKey) {
      this.logger.error('OPENROUTER_API_KEY environment variable is missing.');
      throw new InternalServerErrorException('LLM API key is not configured.');
    }

    this.logger.log(`OpenRouter call — model: ${request.model}, messages: ${request.messages.length}`);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env['APP_URL'] || 'http://localhost:3000',
          'X-Title': 'Build with AI Hackathon',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OpenRouter API error: ${response.status} - ${errorText}`);
        throw new InternalServerErrorException(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to complete request via OpenRouter: ${error}`);
      throw new InternalServerErrorException('Failed to communicate with LLM provider.');
    }
  }
}
