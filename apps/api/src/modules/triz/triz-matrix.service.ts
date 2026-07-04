import { Injectable, Logger } from '@nestjs/common';
import {
  lookupMatrix,
  TRIZ_PARAMETERS,
  TRIZ_PRINCIPLES,
} from './triz-matrix.data';

export interface PrincipleFrequency {
  principleId: number;
  name: string;
  description: string;
  frequency: number;
}

export interface SampledTriplet {
  index: number;
  principleIds: number[];
  principleNames: string[];
}

/**
 * Deterministic TRIZ Matrix Service.
 *
 * Handles:
 * 1. 3×3 grid lookup (9 intersections of improving × worsening parameters)
 * 2. Frequency aggregation & sorting of recommended principles
 * 3. Roulette-wheel weighted sampling of 3 unique triplets
 *
 * NO LLM calls are made in this service — it operates exclusively
 * on the static Altshuller contradiction matrix data.
 */
@Injectable()
export class TrizMatrixService {
  private readonly logger = new Logger(TrizMatrixService.name);

  /**
   * Look up all 9 intersections of a 3×3 parameter grid and aggregate
   * the recommended inventive principles by frequency.
   */
  lookupAndAggregate(
    improvingIds: number[],
    worseningIds: number[],
  ): PrincipleFrequency[] {
    const frequencyMap = new Map<number, number>();

    for (const impId of improvingIds) {
      for (const worId of worseningIds) {
        const principles = lookupMatrix(impId, worId);
        this.logger.debug(
          `Matrix[${impId}×${worId}] → Principles: [${principles.join(', ')}]`,
        );
        for (const p of principles) {
          frequencyMap.set(p, (frequencyMap.get(p) || 0) + 1);
        }
      }
    }

    // Convert to sorted array (descending by frequency)
    const result: PrincipleFrequency[] = [];
    for (const [principleId, frequency] of frequencyMap.entries()) {
      const info = TRIZ_PRINCIPLES[principleId];
      result.push({
        principleId,
        name: info?.name ?? `Principle ${principleId}`,
        description: info?.description ?? '',
        frequency,
      });
    }

    result.sort((a, b) => b.frequency - a.frequency);

    this.logger.log(
      `Aggregated ${result.length} unique principles from ${improvingIds.length}×${worseningIds.length} grid`,
    );

    return result;
  }

  /**
   * Roulette-wheel weighted sampling of 3 unique triplets (groups of 3 principles).
   *
   * Algorithm:
   * 1. Build a cumulative weight distribution from principle frequencies.
   * 2. For each of the 3 triplets, draw 3 unique principles using weighted random selection.
   * 3. Ensure no duplicate principles within a single triplet.
   *
   * The frequency acts as the weight — principles recommended by more matrix cells
   * are more likely to be selected, but rarer principles still have a chance.
   */
  sampleTriplets(
    frequencies: PrincipleFrequency[],
    count = 3,
    tripletSize = 3,
  ): SampledTriplet[] {
    if (frequencies.length < tripletSize) {
      // Not enough principles to form even one triplet — use what we have
      this.logger.warn(
        `Only ${frequencies.length} principles available; returning single partial triplet`,
      );
      return [
        {
          index: 0,
          principleIds: frequencies.map((f) => f.principleId),
          principleNames: frequencies.map((f) => f.name),
        },
      ];
    }

    const triplets: SampledTriplet[] = [];
    const usedCombinations = new Set<string>();

    for (let t = 0; t < count; t++) {
      let attempts = 0;
      let selected: PrincipleFrequency[] = [];

      // Retry until we get a unique triplet combination (max 50 attempts)
      do {
        selected = this.weightedSampleWithoutReplacement(
          frequencies,
          tripletSize,
        );
        const key = selected
          .map((s) => s.principleId)
          .sort((a, b) => a - b)
          .join(',');

        if (!usedCombinations.has(key)) {
          usedCombinations.add(key);
          break;
        }
        attempts++;
      } while (attempts < 50);

      triplets.push({
        index: t,
        principleIds: selected.map((s) => s.principleId),
        principleNames: selected.map((s) => s.name),
      });
    }

    this.logger.log(`Sampled ${triplets.length} unique triplets`);
    return triplets;
  }

  /**
   * Draw `k` unique items from the frequency list using roulette-wheel selection.
   */
  private weightedSampleWithoutReplacement(
    items: PrincipleFrequency[],
    k: number,
  ): PrincipleFrequency[] {
    // Clone the pool so we can remove selected items
    const pool = items.map((item) => ({ ...item }));
    const selected: PrincipleFrequency[] = [];

    for (let i = 0; i < k && pool.length > 0; i++) {
      const totalWeight = pool.reduce((sum, p) => sum + p.frequency, 0);
      let r = Math.random() * totalWeight;

      for (let j = 0; j < pool.length; j++) {
        r -= pool[j].frequency;
        if (r <= 0) {
          selected.push(pool[j]);
          pool.splice(j, 1);
          break;
        }
      }
    }

    return selected;
  }

  /**
   * Get parameter name by ID.
   */
  getParameterName(id: number): string {
    return TRIZ_PARAMETERS[id] ?? `Unknown parameter (${id})`;
  }

  /**
   * Get principle details by ID.
   */
  getPrincipleDetails(id: number): { name: string; description: string } {
    return TRIZ_PRINCIPLES[id] ?? { name: `Principle ${id}`, description: '' };
  }

  /**
   * Return the full list of 39 parameters (for UI dropdowns / validation).
   */
  getAllParameters(): Array<{ id: number; name: string }> {
    return Object.entries(TRIZ_PARAMETERS).map(([id, name]) => ({
      id: parseInt(id, 10),
      name,
    }));
  }

  /**
   * Return the full list of 40 principles.
   */
  getAllPrinciples(): Array<{ id: number; name: string; description: string }> {
    return Object.entries(TRIZ_PRINCIPLES).map(([id, info]) => ({
      id: parseInt(id, 10),
      name: info.name,
      description: info.description,
    }));
  }
}
