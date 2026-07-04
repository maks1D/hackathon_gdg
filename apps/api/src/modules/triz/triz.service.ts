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

export interface KpiDto {
  name: string;
  weight: number;
}

export interface UpdateConstraintsDto {
  constraints: string[];
  kpis: KpiDto[];
}

export interface ModifyConstraintsDto {
  prompt: string;
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

  // ─── Step 1.5: Constraints & KPIs ───────────────────────────────

  async extractConstraintsAndKpis(projectId: string) {
    const project = await this.getProjectOrThrow(projectId);

    this.logger.log(`Extracting constraints and KPIs for project ${projectId}...`);

    const response = await this.llm.complete({
      prompt: `Analyze the following engineering problem and extract two things:
1. Constraints (Blacklist): A list of hard constraints, forbidden technologies, or concepts that must NOT be used. E.g. if the user says "no chemical batteries", the list should include "chemical batteries", "lithium-ion", etc. If there are no obvious constraints, infer some logical ones or return an empty array.
2. KPIs (Key Performance Indicators): A list of 2 to 5 primary business/engineering goals with relative weights (summing exactly to 1.0). E.g. Speed: 0.4, Reliability: 0.4, Scalability: 0.2.

PROBLEM:
${project.description}

Respond in valid JSON:
{
  "constraints": ["forbidden_word_1", "forbidden_word_2"],
  "kpis": [
    { "name": "KPI 1", "weight": 0.5 },
    { "name": "KPI 2", "weight": 0.5 }
  ]
}`,
      systemPrompt: 'You are an expert systems engineer and business analyst. Extract hard constraints and weighted KPIs from problem descriptions. Respond with valid JSON only. Weights must sum to 1.0.',
      provider: 'openrouter' as any,
      model: 'openai/gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 1024,
    });

    const parsed = this.parseJsonResponse<{
      constraints: string[];
      kpis: KpiDto[];
    }>(response.content);

    // Normalize weights to ensure they sum to 1.0
    const totalWeight = parsed.kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
    if (totalWeight > 0) {
      parsed.kpis.forEach(kpi => kpi.weight = Math.round((kpi.weight / totalWeight) * 100) / 100);
    }

    const updated = await this.prisma.trizProject.update({
      where: { id: projectId },
      data: {
        constraints: JSON.stringify(parsed.constraints),
        kpis: JSON.stringify(parsed.kpis),
        status: 'CONSTRAINTS_EXTRACTED',
      },
    });

    return {
      constraints: parsed.constraints,
      kpis: parsed.kpis,
      status: updated.status,
    };
  }

  async updateConstraintsAndKpis(projectId: string, dto: UpdateConstraintsDto) {
    await this.getProjectOrThrow(projectId);

    const updated = await this.prisma.trizProject.update({
      where: { id: projectId },
      data: {
        constraints: JSON.stringify(dto.constraints),
        kpis: JSON.stringify(dto.kpis),
        status: 'CONSTRAINTS_EXTRACTED',
      },
    });

    return {
      constraints: dto.constraints,
      kpis: dto.kpis,
      status: updated.status,
    };
  }

  async modifyConstraintsAndKpisWithPrompt(projectId: string, dto: ModifyConstraintsDto) {
    const project = await this.getProjectOrThrow(projectId);

    const currentConstraints = project.constraints ? JSON.parse(project.constraints) : [];
    const currentKpis = project.kpis ? JSON.parse(project.kpis) : [];

    this.logger.log(`Modifying constraints/KPIs via AI for project ${projectId}...`);

    const response = await this.llm.complete({
      prompt: `The user wants to modify the current Constraints and KPIs for their project based on the following instruction:
USER INSTRUCTION: "${dto.prompt}"

CURRENT CONSTRAINTS: ${JSON.stringify(currentConstraints)}
CURRENT KPIS: ${JSON.stringify(currentKpis)}

Update the constraints and KPIs according to the user's instructions.
Respond in valid JSON:
{
  "constraints": ["updated_constraint_1", ...],
  "kpis": [
    { "name": "KPI 1", "weight": 0.5 }, ...
  ]
}`,
      systemPrompt: 'You are an expert systems engineer. Modify constraints and KPIs according to user feedback. Respond with valid JSON only. Weights must sum to 1.0.',
      provider: 'openrouter' as any,
      model: 'openai/gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 1024,
    });

    const parsed = this.parseJsonResponse<{
      constraints: string[];
      kpis: KpiDto[];
    }>(response.content);

    const totalWeight = parsed.kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
    if (totalWeight > 0) {
      parsed.kpis.forEach(kpi => kpi.weight = Math.round((kpi.weight / totalWeight) * 100) / 100);
    }

    const updated = await this.prisma.trizProject.update({
      where: { id: projectId },
      data: {
        constraints: JSON.stringify(parsed.constraints),
        kpis: JSON.stringify(parsed.kpis),
      },
    });

    return {
      constraints: parsed.constraints,
      kpis: parsed.kpis,
      status: updated.status,
    };
  }

  // ─── Step 2: Generate Contradiction via LLM ─────────────────────

  async generateContradiction(projectId: string): Promise<ContradictionResult> {
    const project = await this.getProjectOrThrow(projectId);

    const parameterList = this.matrix
      .getAllParameters()
      .map((p) => `${p.id}: ${p.name}`)
      .join('\n');

    const constraints = project.constraints ? JSON.parse(project.constraints) : [];
    const kpis = project.kpis ? JSON.parse(project.kpis) : [];

    const response = await this.llm.complete({
      prompt: `Analyze the following inventive engineering problem and identify the TRIZ Technical Contradiction.

PROBLEM:
${project.description}

TARGET SDGs: ${project.targetSdgs}
CONSTRAINTS (Forbidden concepts/technologies): ${JSON.stringify(constraints)}
KPIs (Key Performance Indicators): ${JSON.stringify(kpis)}

INSTRUCTIONS:
1. Identify exactly 3 standard TRIZ engineering parameters that would IMPROVE if the problem were solved (THEN conditions). Keep the CONSTRAINTS and KPIs in mind.
2. Identify exactly 3 standard TRIZ engineering parameters that would WORSEN as a side-effect (BUT conditions).
3. Formulate an IF-THEN-BUT statement that captures the core trade-off, strictly avoiding anything on the CONSTRAINTS list.

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
      model: 'openai/gpt-4o-mini',
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

  // ─── Step 4a: Generate TRIZ Candidates via LLM ──────────────────

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

    // Clear previous TRIZ candidates only
    await this.prisma.trizCandidate.deleteMany({
      where: { projectId, source: 'TRIZ' },
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
          'You are an innovative R&D engineer expert in TRIZ-based inventive problem solving. Respond accurately with valid JSON only.',
        provider: 'openrouter' as any,
        model: 'openai/gpt-4o-mini',
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
          appliedRules: typeof parsed.appliedRules === 'string' ? parsed.appliedRules : JSON.stringify(parsed.appliedRules, null, 2),
          source: 'TRIZ',
        },
      });

      candidates.push(candidate);
    }

    this.logger.log(`Generated ${candidates.length} TRIZ candidates for project ${projectId}`);
    return candidates;
  }

  // ─── Step 4b: Generate Morphological Candidates via LLM ─────────

  async generateMorphologicalCandidates(projectId: string) {
    const project = await this.getProjectOrThrow(projectId);

    // Clear previous morphological candidates only
    await this.prisma.trizCandidate.deleteMany({
      where: { projectId, source: 'MORPHOLOGICAL' },
    });

    // ── LLM Call 1: Decompose problem into 5 dimensions ──────────
    this.logger.log(`[Morph] Step 1/4: Decomposing problem into dimensions...`);

    const decomposeResponse = await this.llm.complete({
      prompt: `Analyze the following engineering/innovation problem and decompose it into EXACTLY 5 key solution dimensions (categories). For each dimension, provide 4-6 concrete variant options.

PROBLEM:
${project.description}

TARGET SDGs: ${project.targetSdgs}

The 5 dimensions should cover the most critical design axes of the problem space, such as:
- Technology/method used
- Architecture/topology
- Resource management approach
- Deployment/delivery model
- Ownership/business model

Adapt the dimension names to fit the specific problem domain.

Respond in valid JSON:
{
  "dimensions": [
    { "id": "dimension_1_snake_case", "label": "Human Readable Label", "variants": ["variant_a", "variant_b", "variant_c", "variant_d"] },
    { "id": "dimension_2_snake_case", "label": "Human Readable Label", "variants": ["variant_a", "variant_b", "variant_c", "variant_d", "variant_e"] }
  ]
}`,
      systemPrompt: 'You are a systems engineering expert specializing in morphological analysis and creative problem decomposition. Respond with valid JSON only.',
      provider: 'openrouter' as any,
      model: 'openai/gpt-4o-mini',
      temperature: 0.6,
      maxTokens: 2048,
    });

    const decomposed = this.parseJsonResponse<{
      dimensions: Array<{ id: string; label: string; variants: string[] }>;
    }>(decomposeResponse.content);

    this.logger.log(`[Morph] Decomposed into ${decomposed.dimensions.length} dimensions with ${decomposed.dimensions.map(d => d.variants.length).join(',')} variants`);

    // ── LLM Call 2: Expand with synonyms ──────────────────────────
    this.logger.log(`[Morph] Step 2/4: Expanding variants with synonyms...`);

    const expandResponse = await this.llm.complete({
      prompt: `Given the following morphological box (problem decomposition), expand each dimension with 2-3 additional synonym/alternative variants. These should be genuinely different approaches, not just rewordings.

CURRENT MORPH BOX:
${JSON.stringify(decomposed.dimensions, null, 2)}

PROBLEM CONTEXT:
${project.description}

Rules:
- Add new variants that represent genuinely different technical/strategic approaches.
- Keep the original variants, just add new ones.
- Use snake_case for variant names.

Respond in valid JSON with the SAME structure:
{
  "dimensions": [
    { "id": "...", "label": "...", "variants": ["original_1", "original_2", ..., "new_synonym_1", "new_synonym_2"] }
  ]
}`,
      systemPrompt: 'You are a creative engineering expert. Expand the design space with meaningful alternatives. Respond with valid JSON only.',
      provider: 'openrouter' as any,
      model: 'openai/gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2048,
    });

    const expanded = this.parseJsonResponse<{
      dimensions: Array<{ id: string; label: string; variants: string[] }>;
    }>(expandResponse.content);

    this.logger.log(`[Morph] Expanded to ${expanded.dimensions.map(d => d.variants.length).join(',')} variants per dimension`);

    // ── LLM Call 3: Deduplicate overlapping variants ──────────────
    this.logger.log(`[Morph] Step 3/4: Deduplicating overlapping variants and applying CONSTRAINTS...`);

    const constraints = project.constraints ? JSON.parse(project.constraints) : [];
    const kpis = project.kpis ? JSON.parse(project.kpis) as KpiDto[] : [];

    const dedupeResponse = await this.llm.complete({
      prompt: `Review the following expanded morphological box and remove redundant/overlapping variants. Two variants overlap if they describe essentially the same approach.

EXPANDED MORPH BOX:
${JSON.stringify(expanded.dimensions, null, 2)}

CONSTRAINTS (Forbidden concepts):
${JSON.stringify(constraints)}

Rules:
- STRICT RULE: You MUST remove ANY variant that relates to the CONSTRAINTS. If a variant implies a forbidden technology, delete it completely.
- Within each dimension, remove variants that are too similar to each other.
- Keep at least 4 variants per dimension (if possible after removing constraints).
- Keep the most descriptive variant name when removing duplicates.
- Do NOT remove variants across different dimensions (cross-dimension overlap is fine).

Respond in valid JSON with the SAME structure:
{
  "dimensions": [
    { "id": "...", "label": "...", "variants": ["kept_variant_1", "kept_variant_2", ...] }
  ]
}`,
      systemPrompt: 'You are a systems engineering expert performing morphological analysis. Be rigorous in identifying true overlaps and enforcing constraints. Respond with valid JSON only.',
      provider: 'openrouter' as any,
      model: 'openai/gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 2048,
    });

    const deduplicated = this.parseJsonResponse<{
      dimensions: Array<{ id: string; label: string; variants: string[] }>;
    }>(dedupeResponse.content);

    this.logger.log(`[Morph] Deduplicated to ${deduplicated.dimensions.map(d => d.variants.length).join(',')} variants per dimension`);

    // ── Step 4: Random sampling of 3 combinations ────────────────
    this.logger.log(`[Morph] Step 4/4: Sampling 3 combinations with KPI boosting...`);

    const combinations: Array<Record<string, string>> = [];
    const usedKeys = new Set<string>();

    // Helper: Calculate weight for a variant based on KPIs
    const getVariantWeight = (variant: string) => {
      let weight = 1;
      const lowerVariant = variant.toLowerCase();
      for (const kpi of kpis) {
        if (lowerVariant.includes(kpi.name.toLowerCase())) {
          weight = 3; // Boost weight by 3x if variant matches KPI word
        }
      }
      return weight;
    };

    for (let i = 0; i < 3; i++) {
      let combo: Record<string, string>;
      let key: string;
      let attempts = 0;

      do {
        combo = {};
        for (const dim of deduplicated.dimensions) {
          if (dim.variants.length === 0) continue;
          
          // Roulette wheel selection based on KPI weights
          const weights = dim.variants.map(v => getVariantWeight(v));
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let randomNum = Math.random() * totalWeight;
          let selectedIndex = 0;
          
          for (let j = 0; j < weights.length; j++) {
            randomNum -= weights[j];
            if (randomNum <= 0) {
              selectedIndex = j;
              break;
            }
          }
          
          combo[dim.id] = dim.variants[selectedIndex];
        }
        key = Object.values(combo).sort().join('|');
        attempts++;
      } while (usedKeys.has(key) && attempts < 50);

      usedKeys.add(key);
      combinations.push(combo);
    }

    // Persist the morph box and combinations
    await this.prisma.trizMorphBox.upsert({
      where: { projectId },
      create: {
        projectId,
        dimensions: JSON.stringify(deduplicated.dimensions),
        combinations: JSON.stringify(combinations),
      },
      update: {
        dimensions: JSON.stringify(deduplicated.dimensions),
        combinations: JSON.stringify(combinations),
      },
    });

    // ── Generate 3 candidate solutions from combinations ─────────
    const candidates = [];

    for (let i = 0; i < combinations.length; i++) {
      const combo = combinations[i];
      const comboDescription = deduplicated.dimensions
        .map((dim) => `- ${dim.label}: ${combo[dim.id]?.replace(/_/g, ' ')}`)
        .join('\n');

      const response = await this.llm.complete({
        prompt: `Generate ONE innovative candidate solution for the following problem, based on a specific combination of design choices from a morphological analysis.

PROBLEM:
${project.description}

TARGET SDGs: ${project.targetSdgs}

DESIGN COMBINATION (one variant chosen per dimension):
${comboDescription}

CONSTRAINTS:
- The solution MUST integrate ALL of the above design choices into a coherent concept.
- The solution must be concrete, actionable, and technically feasible.
- Explain how each dimension choice shapes the final solution.

Respond in valid JSON:
{
  "title": "Short descriptive name of the solution",
  "description": "Detailed implementation concept (2-4 paragraphs)",
  "appliedRules": "Explanation of how each morphological dimension was integrated"
}`,
        systemPrompt:
          'You are an innovative R&D engineer expert in morphological analysis and creative solution synthesis. Respond accurately with valid JSON only.',
        provider: 'openrouter' as any,
        model: 'openai/gpt-4o-mini',
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
          title: parsed.title,
          description: parsed.description,
          appliedRules: typeof parsed.appliedRules === 'string' ? parsed.appliedRules : JSON.stringify(parsed.appliedRules, null, 2),
          source: 'MORPHOLOGICAL',
        },
      });

      candidates.push(candidate);
    }

    this.logger.log(`Generated ${candidates.length} morphological candidates for project ${projectId}`);
    return {
      morphBox: deduplicated.dimensions,
      combinations,
      candidates,
    };
  }

  // ─── Step 5: Evaluate Candidates via LLM ────────────────────────

  // ─── Step 5: Evaluate Candidates via LLM ────────────────────────

  async evaluateCandidates(projectId: string) {
    const project = await this.getProjectOrThrow(projectId);
    const candidates = await this.prisma.trizCandidate.findMany({
      where: { projectId },
    });

    if (candidates.length === 0) {
      throw new BadRequestException(
        'No candidates found. Generate them first.',
      );
    }

    const constraints = project.constraints ? JSON.parse(project.constraints) : [];
    const kpis = project.kpis ? JSON.parse(project.kpis) as KpiDto[] : [];

    // --- GATE 1: Disqualification based on Constraints (Blacklist) ---
    this.logger.log(`[Eval Gate 1] Checking ${candidates.length} candidates against constraints...`);
    const validCandidates = [];
    
    for (const candidate of candidates) {
      let disqualified = false;
      let reason = '';

      const contentToScan = `${candidate.title} ${candidate.description} ${candidate.appliedRules}`.toLowerCase();
      
      for (const constraint of constraints) {
        if (contentToScan.includes(constraint.toLowerCase())) {
          disqualified = true;
          reason = `Violates constraint: "${constraint}"`;
          break;
        }
      }

      if (disqualified) {
        await this.prisma.trizCandidate.update({
          where: { id: candidate.id },
          data: { isDisqualified: true, disqualReason: reason },
        });
        candidate.isDisqualified = true;
        candidate.disqualReason = reason;
      } else {
        // Reset just in case it's a re-run
        await this.prisma.trizCandidate.update({
          where: { id: candidate.id },
          data: { isDisqualified: false, disqualReason: null },
        });
        candidate.isDisqualified = false;
        candidate.disqualReason = null;
        validCandidates.push(candidate);
      }
    }

    if (validCandidates.length === 0) {
      // All disqualified, mark as evaluated but return early
      await this.prisma.trizProject.update({
        where: { id: projectId },
        data: { status: 'EVALUATED' },
      });
      return {
        scoreboard: candidates.map(c => ({
          candidateId: c.id,
          title: c.title,
          isDisqualified: true,
          disqualReason: c.disqualReason,
          scores: {},
          weightedScore: 0
        })),
        rawEvaluations: []
      };
    }

    // --- GATE 2: AI Judge using KPIs ---
    this.logger.log(`[Eval Gate 2] AI Judge scoring ${validCandidates.length} valid candidates...`);

    const candidateDescriptions = validCandidates
      .map(
        (c, i) =>
          `Candidate ${i + 1} (ID: ${c.id}):\n  Title: ${c.title}\n  Description: ${c.description}`,
      )
      .join('\n\n');

    // Build the dynamic prompt for KPIs
    const kpiInstructions = kpis.length > 0 
      ? kpis.map((kpi, idx) => `${idx + 1}. ${kpi.name} (Weight: ${kpi.weight})`).join('\n')
      : '1. Overall Quality (Weight: 1.0)';

    // Dynamic JSON schema matching the kpis
    const jsonExampleCriteria = kpis.length > 0
      ? kpis.map(kpi => `{ "criteriaName": "${kpi.name}", "score": 8, "rationale": "..." }`).join(',\n        ')
      : `{ "criteriaName": "Overall Quality", "score": 8, "rationale": "..." }`;

    const response = await this.llm.complete({
      prompt: `Evaluate each of the following candidate solutions for the engineering problem.

PROBLEM:
${project.description}

TARGET SDGs: ${project.targetSdgs}

CANDIDATES:
${candidateDescriptions}

Score each candidate on a scale of 1-10 for each of the following Key Performance Indicators (KPIs):
${kpiInstructions}

Provide a brief rationale for each score.

Respond in valid JSON:
{
  "evaluations": [
    {
      "candidateId": "actual-uuid-from-above",
      "criteriaScores": [
        ${jsonExampleCriteria}
      ]
    }
  ]
}`,
      systemPrompt:
        'You are a multi-criteria decision analysis expert who evaluates R&D concept solutions. Be objective and rigorous. Respond with valid JSON only.',
      provider: 'openrouter' as any,
      model: 'openai/gpt-4o-mini',
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

    // Build weight map from Project KPIs
    const weightMap: Record<string, number> = {};
    if (kpis.length > 0) {
      kpis.forEach(k => weightMap[k.name] = k.weight);
    } else {
      weightMap['Overall Quality'] = 1.0;
    }

    const scoreboard = candidates.map((candidate) => {
      if (candidate.isDisqualified) {
        return {
          candidateId: candidate.id,
          title: candidate.title,
          isDisqualified: true,
          disqualReason: candidate.disqualReason,
          scores: {},
          weightedScore: 0
        };
      }

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
        isDisqualified: false,
        disqualReason: null,
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
      `Evaluated ${validCandidates.length} valid candidates (and disqualified ${candidates.length - validCandidates.length}) for project ${projectId}`,
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
        morphBox: true,
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

  async updateProjectStatus(projectId: string, status: string) {
    await this.prisma.trizProject.update({
      where: { id: projectId },
      data: { status },
    });
  }

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
