import { Injectable, Logger } from '@nestjs/common';
import type { LlmMessage } from '../providers/llm-provider.interface';

export interface PromptBuildRequest {
  userPrompt: string;
  systemPrompt?: string;
  context?: Array<{ role: string; content: string }>;
  templateName?: string;
  variables?: Record<string, string>;
}

/**
 * Prompt engineering service for dynamic prompt construction.
 *
 * Features:
 * - Named templates with variable interpolation
 * - System/user message separation
 * - Context injection (RAG / MCP preparation)
 * - Composable prompt chains
 */
@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);
  private readonly templates = new Map<string, PromptTemplate>();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Build a complete message array from user input, templates, and context.
   */
  build(request: PromptBuildRequest): LlmMessage[] {
    const messages: LlmMessage[] = [];

    // ─── System prompt ──────────────────────────────────────────────
    let systemContent = request.systemPrompt || '';

    // Apply template if specified
    if (request.templateName) {
      const template = this.templates.get(request.templateName);
      if (template) {
        systemContent = this.interpolate(
          template.systemPrompt,
          request.variables || {},
        );
        this.logger.debug(`Applied template: ${request.templateName}`);
      } else {
        this.logger.warn(`Template "${request.templateName}" not found`);
      }
    }

    if (systemContent) {
      messages.push({ role: 'system', content: systemContent });
    }

    // ─── Context injection (RAG / MCP) ──────────────────────────────
    if (request.context && request.context.length > 0) {
      for (const ctx of request.context) {
        messages.push({
          role: ctx.role as 'system' | 'user' | 'assistant',
          content: ctx.content,
        });
      }
    }

    // ─── User prompt ────────────────────────────────────────────────
    let userContent = request.userPrompt;
    if (request.variables) {
      userContent = this.interpolate(userContent, request.variables);
    }
    messages.push({ role: 'user', content: userContent });

    return messages;
  }

  /**
   * Register a named prompt template.
   */
  registerTemplate(name: string, template: PromptTemplate): void {
    this.templates.set(name, template);
    this.logger.log(`Registered prompt template: ${name}`);
  }

  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Replace {{variable}} placeholders in a string.
   */
  private interpolate(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
  }

  /**
   * Pre-register useful templates for hackathon rapid prototyping.
   */
  private registerDefaultTemplates(): void {
    this.registerTemplate('data-analysis', {
      name: 'data-analysis',
      description: 'Analyze data and extract insights',
      systemPrompt: `You are an expert data analyst specializing in {{domain}}.
Analyze the provided data thoroughly and return structured insights.
Always cite specific data points to support your conclusions.
Respond in {{language}} language.
Format your response as valid JSON matching the requested schema.`,
    });

    this.registerTemplate('document-processing', {
      name: 'document-processing',
      description: 'Extract structured data from documents',
      systemPrompt: `You are a document processing specialist.
Extract all relevant information from the provided document.
Maintain accuracy — if a field is unclear, mark it as null rather than guessing.
Domain context: {{domain}}.
Output language: {{language}}.
Return structured JSON.`,
    });

    this.registerTemplate('customer-support', {
      name: 'customer-support',
      description: 'Handle customer support queries',
      systemPrompt: `You are a helpful customer support agent for {{company}}.
Product domain: {{domain}}.
Tone: professional, empathetic, solution-oriented.
If you don't know the answer, say so clearly — never fabricate information.
Respond in {{language}}.`,
    });

    this.registerTemplate('content-generation', {
      name: 'content-generation',
      description: 'Generate content (articles, summaries, reports)',
      systemPrompt: `You are a professional content writer.
Domain: {{domain}}.
Style: {{style}}.
Target audience: {{audience}}.
Generate high-quality, factual content. Avoid hallucination.
Language: {{language}}.`,
    });
  }
}

export interface PromptTemplate {
  name: string;
  description: string;
  systemPrompt: string;
}
