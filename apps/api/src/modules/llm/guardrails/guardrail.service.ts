import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface GuardrailEvalRequest {
  output: string;
  structuredOutput?: Record<string, unknown>;
  prompt: string;
  personId?: string;
}

export interface GuardrailEvalResult {
  confidence: number;
  flagged: boolean;
  reasons: string[];
}

export interface FlagForReviewRequest {
  personId?: string;
  llmOutput: string;
  prompt: string;
  reason: string;
  confidence: number;
}

/**
 * Guardrail Service.
 *
 * Evaluates LLM outputs for:
 * 1. Confidence scoring
 * 2. Hallucination detection patterns
 * 3. Content safety
 * 4. Human-in-the-loop flagging
 *
 * Acknowledges that LLMs are NOT 100% accurate.
 */
@Injectable()
export class GuardrailService {
  private readonly logger = new Logger(GuardrailService.name);

  /** Outputs below this confidence are flagged for human review */
  private readonly CONFIDENCE_THRESHOLD = 0.6;

  /** Phrases that often indicate hallucination or uncertainty */
  private readonly HALLUCINATION_MARKERS = [
    'I think',
    'I believe',
    'probably',
    'might be',
    'I\'m not sure',
    'as far as I know',
    'I cannot verify',
    'hypothetically',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluate an LLM output for quality and reliability.
   */
  async evaluate(request: GuardrailEvalRequest): Promise<GuardrailEvalResult> {
    const reasons: string[] = [];
    let confidence = 1.0;

    // ─── Check for hallucination markers ────────────────────────────
    const hallucinationCount = this.HALLUCINATION_MARKERS.filter((marker) =>
      request.output.toLowerCase().includes(marker.toLowerCase()),
    ).length;

    if (hallucinationCount > 0) {
      confidence -= hallucinationCount * 0.1;
      reasons.push(`Found ${hallucinationCount} uncertainty marker(s)`);
    }

    // ─── Check response length vs prompt length ─────────────────────
    const promptLength = request.prompt.length;
    const outputLength = request.output.length;

    if (outputLength < promptLength * 0.1 && promptLength > 50) {
      confidence -= 0.2;
      reasons.push('Response suspiciously short relative to prompt');
    }

    if (outputLength > promptLength * 20) {
      confidence -= 0.1;
      reasons.push('Response unusually long — possible verbosity/padding');
    }

    // ─── Check for empty or trivial responses ───────────────────────
    if (request.output.trim().length < 10) {
      confidence -= 0.4;
      reasons.push('Response is too short or empty');
    }

    // ─── Check structured output completeness ───────────────────────
    if (request.structuredOutput) {
      const values = Object.values(request.structuredOutput);
      const nullCount = values.filter((v) => v === null || v === undefined).length;
      if (nullCount > values.length * 0.5) {
        confidence -= 0.2;
        reasons.push('More than 50% of structured fields are null');
      }
    }

    // ─── Clamp confidence ───────────────────────────────────────────
    confidence = Math.max(0, Math.min(1, confidence));

    // ─── Flag for review if below threshold ─────────────────────────
    const flagged = confidence < this.CONFIDENCE_THRESHOLD;
    if (flagged) {
      await this.flagForReview({
        personId: request.personId,
        llmOutput: request.output,
        prompt: request.prompt,
        reason: 'low_confidence',
        confidence,
      });
      this.logger.warn(
        `Output flagged for review (confidence: ${confidence.toFixed(2)}): ${reasons.join(', ')}`,
      );
    }

    return { confidence, flagged, reasons };
  }

  /**
   * Add an LLM output to the human review queue.
   */
  async flagForReview(request: FlagForReviewRequest): Promise<void> {
    await this.prisma.humanReviewItem.create({
      data: {
        personId: request.personId || null,
        llmOutput: request.llmOutput.slice(0, 5000), // Truncate for DB
        prompt: request.prompt.slice(0, 2000),
        reason: request.reason,
        confidence: request.confidence,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get pending human review items.
   */
  async getPendingReviews(limit = 20) {
    return this.prisma.humanReviewItem.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Resolve a human review item.
   */
  async resolveReview(
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'CORRECTED',
    reviewerNote?: string,
    correctedOutput?: string,
  ) {
    return this.prisma.humanReviewItem.update({
      where: { id },
      data: {
        status,
        reviewerNote,
        correctedOutput,
        reviewedAt: new Date(),
      },
    });
  }
}
