import { Injectable, Logger } from '@nestjs/common';
import type {
  LlmProvider,
  LlmProviderRequest,
  LlmProviderResponse,
} from './llm-provider.interface';

/**
 * Google Gemini Provider.
 *
 * To use: install `@google/generative-ai` package and uncomment the real implementation.
 */
@Injectable()
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  readonly defaultModel = process.env['GEMINI_MODEL'] || 'gemini-2.0-flash';
  private readonly logger = new Logger(GeminiProvider.name);

  async complete(request: LlmProviderRequest): Promise<LlmProviderResponse> {
    this.logger.log(`Gemini call — model: ${request.model}, messages: ${request.messages.length}`);

    // ══════════════════════════════════════════════════════════════════
    // HACKATHON: Replace with real Gemini SDK call:
    //
    // import { GoogleGenerativeAI } from '@google/generative-ai';
    // const genAI = new GoogleGenerativeAI(process.env['GEMINI_API_KEY']!);
    // const model = genAI.getGenerativeModel({ model: request.model });
    // const prompt = request.messages.map(m => m.content).join('\n');
    // const result = await model.generateContent(prompt);
    // const response = result.response;
    // ══════════════════════════════════════════════════════════════════

    const stubContent = JSON.stringify({
      message: 'Stub response from Gemini provider.',
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
