import { z } from 'zod';

/**
 * Zod Schema Registry for Structured Outputs.
 *
 * Register domain-specific schemas here. During hackathon,
 * add schemas matching your domain (e.g., medical entities,
 * invoice items, support tickets).
 *
 * Usage: LlmSchemaRegistry.get('entityExtraction')
 */
export class LlmSchemaRegistry {
  private static readonly schemas = new Map<string, z.ZodSchema>();

  static {
    // ─── Built-in schemas ───────────────────────────────────────────

    // Generic entity extraction
    this.register(
      'entityExtraction',
      z.object({
        entities: z.array(
          z.object({
            name: z.string().describe('Entity name'),
            type: z.string().describe('Entity type (person, org, location, etc.)'),
            confidence: z.number().min(0).max(1).describe('Extraction confidence'),
            context: z.string().optional().describe('Surrounding context'),
          }),
        ),
        summary: z.string().describe('Brief summary of extracted entities'),
      }),
    );

    // Sentiment analysis
    this.register(
      'sentimentAnalysis',
      z.object({
        sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
        score: z.number().min(-1).max(1),
        aspects: z.array(
          z.object({
            aspect: z.string(),
            sentiment: z.enum(['positive', 'negative', 'neutral']),
            score: z.number().min(-1).max(1),
          }),
        ),
        explanation: z.string(),
      }),
    );

    // Classification / categorization
    this.register(
      'classification',
      z.object({
        category: z.string(),
        subcategory: z.string().optional(),
        confidence: z.number().min(0).max(1),
        reasoning: z.string(),
        alternatives: z.array(
          z.object({
            category: z.string(),
            confidence: z.number().min(0).max(1),
          }),
        ),
      }),
    );

    // Data extraction from documents
    this.register(
      'documentExtraction',
      z.object({
        title: z.string().optional(),
        date: z.string().optional(),
        fields: z.record(z.string(), z.unknown()),
        lineItems: z.array(z.record(z.string(), z.unknown())).optional(),
        totalAmount: z.number().optional(),
        currency: z.string().optional(),
      }),
    );

    // Action items / task extraction
    this.register(
      'actionItems',
      z.object({
        items: z.array(
          z.object({
            task: z.string(),
            assignee: z.string().optional(),
            deadline: z.string().optional(),
            priority: z.enum(['high', 'medium', 'low']),
            status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
          }),
        ),
      }),
    );
  }

  static register(name: string, schema: z.ZodSchema): void {
    this.schemas.set(name, schema);
  }

  static get(name: string): z.ZodSchema | undefined {
    return this.schemas.get(name);
  }

  static list(): string[] {
    return Array.from(this.schemas.keys());
  }
}
