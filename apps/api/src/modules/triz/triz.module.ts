import { Module } from '@nestjs/common';
import { TrizController } from './triz.controller';
import { TrizService } from './triz.service';
import { TrizMatrixService } from './triz-matrix.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [TrizController],
  providers: [TrizService, TrizMatrixService],
  exports: [TrizService],
})
export class TrizModule {}
