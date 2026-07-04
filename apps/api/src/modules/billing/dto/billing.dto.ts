import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  personId!: string;

  @ApiProperty({
    example: 'SAAS',
    enum: ['SAAS', 'FREEMIUM', 'PAY_PER_USE', 'LICENSE_B2B', 'WHITE_LABEL'],
  })
  @IsNotEmpty()
  @IsString()
  type!: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Flexible metadata for business model specifics' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class RecordUsageDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  personId!: string;

  @ApiProperty({ example: 'llm_call' })
  @IsNotEmpty()
  @IsString()
  action!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  units?: number;

  @ApiPropertyOptional({ example: 0.05 })
  @IsOptional()
  @IsNumber()
  cost?: number;
}
