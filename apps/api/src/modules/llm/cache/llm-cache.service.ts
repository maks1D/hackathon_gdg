import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import type { LlmCompletionResponse } from '@libs/shared';

/**
 * LLM Cache Service.
 *
 * Deduplicates identical LLM calls to save token costs.
 * Uses in-memory cache (CacheModule) with configurable TTL.
 * Switchable to Redis by configuring CacheModule with Redis store.
 */
@Injectable()
export class LlmCacheService {
  private readonly logger = new Logger(LlmCacheService.name);
  private readonly CACHE_PREFIX = 'llm:';

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Generate a deterministic cache key from prompt + provider + model.
   */
  generateKey(
    messages: Array<{ role: string; content: string }>,
    provider?: string,
    model?: string,
  ): string {
    const payload = JSON.stringify({ messages, provider, model });
    const hash = createHash('sha256').update(payload).digest('hex').slice(0, 16);
    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Get a cached LLM response.
   */
  async get(key: string): Promise<LlmCompletionResponse | null> {
    try {
      const cached = await this.cacheManager.get<string>(key);
      if (cached) {
        this.logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache GET error: ${(error as Error).message}`);
    }
    return null;
  }

  /**
   * Cache an LLM response.
   */
  async set(key: string, response: LlmCompletionResponse): Promise<void> {
    try {
      await this.cacheManager.set(key, JSON.stringify(response));
      this.logger.debug(`Cache SET: ${key}`);
    } catch (error) {
      this.logger.warn(`Cache SET error: ${(error as Error).message}`);
    }
  }

  /**
   * Invalidate a cached response.
   */
  async invalidate(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}
