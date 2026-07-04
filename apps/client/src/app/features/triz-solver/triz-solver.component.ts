import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// ─── Interfaces ─────────────────────────────────────────────────────

interface KpiDto {
  name: string;
  weight: number;
}

interface TrizProject {
  id: string;
  title: string;
  description: string;
  targetSdgs: string;
  constraints?: string;
  kpis?: string;
  status: string;
}

interface ContradictionResult {
  improvingIds: number[];
  improvingNames: string[];
  worseningIds: number[];
  worseningNames: string[];
  ifThenButText: string;
}

interface PrincipleFrequency {
  principleId: number;
  name: string;
  description: string;
  frequency: number;
}

interface SampledTriplet {
  index: number;
  principleIds: number[];
  principleNames: string[];
}

interface TrizCandidate {
  id: string;
  title: string;
  description: string;
  appliedRules: string;
  source?: 'TRIZ' | 'MORPHOLOGICAL';
  isDisqualified?: boolean;
  disqualReason?: string;
}

interface ScoreboardEntry {
  candidateId: string;
  title: string;
  isDisqualified?: boolean;
  disqualReason?: string;
  scores: Record<string, number>;
  weightedScore: number;
}

interface SelectionResult {
  winner: TrizCandidate;
  reasoning: string;
}

// ─── Component ──────────────────────────────────────────────────────

@Component({
  selector: 'app-triz-solver',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section aria-labelledby="triz-heading" class="animate-fade-in">
      <div class="text-reveal-mask">
        <h1 id="triz-heading">TRIZ R&D Innovation Solver</h1>
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

      <!-- Step 1.5: Constraints & KPIs Review -->
      @if (currentStep() === 1.5) {
        <section class="card step-panel" aria-label="Constraints and KPIs">
          <h2>Step 1.5: Constraints & KPIs</h2>
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

      <!-- Step 2: Contradiction Review -->
      @if (currentStep() === 2) {
        <section class="card step-panel" aria-label="Contradiction review">
          <h2>Step 2: Technical Contradiction (IF-THEN-BUT)</h2>
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
            <div class="btn-row">
              <button class="btn btn-primary" (click)="confirmContradiction()" [disabled]="isLoading()" id="confirm-contradiction-btn">
                @if (isLoading()) {
                  <span class="spinner" role="status" aria-hidden="true"></span> Sampling...
                } @else {
                  Approve & Sample Principles
                }
              </button>
              <button class="btn btn-secondary" (click)="regenerateContradiction()" [disabled]="isLoading()">Regenerate</button>
            </div>
          }
        </section>
      }

      <!-- Step 3: Sampled Triplets Review -->
      @if (currentStep() === 3) {
        <section class="card step-panel" aria-label="Principles review">
          <h2>Step 3: Sampled Inventive Principle Triplets</h2>
          @if (frequencies().length > 0) {
            <div class="freq-bar-section">
              <h3>Frequency Distribution (from 9 matrix lookups)</h3>
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
          }
          @if (triplets().length > 0) {
            <div class="triplets-grid">
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
            <div class="btn-row">
              <button class="btn btn-primary" (click)="generateCandidates()" [disabled]="isLoading()" id="generate-candidates-btn">
                @if (isLoading()) {
                  <span class="spinner" role="status" aria-hidden="true"></span> Generating...
                } @else {
                  Generate Solutions
                }
              </button>
              <button class="btn btn-secondary" (click)="resampleTriplets()" [disabled]="isLoading()">Re-sample</button>
            </div>
          }
        </section>
      }

      <!-- Step 4: Candidates Review -->
      @if (currentStep() === 4) {
        <section class="card step-panel" aria-label="Candidates review">
          <h2>Step 4: Candidate Solutions</h2>
          <div class="candidates-grid">
            @for (c of candidates(); track c.id) {
              <article class="candidate-card">
                <h3>{{ c.title }}</h3>
                <p class="candidate-desc">{{ c.description }}</p>
                <div class="applied-rules">
                  <strong>Applied Principles:</strong> {{ c.appliedRules }}
                </div>
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

      <!-- Step 5: Evaluation & Selection -->
      @if (currentStep() === 5) {
        <section class="card step-panel" aria-label="Evaluation and selection">
          <h2>Step 5: Evaluation & Selection</h2>
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
                  <tr [class.winner-row]="i === 0 && !entry.isDisqualified">
                    <td>
                      {{ entry.title }}
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

      <!-- Step 6: Final Report -->
      @if (currentStep() === 6) {
        <section class="card step-panel" aria-label="Final report">
          <h2>Step 6: Final Report — Reasoning Trail</h2>
          @if (selection()) {
            <div class="winner-banner">
              <h3>🏆 Winner: {{ selection()!.winner.title }}</h3>
              <p>{{ selection()!.winner.description }}</p>
            </div>
            <details class="reasoning-details" open>
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
    .winner-row { background: rgba(16, 185, 129, 0.08); }
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
  `],
})
export class TrizSolverComponent {
  private readonly http = inject(HttpClient);

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

  maxFrequency = computed(() => {
    const freqs = this.frequencies();
    return freqs.length > 0 ? Math.max(...freqs.map((f) => f.frequency)) : 1;
  });

  steps = [
    { id: 1, label: 'Problem' },
    { id: 1.5, label: 'Constraints' },
    { id: 2, label: 'Contradiction' },
    { id: 3, label: 'Principles' },
    { id: 4, label: 'Candidates' },
    { id: 5, label: 'Evaluation' },
    { id: 6, label: 'Report' },
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

    this.http
      .post<{ data: TrizProject }>('/api/triz/project', {
        title: this.projectTitle,
        description: this.problemDescription,
        targetSdgs: sdgs,
      })
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
    this.http
      .post<{ data: { constraints: string[]; kpis: KpiDto[] } }>(
        `/api/triz/project/${projectId}/analyze-constraints`,
        {},
      )
      .subscribe({
        next: (res) => {
          this.constraints.set(res.data.constraints);
          this.kpis.set(res.data.kpis);
          this.goToStep(1.5);
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
    
    this.http
      .post<{ data: any }>(
        `/api/triz/project/${proj.id}/update-constraints`,
        { constraints: this.constraints().filter(c => c.trim() !== ''), kpis: this.kpis().filter(k => k.name.trim() !== '') }
      )
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
    
    this.http
      .post<{ data: { constraints: string[]; kpis: KpiDto[] } }>(
        `/api/triz/project/${proj.id}/modify-constraints`,
        { prompt }
      )
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

  private generateContradictionCall(projectId: string): void {
    this.http
      .post<{ data: ContradictionResult }>(
        `/api/triz/project/${projectId}/contradiction`,
        {},
      )
      .subscribe({
        next: (res) => {
          this.contradiction.set(res.data);
          this.goToStep(2);
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
    this.generateContradictionCall(proj.id);
  }

  // ─── Step 3: Confirm & Sample ───────────────────────────────────

  confirmContradiction(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.announcement.set('Running matrix lookup and sampling principles...');

    this.http
      .post<{ data: { frequencies: PrincipleFrequency[]; triplets: SampledTriplet[] } }>(
        `/api/triz/project/${proj.id}/contradiction/confirm`,
        {},
      )
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

  // ─── Step 4: Generate Candidates (TRIZ + Morphological) ─────────

  generateCandidates(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.announcement.set('Generating candidate solutions using TRIZ principles and Morphological Analysis...');

    this.http
      .post<{ data: {
        trizCandidates: TrizCandidate[];
        morphologicalCandidates: TrizCandidate[];
      } }>(
        `/api/triz/project/${proj.id}/candidates/generate`,
        {},
      )
      .subscribe({
        next: (res) => {
          const all = [
            ...res.data.trizCandidates,
            ...res.data.morphologicalCandidates,
          ];
          this.candidates.set(all);
          this.goToStep(4);
          this.isLoading.set(false);
          this.announcement.set(`${all.length} candidates generated (TRIZ + Morphological).`);
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error generating candidates.');
        },
      });
  }

  // ─── Step 5: Evaluate ───────────────────────────────────────────

  evaluateCandidates(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.announcement.set('Evaluating candidates...');

    this.http
      .post<{ data: { scoreboard: ScoreboardEntry[] } }>(
        `/api/triz/project/${proj.id}/evaluate`,
        {},
      )
      .subscribe({
        next: (res) => {
          this.scoreboard.set(res.data.scoreboard);
          this.goToStep(5);
          this.isLoading.set(false);
          this.announcement.set('Evaluation complete. Review the scoreboard.');
        },
        error: () => {
          this.isLoading.set(false);
          this.announcement.set('Error evaluating candidates.');
        },
      });
  }

  // ─── Step 6: Select Winner ──────────────────────────────────────

  selectWinner(): void {
    const proj = this.project();
    if (!proj) return;
    this.isLoading.set(true);
    this.announcement.set('Selecting winner and generating report...');

    this.http
      .post<{ data: SelectionResult }>(
        `/api/triz/project/${proj.id}/select`,
        {},
      )
      .subscribe({
        next: (res) => {
          this.selection.set(res.data);
          this.goToStep(6);
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
