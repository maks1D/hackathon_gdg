/**
 * LLM Provider Interface.
 * All providers (OpenAI, Anthropic, Gemini) implement this contract.
 */
export interface LlmProvider {
  readonly name: string;
  readonly defaultModel: string;

  complete(request: LlmProviderRequest): Promise<LlmProviderResponse>;
}

export interface LlmProviderRequest {
  messages: LlmMessage[];
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface LlmProviderResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
