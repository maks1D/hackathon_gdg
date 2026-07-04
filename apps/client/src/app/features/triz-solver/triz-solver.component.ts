import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// ─── Interfaces ─────────────────────────────────────────────────────

import { 
  TrizProject, 
  ContradictionResult, 
  PrincipleFrequency, 
  SampledTriplet, 
  TrizCandidate, 
  ScoreboardEntry, 
  SelectionResult,
  KpiDto
} from '@libs/shared';
import { TrizApiService } from '@libs/http';

// ─── Component ──────────────────────────────────────────────────────

@Component({
  selector: 'app-triz-solver',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section aria-labelledby="triz-heading" class="animate-fade-in">
      <div class="text-reveal-mask">
        <h1 id="triz-heading">R&D Innovation Solver</h1>
      </div>
      <p>AI-powered inventive problem solving with TRIZ contradiction analysis, weighted principle sampling, and multi-criteria evaluation.</p>

      <!-- Pipeline Steps -->
      <nav aria-label="Pipeline steps" class="stepper">
        @for (step of steps; track step.id) {
          <button
            class="step-btn"
            [class.active]="currentStep() === step.id"
            [class.completed]="highestStepReached() > step.id"
            [disabled]="highestStepReached() < step.id"
            (click)="currentStep.set(step.id)"
            [attr.aria-current]="currentStep() === step.id ? 'step' : null">
            <span class="step-number" aria-hidden="true">{{ step.id }}</span>
            <span class="step-label">{{ step.label }}</span>
          </button>
        }
      </nav>

      <!-- Step 1: Problem Intake -->
      @if (currentStep() === 1) {
        <section class="card step-panel" aria-label="Problem intake">
          <h2>Step 1: Define the Problem</h2>
          <form (submit)="createProject($event)" class="prompt-form">
            <div class="form-group">
              <label for="project-title" class="form-label">Project Title *</label>
              <input
                id="project-title"
                class="form-input"
                [(ngModel)]="projectTitle"
                name="title"
                placeholder="e.g., Remote Electricity Delivery"
                required
                aria-required="true" />
            </div>
            <div class="form-group">
              <label for="problem-desc" class="form-label">Problem Description *</label>
              <textarea
                id="problem-desc"
                class="form-textarea"
                [(ngModel)]="problemDescription"
                name="description"
                rows="6"
                placeholder="Describe the inventive challenge in detail..."
                required
                aria-required="true"></textarea>
            </div>
            <div class="form-group">
              <label for="sdg-input" class="form-label">Target UN SDGs (comma-separated numbers)</label>
              <input
                id="sdg-input"
                class="form-input"
                [(ngModel)]="sdgInput"
                name="sdgs"
                placeholder="e.g., 7, 9, 11" />
            </div>
            <button type="submit" class="btn btn-primary" [disabled]="isLoading()" id="create-project-btn">
              @if (isLoading()) {
                <span class="spinner" role="status" aria-hidden="true"></span> Creating...
              } @else {
                Create Project & Analyze
              }
            </button>
          </form>
        </section>
      }

      <!-- Step 2: Plan (Constraints & KPIs Review) -->
      @if (currentStep() === 2) {
        <section class="card step-panel" aria-label="Constraints and KPIs">
          <h2>Step 2: Plan (Constraints & KPIs)</h2>
          <p class="text-muted">Review the extracted constraints (blacklist) and KPIs. Modify them manually or ask AI to adjust them.</p>
          
          <div class="triplets-grid" style="grid-template-columns: 1fr 1fr;">
            <!-- KPIs Column -->
            <div class="candidate-card">
              <h3>KPIs (Business Goals)</h3>
              <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1rem;">Weights must sum to 1.0. Used later by AI Judge.</p>
              
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                @for (kpi of kpis(); track $index) {
                  <div style="display: flex; gap: 0.5rem;">
                    <input class="form-input" [value]="kpi.name" (input)="updateKpiName($index, $event)" placeholder="KPI Name" style="flex: 2" />
                    <input class="form-input" type="number" step="0.1" min="0" max="1" [value]="kpi.weight" (input)="updateKpiWeight($index, $event)" style="flex: 1" />
                    <button class="btn btn-secondary" (click)="removeKpi($index)">X</button>
                  </div>
                }
                <button class="btn btn-secondary" style="margin-top: 0.5rem;" (click)="addKpi()">+ Add KPI</button>
              </div>
            </div>

            <!-- Constraints Column -->
            <div class="candidate-card">
              <h3>Constraints (Blacklist)</h3>
              <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1rem;">Forbidden technologies or concepts. Triggers immediate disqualification.</p>
              
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                @for (constraint of constraints(); track $index) {
                  <div style="display: flex; gap: 0.5rem;">
                    <input class="form-input" [value]="constraint" (input)="updateConstraint($index, $event)" placeholder="Constraint" style="flex: 1" />
                    <button class="btn btn-secondary" (click)="removeConstraint($index)">X</button>
                  </div>
                }
                <button class="btn btn-secondary" style="margin-top: 0.5rem;" (click)="addConstraint()">+ Add Constraint</button>
              </div>
            </div>
          </div>

          <!-- AI Modification Prompt -->
          <div class="form-group" style="margin-top: 1.5rem;">
            <label class="form-label">Modify with AI</label>
            <div style="display: flex; gap: 0.5rem;">
              <input class="form-input" [(ngModel)]="modifyPrompt" placeholder="e.g., Make speed the most important KPI and ban all fossil fuels" />
              <button class="btn btn-secondary" (click)="modifyConstraintsWithAI()" [disabled]="isLoading() || !modifyPrompt">
                @if (isLoading()) { <span class="spinner"></span> } @else { Refine }
              </button>
            </div>
          </div>

          <div class="btn-row" style="margin-top: 1.5rem;">
            <button class="btn btn-primary" (click)="acceptConstraints()" [disabled]="isLoading()">
              @if (isLoading()) { <span class="spinner"></span> } @else { Accept & Continue }
            </button>
            <button class="btn" style="background-color: var(--accent-danger, #ef4444); color: white;" (click)="rejectConstraints()" [disabled]="isLoading()">
              Reject (Back)
            </button>
          </div>
        </section>
      }

      <!-- Step 3: Triz Contradiction & Principles Review -->
      @if (currentStep() === 3) {
        <section class="card step-panel" aria-label="Contradiction and principles review">
          <h2>Step 3: Technical Contradiction (IF-THEN-BUT)</h2>
          @if (contradiction()) {
            <div class="contradiction-grid">
              <div class="if-card">
                <h3>IF (Naïve approach)</h3>
                <p>{{ extractPart(contradiction()!.ifThenButText, 'IF') }}</p>
              </div>
              <div class="then-card">
                <h3>THEN (Improving)</h3>
                <p>{{ extractPart(contradiction()!.ifThenButText, 'THEN') }}</p>
                <ul class="param-list">
                  @for (name of contradiction()!.improvingNames; track name) {
                    <li class="param-tag tag-positive">{{ name }}</li>
                  }
                </ul>
              </div>
              <div class="but-card">
                <h3>BUT (Worsening)</h3>
                <p>{{ extractPart(contradiction()!.ifThenButText, 'BUT') }}</p>
                <ul class="param-list">
                  @for (name of contradiction()!.worseningNames; track name) {
                    <li class="param-tag tag-negative">{{ name }}</li>
                  }
                </ul>
              </div>
            </div>

            <!-- Display Sampled Principles if they have been generated -->
            @if (frequencies().length > 0) {
              <div style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 2rem;">
                <h3>Sampled Inventive Principle Triplets</h3>
                <div class="freq-bar-section">
                  <h4>Frequency Distribution (from 9 matrix lookups)</h4>
                  <div class="freq-bars">
                    @for (f of frequencies(); track f.principleId) {
                      <div class="freq-row">
                        <span class="freq-label">{{ f.principleId }}: {{ f.name }}</span>
                        <div class="freq-bar" [style.width.%]="(f.frequency / maxFrequency()) * 100"></div>
                        <span class="freq-count">×{{ f.frequency }}</span>
                      </div>
                    }
                  </div>
                </div>
                
                @if (triplets().length > 0) {
                  <div class="triplets-grid" style="margin-top: 1.5rem;">
                    @for (triplet of triplets(); track triplet.index) {
                      <div class="triplet-card">
                        <h4>Triplet {{ triplet.index + 1 }}</h4>
                        <ul class="principle-list">
                          @for (name of triplet.principleNames; track name; let i = $index) {
                            <li class="principle-tag">{{ triplet.principleIds[i] }}: {{ name }}</li>
                          }
                        </ul>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <div class="btn-row" style="margin-top: 1.5rem;">
              @if (frequencies().length === 0) {
                <button class="btn btn-primary" (click)="confirmContradiction()" [disabled]="isLoading()" id="confirm-contradiction-btn">
                  @if (isLoading()) {
                    <span class="spinner" role="status" aria-hidden="true"></span> Sampling...
                  } @else {
                    Approve & Sample Principles
                  }
                </button>
                <button class="btn btn-secondary" (click)="regenerateContradiction()" [disabled]="isLoading()">Regenerate</button>
              } @else {
                <button class="btn btn-primary" (click)="generateMorphologicalBoxCall()" [disabled]="isLoading()" id="go-to-morph-btn">
                  @if (isLoading()) {
                    <span class="spinner" role="status" aria-hidden="true"></span> Decomposing...
                  } @else {
                    Continue to Morphological Analysis
                  }
                </button>
                <button class="btn btn-secondary" (click)="resampleTriplets()" [disabled]="isLoading()">Re-sample Principles</button>
                <button class="btn btn-secondary" (click)="regenerateContradiction()" [disabled]="isLoading()">Regenerate Contradiction</button>
              }
            </div>
          }
        </section>
      }

      <!-- Step 4: Morphological Box Analysis -->
      @if (currentStep() === 4) {
        <section class="card step-panel" aria-label="Morphological box analysis">
          <h2>Step 4: Morphological Box Analysis</h2>
          <p class="text-muted">The problem is decomposed into 5 distinct solution dimensions. Synonyms have been expanded, duplicates and constraints applied, and 3 distinct design pathways (combinations) have been sampled.</p>
          
          @if (morphBox().length > 0) {
            <div class="candidate-card" style="margin-top: 1.5rem;">
              <h3>Sampled Design Pathways (Combinations)</h3>
              <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1rem;">Select a combination path below to highlight the active design choice for each dimension in the matrix.</p>
              
              <div class="combo-tabs">
                @for (combo of morphCombinations(); track $index; let i = $index) {
                  <button 
                    class="btn"
                    [class.btn-primary]="selectedComboIndex() === i"
                    [class.btn-secondary]="selectedComboIndex() !== i"
                    (click)="selectedComboIndex.set(i)">
                    Combination Path {{ i + 1 }}
                  </button>
                }
              </div>
            </div>

            <!-- Morphological Matrix -->
            <div class="morph-matrix">
              @for (dim of morphBox(); track dim.id) {
                <div class="morph-row">
                  <div class="morph-dim-label">
                    {{ dim.label }}
                  </div>
                  <div class="morph-variants">
                    @for (variant of dim.variants; track variant) {
                      <span 
                        class="morph-variant-tag"
                        [class.active-variant]="morphCombinations()[selectedComboIndex()]?.[dim.id] === variant">
                        {{ variant.split('_').join(' ') }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>

            <div class="btn-row" style="margin-top: 2rem;">
              <button class="btn btn-primary" (click)="generateCandidates()" [disabled]="isLoading()" id="generate-candidates-btn">
                @if (isLoading()) {
                  <span class="spinner" role="status" aria-hidden="true"></span> Generating...
                } @else {
                  Generate Candidates (TRIZ + Morphological)
                }
              </button>
              <button class="btn btn-secondary" (click)="resampleMorphCombinations()" [disabled]="isLoading()">Re-sample Combinations</button>
            </div>
          } @else {
            <p>No morphological box generated yet.</p>
            <div class="btn-row">
              <button class="btn btn-primary" (click)="generateMorphologicalBoxCall()" [disabled]="isLoading()">
                @if (isLoading()) { <span class="spinner"></span> Generating... } @else { Generate Morphological Box }
              </button>
            </div>
          }
        </section>
      }

      <!-- Step 5: Candidates Review -->
      @if (currentStep() === 5) {
        <section class="card step-panel" aria-label="Candidates review">
          <h2>Step 5: Candidate Solutions</h2>
          <p class="text-muted">Review all generated candidates: 3 based on TRIZ Inventive Principles, and 3 based on Morphological Analysis combinations.</p>
          <div class="candidates-grid">
            @for (c of candidates(); track c.id) {
              <article class="candidate-card" [style.border-left]="c.source === 'MORPHOLOGICAL' ? '4px solid var(--accent-secondary, #8b5cf6)' : '4px solid var(--accent-primary, #6366f1)'">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <h3 style="margin: 0;">{{ c.title }}</h3>
                  <span class="param-tag" [class.tag-positive]="c.source === 'TRIZ'" [class.tag-negative]="c.source === 'MORPHOLOGICAL'" style="font-size: 0.75rem;">
                    {{ c.source }}
                  </span>
                </div>
                
                @if (c.tldr) {
                  <p class="candidate-desc" style="font-size: 1.05rem; color: var(--text-color);">{{ c.tldr }}</p>
                } @else {
                  <p class="candidate-desc" style="font-size: 1.05rem; color: var(--text-color);">{{ c.description.substring(0, 120) }}...</p>
                }
                
                @if (expandedCandidates()[c.id]) {
                  <div class="expanded-content" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); animation: fadeIn 0.3s ease-out;">
                    <div class="expanded-desc-box">
                      <div class="candidate-desc-expanded" [innerHTML]="c.description"></div>
                    </div>
                  </div>
                }
                
                <button class="btn btn-secondary" (click)="toggleCandidate(c.id)" style="margin-top: 1rem; width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem; background: transparent; border: 1px dashed var(--border-color);">
                  @if (expandedCandidates()[c.id]) {
                    <span>Collapse Details</span>
                    <span aria-hidden="true">↑</span>
                  } @else {
                    <span>Expand Details</span>
                    <span aria-hidden="true">↓</span>
                  }
                </button>
              </article>
            }
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" (click)="evaluateCandidates()" [disabled]="isLoading()" id="evaluate-btn">
              @if (isLoading()) {
                <span class="spinner" role="status" aria-hidden="true"></span> Evaluating...
              } @else {
                Evaluate All
              }
            </button>
          </div>
        </section>
      }

      <!-- Step 6: Evaluation & Selection -->
      @if (currentStep() === 6) {
        <section class="card step-panel" aria-label="Evaluation and selection">
          <h2>Step 6: Evaluation & Selection</h2>
          @if (scoreboard().length > 0) {
            <table class="eval-table" aria-label="Candidate evaluation scores">
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  @if (kpis().length > 0) {
                    @for (kpi of kpis(); track kpi.name) {
                      <th scope="col">{{ kpi.name }}</th>
                    }
                  } @else {
                    <th scope="col">Overall Quality</th>
                  }
                  <th scope="col">Weighted Score</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of scoreboard(); track entry.candidateId; let i = $index) {
                  <tr 
                    [class.winner-row]="selectedWinnerId() === entry.candidateId"
                    [class.selectable-row]="!entry.isDisqualified"
                    (click)="!entry.isDisqualified && selectedWinnerId.set(entry.candidateId)"
                    [style.cursor]="entry.isDisqualified ? 'not-allowed' : 'pointer'"
                  >
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        @if (selectedWinnerId() === entry.candidateId) {
                          <span style="color: var(--accent-success, #10b981); font-weight: bold; font-size: 1.1rem;">✓</span>
                        }
                        <span>{{ entry.title }}</span>
                      </div>
                      @if (entry.isDisqualified) {
                        <br><span style="color: var(--accent-danger, #ef4444); font-size: 0.8em; font-weight: bold;">DISQUALIFIED</span>
                        <br><span style="color: var(--accent-danger, #ef4444); font-size: 0.75em;">{{ entry.disqualReason }}</span>
                      }
                    </td>
                    
                    @if (entry.isDisqualified) {
                      @if (kpis().length > 0) {
                        @for (kpi of kpis(); track kpi.name) {
                          <td style="color: var(--text-muted);">-</td>
                        }
                      } @else {
                        <td style="color: var(--text-muted);">-</td>
                      }
                    } @else {
                      @if (kpis().length > 0) {
                        @for (kpi of kpis(); track kpi.name) {
                          <td>{{ entry.scores[kpi.name] || '-' }}/10</td>
                        }
                      } @else {
                        <td>{{ entry.scores['Overall Quality'] || '-' }}/10</td>
                      }
                    }
                    
                    <td class="score-cell" [style.color]="entry.isDisqualified ? 'var(--text-muted)' : ''">{{ entry.weightedScore }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="btn-row">
              <button class="btn btn-primary" (click)="selectWinner()" [disabled]="isLoading()" id="select-winner-btn">
                @if (isLoading()) {
                  <span class="spinner" role="status" aria-hidden="true"></span> Finalizing...
                } @else {
                  Select Winner & Generate Report
                }
              </button>
            </div>
          }
        </section>
      }

      <!-- Step 7: Final Report -->
      @if (currentStep() === 7) {
        <section class="card step-panel" aria-label="Final report">
          <h2>Step 7: Final Report — Reasoning Trail</h2>
          @if (selection()) {
            <div class="winner-banner">
              <h3>🏆 Winner: {{ selection()!.winner.title }}</h3>
              <div [innerHTML]="selection()!.winner.description" class="candidate-desc-expanded" style="margin-top: var(--spacing-sm);"></div>
            </div>
            <details class="reasoning-details">
              <summary>Full Reasoning Trail</summary>
              <pre class="reasoning-pre">{{ selection()!.reasoning }}</pre>
            </details>
          }
        </section>
      }

      <!-- Live region for screen readers -->
      <div
        aria-live="polite"
        aria-atomic="true"
        class="sr-only"
        id="triz-announcement">
        {{ announcement() }}
      </div>
    </section>
  `,
  styles: [`
    .stepper {
      display: flex;
      gap: var(--spacing-xs);
      margin: var(--spacing-lg) 0;
      flex-wrap: wrap;
    }
    .step-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-full);
      background: var(--bg-card);
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .step-btn:hover:not(:disabled) { border-color: var(--accent-primary); color: var(--text-primary); }
    .step-btn.active { border-color: var(--accent-primary); color: var(--accent-primary); background: rgba(99, 102, 241, 0.1); }
    .step-btn.completed { border-color: var(--accent-success); color: var(--accent-success); }
    .step-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .step-number { font-weight: var(--font-weight-bold); }
    .step-panel { margin-top: var(--spacing-md); }

    .contradiction-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--spacing-md); margin-bottom: var(--spacing-lg); }
    @media (max-width: 768px) { .contradiction-grid { grid-template-columns: 1fr; } }
    .if-card, .then-card, .but-card {
      padding: var(--spacing-md);
      border-radius: var(--border-radius-md);
      border: 1px solid var(--border-color);
    }
    .if-card { background: rgba(107, 114, 128, 0.1); border-color: rgba(107, 114, 128, 0.3); }
    .then-card { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.3); }
    .but-card { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.3); }
    .if-card h3 { color: var(--text-muted); }
    .then-card h3 { color: var(--accent-success); }
    .but-card h3 { color: var(--accent-error, #ef4444); }

    .param-list { list-style: none; padding: 0; margin-top: var(--spacing-sm); display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }
    .param-tag {
      display: inline-block;
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius-full);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
    }
    .tag-positive { background: rgba(16, 185, 129, 0.15); color: var(--accent-success); }
    .tag-negative { background: rgba(239, 68, 68, 0.15); color: var(--accent-error, #ef4444); }

    .btn-row { display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg); }

    .freq-bar-section { margin-bottom: var(--spacing-lg); }
    .freq-bars { display: flex; flex-direction: column; gap: var(--spacing-xs); }
    .freq-row { display: flex; align-items: center; gap: var(--spacing-sm); }
    .freq-label { min-width: 240px; font-size: var(--font-size-sm); }
    .freq-bar {
      height: 20px;
      background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary, #8b5cf6));
      border-radius: var(--border-radius-sm);
      min-width: 4px;
      transition: width 0.3s ease;
    }
    .freq-count { font-size: var(--font-size-xs); color: var(--text-muted); min-width: 30px; }

    .triplets-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md); margin-bottom: var(--spacing-md); }
    @media (max-width: 768px) { .triplets-grid { grid-template-columns: 1fr; } }
    .triplet-card {
      padding: var(--spacing-md);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      background: var(--bg-input);
    }
    .principle-list { list-style: none; padding: 0; margin: var(--spacing-sm) 0 0; display: flex; flex-direction: column; gap: var(--spacing-xs); }
    .principle-tag {
      padding: var(--spacing-xs) var(--spacing-sm);
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-sm);
    }

    .candidates-grid { display: flex; flex-direction: column; gap: var(--spacing-md); }
    .candidate-card {
      padding: var(--spacing-lg);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      background: var(--bg-input);
    }
    .candidate-desc { margin: var(--spacing-sm) 0; line-height: var(--line-height-relaxed); }
    .expanded-desc-box {
      background: rgba(255, 255, 255, 0.03);
      padding: var(--spacing-md);
      border-radius: var(--border-radius-md);
      border-left: 3px solid var(--accent-primary);
    }
    .candidate-desc-expanded {
      margin: 0;
      line-height: 1.8;
      font-size: 1rem;
      color: var(--text-color);
      font-weight: 300;
      letter-spacing: 0.2px;
      text-align: justify;
    }
    /* Style innerHTML tags using ::ng-deep due to Angular View Encapsulation */
    ::ng-deep .candidate-desc-expanded p { margin-top: 0; margin-bottom: var(--spacing-sm); }
    ::ng-deep .candidate-desc-expanded p:last-child { margin-bottom: 0; }
    ::ng-deep .candidate-desc-expanded ul { 
      margin-top: 0; 
      margin-bottom: var(--spacing-sm); 
      padding-left: 1.5rem; /* Tweak this value to move bullets/text left or right */
    }
    ::ng-deep .candidate-desc-expanded ul:last-child { margin-bottom: 0; }
    ::ng-deep .candidate-desc-expanded li { margin-bottom: var(--spacing-xs); }
    ::ng-deep .candidate-desc-expanded strong { color: var(--accent-primary); font-weight: 500; }
    .applied-rules { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--spacing-sm); }

    .eval-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: var(--spacing-lg);
    }
    .eval-table th, .eval-table td {
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-color);
      font-size: var(--font-size-sm);
    }
    .eval-table th { color: var(--text-muted); font-weight: var(--font-weight-medium); }
    .winner-row { background: rgba(16, 185, 129, 0.12) !important; }
    .selectable-row:hover { background: rgba(255, 255, 255, 0.03); }
    .score-cell { font-weight: var(--font-weight-bold); color: var(--accent-primary); }

    .winner-banner {
      padding: var(--spacing-lg);
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
      border: 1px solid var(--accent-success);
      border-radius: var(--border-radius-md);
      margin-bottom: var(--spacing-lg);
    }
    .winner-banner h3 { color: var(--accent-success); margin-bottom: var(--spacing-sm); }

    .reasoning-details { margin-top: var(--spacing-md); }
    .reasoning-details summary { cursor: pointer; font-weight: var(--font-weight-semibold); padding: var(--spacing-sm) 0; }
    .reasoning-pre {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-md);
      white-space: pre-wrap;
      word-break: break-word;
      font-size: var(--font-size-sm);
      line-height: var(--line-height-relaxed);
      max-height: 600px;
      overflow-y: auto;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    .form-input {
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      background: var(--bg-input);
      color: var(--text-primary);
      font-size: var(--font-size-base);
    }

    .morph-matrix {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-lg);
    }
    .morph-row {
      display: grid;
      grid-template-columns: 220px 1fr;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md) 0;
      border-bottom: 1px solid var(--border-color);
    }
    @media (max-width: 768px) {
      .morph-row {
        grid-template-columns: 1fr;
        gap: var(--spacing-xs);
      }
    }
    .morph-dim-label {
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      font-size: var(--font-size-sm);
    }
    .morph-variants {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
    }
    .morph-variant-tag {
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-full);
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      transition: all 0.2s ease;
      text-transform: capitalize;
    }
    .morph-variant-tag.active-variant {
      background: rgba(99, 102, 241, 0.15);
      border-color: var(--accent-primary);
      color: var(--accent-primary);
      font-weight: var(--font-weight-semibold);
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.15);
    }
    .combo-tabs {
      display: flex;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
    }
  `],
})
export class TrizSolverComponent {
  private readonly trizApi = inject(TrizApiService);

  // ─── Form state ─────────────────────────────────────────────────
  projectTitle = '';
  problemDescription = '';
  sdgInput = '7';

  // ─── Pipeline state (signals) ───────────────────────────────────
  currentStep = signal(1);
  highestStepReached = signal(1);
  isLoading = signal(false);
  announcement = signal('');

  project = signal<TrizProject | null>(null);
  constraints = signal<string[]>([]);
  kpis = signal<KpiDto[]>([]);
  modifyPrompt = signal('');

  contradiction = signal<ContradictionResult | null>(null);
  frequencies = signal<PrincipleFrequency[]>([]);
  triplets = signal<SampledTriplet[]>([]);
  candidates = signal<TrizCandidate[]>([]);
  scoreboard = signal<ScoreboardEntry[]>([]);
  selection = signal<SelectionResult | null>(null);

  morphBox = signal<any[]>([]);
  morphCombinations = signal<any[]>([]);
  selectedComboIndex = signal<number>(0);
  expandedCandidates = signal<Record<string, boolean>>({});
  selectedWinnerId = signal<string | null>(null);

  maxFrequency = computed(() => {
    const freqs = this.frequencies();
    return freqs.length > 0 ? Math.max(...freqs.map((f) => f.frequency)) : 1;
  });

  steps = [
    { id: 1, label: 'Problem' },
    { id: 2, label: 'Plan' },
    { id: 3, label: 'Triz Contradiction' },
    { id: 4, label: 'Morphological Analysis' },
    { id: 5, label: 'R&D Candidates' },
    { id: 6, label: 'Evaluation' },
    { id: 7, label: 'Report' },
  ];

  goToStep(stepId: number): void {
    this.currentStep.set(stepId);
    this.highestStepReached.update(max => Math.max(max, stepId));
  }

  // ─── Step 1: Create Project ─────────────────────────────────────

  createProject(event: Event): void {
    event.preventDefault();
    if (!this.projectTitle.trim() || !this.problemDescription.trim()) return;

    this.isLoading.set(true);
    this.announcement.set('Creating project...');

    const sdgs = this.sdgInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    this.trizApi
      .createProject(this.projectTitle, this.problemDescription, sdgs)
      .subscribe({
        next: (res) => {
          this.project.set(res.data);
          this.analyzeConstraintsCall(res.data.id);
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error creating project.');
        },
      });
  }

  // ─── Step 1.5: Analyze & Edit Constraints / KPIs ────────────────

  analyzeConstraintsCall(projectId: string): void {
    this.announcement.set('Analyzing problem to extract Constraints and KPIs...');
    this.trizApi
      .analyzeConstraints(projectId)
      .subscribe({
        next: (res) => {
          this.constraints.set(res.data.constraints);
          this.kpis.set(res.data.kpis);
          this.goToStep(2);
          this.isLoading.set(false);
          this.announcement.set('Constraints and KPIs extracted. Please review.');
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error extracting constraints.');
        },
      });
  }

  addConstraint(): void {
    this.constraints.update(c => [...c, '']);
  }

  removeConstraint(index: number): void {
    this.constraints.update(c => {
      const copy = [...c];
      copy.splice(index, 1);
      return copy;
    });
  }

  updateConstraint(index: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.constraints.update(c => {
      const copy = [...c];
      copy[index] = val;
      return copy;
    });
  }

  addKpi(): void {
    this.kpis.update(k => [...k, { name: '', weight: 0.1 }]);
  }

  removeKpi(index: number): void {
    this.kpis.update(k => {
      const copy = [...k];
      copy.splice(index, 1);
      return copy;
    });
  }

  updateKpiName(index: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.kpis.update(k => {
      const copy = [...k];
      copy[index] = { ...copy[index], name: val };
      return copy;
    });
  }

  updateKpiWeight(index: number, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.kpis.update(k => {
      const copy = [...k];
      copy[index] = { ...copy[index], weight: val || 0 };
      return copy;
    });
  }

  normalizeKpiWeights(): void {
    this.kpis.update(kpis => {
      const copy = [...kpis];
      const total = copy.reduce((sum, k) => sum + k.weight, 0);
      if (total > 0) {
        return copy.map(k => ({ ...k, weight: Math.round((k.weight / total) * 100) / 100 }));
      }
      return copy;
    });
  }

  acceptConstraints(): void {
    const proj = this.project();
    if (!proj) return;
    
    this.isLoading.set(true);
    this.normalizeKpiWeights();
    
    this.trizApi
      .updateConstraints(proj.id, this.constraints().filter(c => c.trim() !== ''), this.kpis().filter(k => k.name.trim() !== ''))
      .subscribe({
        next: () => {
          this.generateContradictionCall(proj.id);
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error saving constraints.');
        },
      });
  }

  modifyConstraintsWithAI(): void {
    const proj = this.project();
    const prompt = this.modifyPrompt();
    if (!proj || !prompt.trim()) return;
    
    this.isLoading.set(true);
    this.announcement.set('Modifying constraints and KPIs via AI...');
    
    this.trizApi
      .modifyConstraints(proj.id, prompt)
      .subscribe({
        next: (res) => {
          this.constraints.set(res.data.constraints);
          this.kpis.set(res.data.kpis);
          this.modifyPrompt.set('');
          this.isLoading.set(false);
          this.announcement.set('Constraints and KPIs updated by AI.');
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error modifying constraints via AI.');
        },
      });
  }

  rejectConstraints(): void {
    this.currentStep.set(1);
    this.announcement.set('Returned to problem definition.');
  }

  // ─── Step 2: Generate / Regenerate Contradiction ────────────────

  toggleCandidate(id: string): void {
    this.expandedCandidates.update((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  private generateContradictionCall(projectId: string): void {
    this.trizApi
      .generateContradiction(projectId)
      .subscribe({
        next: (res) => {
          this.contradiction.set(res.data);
          this.goToStep(3);
          this.isLoading.set(false);
          this.announcement.set('Contradiction identified. Review the parameters.');
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error generating contradiction.');
        },
      });
  }

  regenerateContradiction(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.frequencies.set([]);
    this.triplets.set([]);
    this.generateContradictionCall(proj.id);
  }

  // ─── Step 3: Confirm & Sample ───────────────────────────────────

  confirmContradiction(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.announcement.set('Running matrix lookup and sampling principles...');

    this.trizApi
      .confirmContradiction(proj.id)
      .subscribe({
        next: (res) => {
          this.frequencies.set(res.data.frequencies);
          this.triplets.set(res.data.triplets);
          this.goToStep(3);
          this.isLoading.set(false);
          this.announcement.set('Principle triplets sampled. Review them.');
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error sampling principles.');
        },
      });
  }

  resampleTriplets(): void {
    this.confirmContradiction();
  }

  // ─── Step 4: Morphological Analysis ─────────────────────────────

  generateMorphologicalBoxCall(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.announcement.set('Decomposing design space for Morphological Analysis...');

    this.trizApi
      .generateMorphologicalBox(proj.id)
      .subscribe({
        next: (res) => {
          this.morphBox.set(res.data.dimensions);
          this.morphCombinations.set(res.data.combinations);
          this.selectedComboIndex.set(0);
          this.goToStep(4);
          this.isLoading.set(false);
          this.announcement.set('Morphological analysis complete. Review matrix.');
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error generating morphological box.');
        },
      });
  }

  resampleMorphCombinations(): void {
    this.generateMorphologicalBoxCall();
  }

  // ─── Step 5: Generate Candidates (TRIZ + Morphological) ─────────

  generateCandidates(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.announcement.set('Generating candidate solutions using TRIZ principles and Morphological Analysis...');

    this.trizApi
      .generateCandidates(proj.id)
      .subscribe({
        next: (res) => {
          const all = [
            ...res.data.trizCandidates,
            ...res.data.morphologicalCandidates,
          ];
          this.candidates.set(all);
          this.goToStep(5);
          this.isLoading.set(false);
          this.announcement.set(`${all.length} candidates generated (TRIZ + Morphological).`);
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error generating candidates.');
        },
      });
  }

  // ─── Step 6: Evaluate ───────────────────────────────────────────

  evaluateCandidates(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.announcement.set('Evaluating candidates...');

    this.trizApi
      .evaluateCandidates(proj.id)
      .subscribe({
        next: (res) => {
          this.scoreboard.set(res.data.scoreboard);
          // Set default winner to the highest scoring non-disqualified candidate
          const firstNonDisqualified = res.data.scoreboard.find((entry: any) => !entry.isDisqualified);
          if (firstNonDisqualified) {
            this.selectedWinnerId.set(firstNonDisqualified.candidateId);
          }
          this.goToStep(6);
          this.isLoading.set(false);
          this.announcement.set('Evaluation complete. Review the scoreboard.');
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error evaluating candidates.');
        },
      });
  }

  // ─── Step 7: Select Winner ──────────────────────────────────────

  selectWinner(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.announcement.set('Selecting winner and generating report...');

    this.trizApi
      .selectWinner(proj.id, this.selectedWinnerId())
      .subscribe({
        next: (res) => {
          this.selection.set(res.data);
          this.goToStep(7);
          this.isLoading.set(false);
          this.announcement.set('Report generated. The winner has been selected.');
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error selecting winner.');
        },
      });
  }

  // ─── Helpers ────────────────────────────────────────────────────

  extractPart(ifThenBut: string, part: 'IF' | 'THEN' | 'BUT'): string {
    const regex = new RegExp(`${part}:\\s*(.+?)(?=\\s*(?:THEN|BUT|$))`, 'is');
    const match = ifThenBut.match(regex);
    return match?.[1]?.trim() ?? ifThenBut;
  }
}
