import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { TrizMatrixService } from './triz-matrix.service';
import type { PrincipleFrequency, SampledTriplet } from './triz-matrix.service';

// ─── DTOs ───────────────────────────────────────────────────────────

export interface CreateProjectDto {
  title: string;
  description: string;
  targetSdgs: number[];
}

export interface ContradictionResult {
  improvingIds: number[];
  improvingNames: string[];
  worseningIds: number[];
  worseningNames: string[];
  ifThenButText: string;
}

export interface ConfirmContradictionDto {
  improvingIds: number[];
  worseningIds: number[];
}

export interface EvaluationWeights {
  sdgAlignment: number;
  feasibility: number;
  cost: number;
  complexity: number;
}

export interface SelectionDto {
  candidateId: string;
}

// ─── Service ────────────────────────────────────────────────────────

/**
 * TRIZ Orchestrator Service.
 *
 * Manages the full pipeline state machine:
 *   CREATED → CONTRADICTION_REFORMULATED → PRINCIPLES_SAMPLED
 *   → CANDIDATES_GENERATED → EVALUATED → COMPLETED
 *
 * Each transition is persisted in the database and each LLM call
 * uses structured outputs via Zod schema validation.
 */
@Injectable()
export class TrizService {
  private readonly logger = new Logger(TrizService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly matrix: TrizMatrixService,
  ) {}

  // ─── Step 1: Create Project ─────────────────────────────────────

  async createProject(dto: CreateProjectDto) {
    const project = await this.prisma.trizProject.create({
      data: {
        title: dto.title,
        description: dto.description,
        targetSdgs: JSON.stringify(dto.targetSdgs),
        status: 'CREATED',
      },
    });

    this.logger.log(`Created TRIZ project: ${project.id}`);
    return project;
  }

  // ─── Step 2: Generate Contradiction via LLM ─────────────────────

  async generateContradiction(projectId: string): Promise<ContradictionResult> {
    const project = await this.getProjectOrThrow(projectId);

    const parameterList = this.matrix
      .getAllParameters()
      .map((p) => `${p.id}: ${p.name}`)
      .join('\n');

    const response = await this.llm.complete({
      prompt: `Analyze the following inventive engineering problem and identify the TRIZ Technical Contradiction.

PROBLEM:
${project.description}

TARGET SDGs: ${project.targetSdgs}

INSTRUCTIONS:
1. Identify exactly 3 standard TRIZ engineering parameters that would IMPROVE if the problem were solved (THEN conditions).
2. Identify exactly 3 standard TRIZ engineering parameters that would WORSEN as a side-effect (BUT conditions).
3. Formulate an IF-THEN-BUT statement that captures the core trade-off.

AVAILABLE TRIZ PARAMETERS (use IDs from this list):
${parameterList}

Respond in valid JSON matching this exact schema:
{
  "improvingParamIds": [number, number, number],
  "worseningParamIds": [number, number, number],
  "ifThenButText": "IF: ... THEN: ... BUT: ..."
}`,
      systemPrompt: 'You are a TRIZ (Theory of Inventive Problem Solving) expert specializing in identifying technical contradictions. Always respond with valid JSON only.',
      provider: 'openrouter' as any,
      model: 'google/gemini-2.5-flash',
      temperature: 0.4,
      maxTokens: 1024,
    });

    const parsed = this.parseJsonResponse<{
      improvingParamIds: number[];
      worseningParamIds: number[];
      ifThenButText: string;
    }>(response.content);

    // Persist the contradiction
    await this.prisma.trizContradiction.upsert({
      where: { projectId },
      create: {
        projectId,
        improvingIds: parsed.improvingParamIds.join(','),
        worseningIds: parsed.worseningParamIds.join(','),
        ifThenButText: parsed.ifThenButText,
      },
      update: {
        improvingIds: parsed.improvingParamIds.join(','),
        worseningIds: parsed.worseningParamIds.join(','),
        ifThenButText: parsed.ifThenButText,
      },
    });

    await this.prisma.trizProject.update({
      where: { id: projectId },
      data: { status: 'CONTRADICTION_REFORMULATED' },
    });

    return {
      improvingIds: parsed.improvingParamIds,
      improvingNames: parsed.improvingParamIds.map((id) =>
        this.matrix.getParameterName(id),
      ),
      worseningIds: parsed.worseningParamIds,
      worseningNames: parsed.worseningParamIds.map((id) =>
        this.matrix.getParameterName(id),
      ),
      ifThenButText: parsed.ifThenButText,
    };
  }

  // ─── Step 3: Confirm Contradiction & Sample Triplets ────────────

  async confirmAndSample(projectId: string, dto?: ConfirmContradictionDto) {
    const project = await this.getProjectOrThrow(projectId);

    // If user provides overrides, update the contradiction record
    if (dto?.improvingIds && dto?.worseningIds) {
      await this.prisma.trizContradiction.update({
        where: { projectId },
        data: {
          improvingIds: dto.improvingIds.join(','),
          worseningIds: dto.worseningIds.join(','),
        },
      });
    }

    const contradiction = await this.prisma.trizContradiction.findUnique({
      where: { projectId },
    });

    if (!contradiction) {
      throw new BadRequestException(
        'No contradiction found. Generate one first.',
      );
    }

    const improvingIds = contradiction.improvingIds
      .split(',')
      .map((s) => parseInt(s, 10));
    const worseningIds = contradiction.worseningIds
      .split(',')
      .map((s) => parseInt(s, 10));

    // Deterministic matrix lookup + frequency aggregation
    const frequencies = this.matrix.lookupAndAggregate(
      improvingIds,
      worseningIds,
    );

    // Weighted roulette-wheel sampling of 3 triplets
    const triplets = this.matrix.sampleTriplets(frequencies);

    // Clear previous triplets and save new ones
    await this.prisma.trizSampledTriplet.deleteMany({
      where: { projectId },
    });

    for (const triplet of triplets) {
      await this.prisma.trizSampledTriplet.create({
        data: {
          projectId,
          principles: triplet.principleIds.join(','),
          index: triplet.index,
        },
      });
    }

    await this.prisma.trizProject.update({
      where: { id: projectId },
      data: { status: 'PRINCIPLES_SAMPLED' },
    });

    return {
      frequencies,
      triplets,
    };
  }

  // ─── Step 4: Generate Candidates via LLM ────────────────────────

  async generateCandidates(projectId: string) {
    const project = await this.getProjectOrThrow(projectId);
    const triplets = await this.prisma.trizSampledTriplet.findMany({
      where: { projectId },
      orderBy: { index: 'asc' },
    });

    if (triplets.length === 0) {
      throw new BadRequestException(
        'No sampled triplets found. Run sampling first.',
      );
    }

    // Clear previous candidates
    await this.prisma.trizCandidate.deleteMany({
      where: { projectId },
    });

    const candidates = [];

    for (const triplet of triplets) {
      const principleIds = triplet.principles
        .split(',')
        .map((s) => parseInt(s, 10));
      const principleDescriptions = principleIds
        .map((id) => {
          const p = this.matrix.getPrincipleDetails(id);
          return `- Principle ${id}: ${p.name} — ${p.description}`;
        })
        .join('\n');

      const response = await this.llm.complete({
        prompt: `Generate ONE innovative candidate solution for the following problem.

PROBLEM:
${project.description}

TARGET SDGs: ${project.targetSdgs}

You MUST apply the following 3 TRIZ Inventive Principles to derive your solution:
${principleDescriptions}

CONSTRAINTS:
- The solution must be concrete, actionable, and technically feasible.
- Explain HOW each of the 3 principles was applied.

Respond in valid JSON:
{
  "title": "Short descriptive name of the solution",
  "description": "Detailed implementation concept (2-4 paragraphs)",
  "appliedRules": "Explanation of how each of the 3 principles was applied"
}`,
        systemPrompt:
          'You are an innovative R&D engineer expert in TRIZ-based inventive problem solving. Respond with valid JSON only.',
        provider: 'openrouter' as any,
        model: 'google/gemini-2.5-pro',
        temperature: 0.7,
        maxTokens: 2048,
      });

      const parsed = this.parseJsonResponse<{
        title: string;
        description: string;
        appliedRules: string;
      }>(response.content);

      const candidate = await this.prisma.trizCandidate.create({
        data: {
          projectId,
          tripletId: triplet.id,
          title: parsed.title,
          description: parsed.description,
          appliedRules: parsed.appliedRules,
        },
      });

      candidates.push(candidate);
    }

    await this.prisma.trizProject.update({
      where: { id: projectId },
      data: { status: 'CANDIDATES_GENERATED' },
    });

    this.logger.log(`Generated ${candidates.length} candidates for project ${projectId}`);
    return candidates;
  }

  // ─── Step 5: Evaluate Candidates via LLM ────────────────────────

  async evaluateCandidates(
    projectId: string,
    weights?: EvaluationWeights,
  ) {
    const project = await this.getProjectOrThrow(projectId);
    const candidates = await this.prisma.trizCandidate.findMany({
      where: { projectId },
    });

    if (candidates.length === 0) {
      throw new BadRequestException(
        'No candidates found. Generate them first.',
      );
    }

    const candidateDescriptions = candidates
      .map(
        (c, i) =>
          `Candidate ${i + 1} (ID: ${c.id}):\n  Title: ${c.title}\n  Description: ${c.description}`,
      )
      .join('\n\n');

    const response = await this.llm.complete({
      prompt: `Evaluate each of the following candidate solutions for the engineering problem.

PROBLEM:
${project.description}

TARGET SDGs: ${project.targetSdgs}

CANDIDATES:
${candidateDescriptions}

Score each candidate on a scale of 1-10 for each criterion:
1. SDG Alignment — How well does it address the target Sustainable Development Goals?
2. Feasibility — How technically viable and implementable is it?
3. Cost — How cost-effective is the solution? (Higher score = lower cost)
4. Complexity — How simple is the implementation? (Higher score = simpler)

Provide a brief rationale for each score.

Respond in valid JSON:
{
  "evaluations": [
    {
      "candidateId": "actual-uuid-from-above",
      "criteriaScores": [
        { "criteriaName": "SDG Alignment", "score": 8, "rationale": "..." },
        { "criteriaName": "Feasibility", "score": 7, "rationale": "..." },
        { "criteriaName": "Cost", "score": 6, "rationale": "..." },
        { "criteriaName": "Complexity", "score": 5, "rationale": "..." }
      ]
    }
  ]
}`,
      systemPrompt:
        'You are a multi-criteria decision analysis expert evaluating R&D concept solutions. Be objective and rigorous. Respond with valid JSON only.',
      provider: 'openrouter' as any,
      model: 'google/gemini-2.5-flash',
      temperature: 0.3,
      maxTokens: 4096,
    });

    const parsed = this.parseJsonResponse<{
      evaluations: Array<{
        candidateId: string;
        criteriaScores: Array<{
          criteriaName: string;
          score: number;
          rationale: string;
        }>;
      }>;
    }>(response.content);

    // Clear previous evaluations and save new ones
    await this.prisma.trizEvaluationScore.deleteMany({
      where: { projectId },
    });

    for (const evaluation of parsed.evaluations) {
      for (const cs of evaluation.criteriaScores) {
        await this.prisma.trizEvaluationScore.create({
          data: {
            projectId,
            candidateId: evaluation.candidateId,
            criteriaName: cs.criteriaName,
            score: cs.score,
            rationale: cs.rationale,
          },
        });
      }
    }

    // Calculate weighted scores
    const w = weights ?? {
      sdgAlignment: 1,
      feasibility: 1,
      cost: 1,
      complexity: 1,
    };

    const weightMap: Record<string, number> = {
      'SDG Alignment': w.sdgAlignment,
      Feasibility: w.feasibility,
      Cost: w.cost,
      Complexity: w.complexity,
    };

    const scoreboard = candidates.map((candidate) => {
      const candidateEval = parsed.evaluations.find(
        (e) => e.candidateId === candidate.id,
      );
      let weightedSum = 0;
      let totalWeight = 0;
      const scores: Record<string, number> = {};

      if (candidateEval) {
        for (const cs of candidateEval.criteriaScores) {
          const weight = weightMap[cs.criteriaName] ?? 1;
          weightedSum += cs.score * weight;
          totalWeight += weight;
          scores[cs.criteriaName] = cs.score;
        }
      }

      return {
        candidateId: candidate.id,
        title: candidate.title,
        scores,
        weightedScore:
          totalWeight > 0
            ? Math.round((weightedSum / totalWeight) * 100) / 100
            : 0,
      };
    });

    scoreboard.sort((a, b) => b.weightedScore - a.weightedScore);

    await this.prisma.trizProject.update({
      where: { id: projectId },
      data: { status: 'EVALUATED' },
    });

    this.logger.log(
      `Evaluated ${candidates.length} candidates for project ${projectId}`,
    );

    return {
      scoreboard,
      rawEvaluations: parsed.evaluations,
    };
  }

  // ─── Step 6: Select Winner ──────────────────────────────────────

  async selectWinner(projectId: string, dto?: SelectionDto) {
    const project = await this.getProjectOrThrow(projectId);

    // Get scoreboard to find the best candidate if none specified
    const candidates = await this.prisma.trizCandidate.findMany({
      where: { projectId },
      include: { scores: true },
    });

    const evaluationScores = await this.prisma.trizEvaluationScore.findMany({
      where: { projectId },
    });

    let winnerId: string;

    if (dto?.candidateId) {
      winnerId = dto.candidateId;
    } else {
      // Auto-select by highest aggregate score
      const scoreMap = new Map<string, number>();
      for (const score of evaluationScores) {
        scoreMap.set(
          score.candidateId,
          (scoreMap.get(score.candidateId) || 0) + score.score,
        );
      }
      const sorted = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]);
      winnerId = sorted[0]?.[0] ?? candidates[0]?.id;
    }

    const winner = candidates.find((c) => c.id === winnerId);
    if (!winner) {
      throw new NotFoundException(`Candidate ${winnerId} not found`);
    }

    // Build the full reasoning trail
    const contradiction = await this.prisma.trizContradiction.findUnique({
      where: { projectId },
    });
    const triplets = await this.prisma.trizSampledTriplet.findMany({
      where: { projectId },
      orderBy: { index: 'asc' },
    });

    const reasoning = this.buildReasoningTrail(
      project,
      contradiction,
      triplets,
      candidates,
      evaluationScores,
      winner,
    );

    // Persist the selection
    await this.prisma.trizSelection.upsert({
      where: { projectId },
      create: {
        projectId,
        candidateId: winnerId,
        reasoning,
      },
      update: {
        candidateId: winnerId,
        reasoning,
      },
    });

    await this.prisma.trizProject.update({
      where: { id: projectId },
      data: { status: 'COMPLETED' },
    });

    this.logger.log(
      `Selected winner "${winner.title}" for project ${projectId}`,
    );

    return {
      winner,
      reasoning,
    };
  }

  // ─── Fetch full project state ───────────────────────────────────

  async getProject(projectId: string) {
    const project = await this.prisma.trizProject.findUnique({
      where: { id: projectId },
      include: {
        contradiction: true,
        triplets: { orderBy: { index: 'asc' } },
        candidates: { include: { scores: true } },
        selection: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  async listProjects() {
    return this.prisma.trizProject.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private async getProjectOrThrow(projectId: string) {
    const project = await this.prisma.trizProject.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return project;
  }

  private parseJsonResponse<T>(content: string): T {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim()) as T;
      }
      return JSON.parse(content) as T;
    } catch {
      this.logger.error(`Failed to parse LLM response as JSON: ${content.substring(0, 200)}`);
      throw new BadRequestException(
        'LLM returned invalid JSON. Please retry.',
      );
    }
  }

  private buildReasoningTrail(
    project: { title: string; description: string; targetSdgs: string },
    contradiction: { improvingIds: string; worseningIds: string; ifThenButText: string } | null,
    triplets: Array<{ principles: string; index: number }>,
    candidates: Array<{ id: string; title: string; description: string; appliedRules: string }>,
    scores: Array<{ candidateId: string; criteriaName: string; score: number; rationale: string }>,
    winner: { id: string; title: string },
  ): string {
    const lines: string[] = [];

    lines.push('# TRIZ Innovation Pipeline — Full Reasoning Trail');
    lines.push('');
    lines.push('## 1. Problem Definition');
    lines.push(`**Title**: ${project.title}`);
    lines.push(`**Description**: ${project.description}`);
    lines.push(`**Target SDGs**: ${project.targetSdgs}`);
    lines.push('');

    if (contradiction) {
      const impNames = contradiction.improvingIds
        .split(',')
        .map((id) => `${id}: ${this.matrix.getParameterName(parseInt(id, 10))}`)
        .join(', ');
      const worNames = contradiction.worseningIds
        .split(',')
        .map((id) => `${id}: ${this.matrix.getParameterName(parseInt(id, 10))}`)
        .join(', ');

      lines.push('## 2. Technical Contradiction');
      lines.push(`**Improving Parameters**: ${impNames}`);
      lines.push(`**Worsening Parameters**: ${worNames}`);
      lines.push(`**IF-THEN-BUT**: ${contradiction.ifThenButText}`);
      lines.push('');
    }

    lines.push('## 3. Sampled Inventive Principle Triplets');
    for (const t of triplets) {
      const names = t.principles
        .split(',')
        .map((id) => {
          const p = this.matrix.getPrincipleDetails(parseInt(id, 10));
          return `${id}: ${p.name}`;
        })
        .join(', ');
      lines.push(`- Triplet ${t.index + 1}: [${names}]`);
    }
    lines.push('');

    lines.push('## 4. Candidate Solutions');
    for (const c of candidates) {
      lines.push(`### ${c.title}`);
      lines.push(c.description);
      lines.push(`**Applied Principles**: ${c.appliedRules}`);
      lines.push('');
    }

    lines.push('## 5. Evaluation Scores');
    for (const c of candidates) {
      const cScores = scores.filter((s) => s.candidateId === c.id);
      const total = cScores.reduce((sum, s) => sum + s.score, 0);
      lines.push(
        `- **${c.title}**: Total = ${total}/40 | ${cScores.map((s) => `${s.criteriaName}: ${s.score}/10`).join(' | ')}`,
      );
    }
    lines.push('');

    lines.push('## 6. Final Selection');
    lines.push(`**Winner**: ${winner.title} (ID: ${winner.id})`);

    return lines.join('\n');
  }
}
