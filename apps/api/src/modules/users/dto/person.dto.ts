import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePersonDto {
  @ApiProperty({ example: 'jan@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jan Kowalski' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'USER', enum: ['USER', 'ADMIN', 'REVIEWER'] })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'FREE', enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] })
  @IsOptional()
  @IsString()
  subscriptionTier?: string;
}

export class UpdatePersonDto {
  @ApiPropertyOptional({ example: 'jan@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Jan Kowalski' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ADMIN' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'PRO' })
  @IsOptional()
  @IsString()
  subscriptionTier?: string;
}
