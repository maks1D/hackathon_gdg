import { IsNotEmpty, IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LlmCompletionRequestDto {
  @ApiProperty({ example: 'Analyze this document and extract key entities.' })
  @IsNotEmpty()
  @IsString()
  prompt!: string;

  @ApiPropertyOptional({ example: 'You are an expert data analyst.' })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ example: 'openai', enum: ['openai', 'anthropic', 'gemini'] })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'gpt-4o' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 0.7 })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ example: 2048 })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @ApiPropertyOptional({
    example: 'entityExtraction',
    description: 'Name of a registered Zod schema for structured output validation',
  })
  @IsOptional()
  @IsString()
  outputSchemaName?: string;

  @ApiPropertyOptional({
    description: 'Name of a registered prompt template',
    example: 'data-analysis',
  })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiPropertyOptional({
    description: 'Variables to inject into the prompt template',
    example: { domain: 'healthcare', language: 'pl' },
  })
  @IsOptional()
  variables?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Additional context messages for RAG / MCP',
  })
  @IsOptional()
  @IsArray()
  context?: Array<{ role: string; content: string }>;
}
