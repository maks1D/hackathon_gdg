export interface LlmRequestDto {
  prompt: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  outputSchemaName?: string;
  context?: Array<{ role: string; content: string }>;
}
