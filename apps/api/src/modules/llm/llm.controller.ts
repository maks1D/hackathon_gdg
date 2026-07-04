import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LlmService } from './llm.service';
import { LlmCompletionRequestDto } from './dto/llm.dto';

@ApiTags('llm')
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post('complete')
  @ApiOperation({
    summary: 'Send a prompt to the LLM engine',
    description:
      'Orchestrates prompt building, cache lookup, provider call, structured output validation, guardrails, and telemetry.',
  })
  complete(
    @Body() dto: LlmCompletionRequestDto,
    @Query('personId') personId?: string,
  ) {
    return this.llmService.complete(dto, personId);
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get LLM business metrics',
    description:
      'Returns ROI-focused metrics: total calls, cost, time saved, cache hit rate — NOT just accuracy.',
  })
  @ApiQuery({ name: 'personId', required: false })
  getMetrics(@Query('personId') personId?: string) {
    return this.llmService.getBusinessMetrics(personId);
  }
}
