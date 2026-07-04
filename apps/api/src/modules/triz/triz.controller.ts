import {
  Controller,
  Post,
  Get,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  TrizService,
  CreateProjectDto,
  ConfirmContradictionDto,
  EvaluationWeights,
  SelectionDto,
} from './triz.service';
import { TrizMatrixService } from './triz-matrix.service';

@ApiTags('triz')
@Controller('triz')
export class TrizController {
  constructor(
    private readonly trizService: TrizService,
    private readonly matrixService: TrizMatrixService,
  ) {}

  // ─── Step 1: Create Project ─────────────────────────────────────

  @Post('project')
  @ApiOperation({ summary: 'Create a new TRIZ R&D project' })
  createProject(@Body() dto: CreateProjectDto) {
    return this.trizService.createProject(dto);
  }

  @Get('projects')
  @ApiOperation({ summary: 'List all TRIZ projects' })
  listProjects() {
    return this.trizService.listProjects();
  }

  @Get('project/:id')
  @ApiOperation({ summary: 'Get full project state with all related data' })
  getProject(@Param('id') id: string) {
    return this.trizService.getProject(id);
  }

  // ─── Step 2: Generate Contradiction ─────────────────────────────

  @Post('project/:id/contradiction')
  @ApiOperation({
    summary: 'Generate technical contradiction via LLM',
    description:
      'Analyzes the problem and identifies 3 improving + 3 worsening TRIZ parameters with an IF-THEN-BUT formulation.',
  })
  generateContradiction(@Param('id') id: string) {
    return this.trizService.generateContradiction(id);
  }

  // ─── Step 3: Confirm & Sample Triplets ──────────────────────────

  @Post('project/:id/contradiction/confirm')
  @ApiOperation({
    summary: 'Confirm contradiction parameters and sample inventive principle triplets',
    description:
      'Optionally override parameters, then runs 3×3 matrix lookup, frequency aggregation, and weighted roulette-wheel sampling of 3 principle triplets.',
  })
  confirmAndSample(
    @Param('id') id: string,
    @Body() dto?: ConfirmContradictionDto,
  ) {
    return this.trizService.confirmAndSample(id, dto);
  }

  // ─── Step 4: Generate Candidates ────────────────────────────────

  @Post('project/:id/candidates/generate')
  @ApiOperation({
    summary: 'Generate candidate solutions from sampled triplets via LLM',
    description:
      'Creates one candidate solution per sampled triplet (3 total), each grounded in 3 specific inventive principles.',
  })
  generateCandidates(@Param('id') id: string) {
    return this.trizService.generateCandidates(id);
  }

  // ─── Step 5: Evaluate Candidates ────────────────────────────────

  @Post('project/:id/evaluate')
  @ApiOperation({
    summary: 'Evaluate candidates using multi-criteria decision analysis',
    description:
      'LLM scores each candidate on SDG Alignment, Feasibility, Cost, and Complexity. Weights can be customized.',
  })
  evaluateCandidates(
    @Param('id') id: string,
    @Body() weights?: EvaluationWeights,
  ) {
    return this.trizService.evaluateCandidates(id, weights);
  }

  // ─── Step 6: Select Winner ──────────────────────────────────────

  @Post('project/:id/select')
  @ApiOperation({
    summary: 'Select the winning candidate and generate the full reasoning trail',
    description:
      'Seals the project as COMPLETED and produces the full audit report: Problem → Contradiction → Principles → Candidates → Evaluation → Choice.',
  })
  selectWinner(
    @Param('id') id: string,
    @Body() dto?: SelectionDto,
  ) {
    return this.trizService.selectWinner(id, dto);
  }

  // ─── Reference Data ─────────────────────────────────────────────

  @Get('parameters')
  @ApiOperation({ summary: 'List all 39 standard TRIZ engineering parameters' })
  getParameters() {
    return this.matrixService.getAllParameters();
  }

  @Get('principles')
  @ApiOperation({ summary: 'List all 40 TRIZ inventive principles' })
  getPrinciples() {
    return this.matrixService.getAllPrinciples();
  }
}
