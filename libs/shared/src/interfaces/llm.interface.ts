export interface LlmCompletionRequest {
  prompt: string;
  systemPrompt?: string;
  provider?: LlmProviderType;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Zod schema name for structured output validation */
  outputSchemaName?: string;
  /** Additional context for RAG/MCP */
  context?: LlmContext[];
}

export interface LlmContext {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface LlmCompletionResponse {
  content: string;
  structuredOutput?: Record<string, unknown>;
  usage: LlmUsageMetrics;
  provider: LlmProviderType;
  model: string;
  /** Confidence score for guardrail evaluation (0-1) */
  confidence?: number;
  /** Whether output was flagged for human review */
  flaggedForReview: boolean;
  cached: boolean;
}

export interface LlmUsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  timestamp: Date;
}

export enum LlmProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
}

export interface LlmBusinessMetrics {
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  averageLatencyMs: number;
  cacheHitRate: number;
  estimatedTimeSavedMinutes: number;
  estimatedCostSavedUsd: number;
}
