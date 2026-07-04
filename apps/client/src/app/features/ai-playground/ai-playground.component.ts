import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { LlmCompletionResponse, LlmProviderType } from '@libs/shared';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-ai-playground',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MagneticDirective, TiltDirective, ScrollRevealDirective],
  template: `
    <section aria-labelledby="playground-heading" class="animate-fade-in" appScrollReveal appScrollRevealType="fade-in">
      <div class="text-reveal-mask">
        <h1 id="playground-heading">AI Playground</h1>
      </div>
      <p>Test LLM prompts with structured outputs, guardrails, and real-time cost tracking.</p>

      <div class="playground-grid" appScrollReveal appScrollRevealChildren=".card" [appScrollRevealDelay]="100">
        <!-- Input Panel -->
        <section aria-label="Prompt input" class="card" appTilt [appTiltMax]="4">
          <h2>Prompt</h2>
          <form (submit)="sendPrompt($event)" class="prompt-form">
            <div class="form-group">
              <label for="system-prompt" class="form-label">System Prompt</label>
              <textarea
                id="system-prompt"
                class="form-textarea"
                [(ngModel)]="systemPrompt"
                name="systemPrompt"
                placeholder="You are an expert data analyst..."
                rows="3"
                aria-describedby="system-prompt-hint">
              </textarea>
              <small id="system-prompt-hint" class="text-muted">
                Define the AI's role and behavior constraints.
              </small>
            </div>

            <div class="form-group">
              <label for="user-prompt" class="form-label">User Prompt *</label>
              <textarea
                id="user-prompt"
                class="form-textarea"
                [(ngModel)]="userPrompt"
                name="userPrompt"
                placeholder="Analyze this data and extract..."
                rows="5"
                required
                aria-required="true"
                aria-describedby="user-prompt-hint">
              </textarea>
              <small id="user-prompt-hint" class="text-muted">
                Your instruction to the AI model.
              </small>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="provider-select" class="form-label">Provider</label>
                <select
                  id="provider-select"
                  class="form-select"
                  [(ngModel)]="provider"
                  name="provider"
                  aria-label="Select LLM provider">
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="gemini">Google (Gemini)</option>
                </select>
              </div>

              <div class="form-group">
                <label for="schema-select" class="form-label">Output Schema</label>
                <select
                  id="schema-select"
                  class="form-select"
                  [(ngModel)]="outputSchema"
                  name="outputSchema"
                  aria-label="Select structured output schema">
                  <option value="">None (free text)</option>
                  <option value="entityExtraction">Entity Extraction</option>
                  <option value="sentimentAnalysis">Sentiment Analysis</option>
                  <option value="classification">Classification</option>
                  <option value="documentExtraction">Document Extraction</option>
                  <option value="actionItems">Action Items</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primary submit-btn"
              [disabled]="isLoading()"
              id="send-prompt-btn"
              aria-label="Send prompt to AI"
              appMagnetic
              [appMagneticStrength]="0.2">
              @if (isLoading()) {
                <span class="spinner" role="status" aria-hidden="true"></span>
                <span>Processing...</span>
              } @else {
                <span>Send Prompt</span>
              }
            </button>
          </form>
        </section>

        <!-- Output Panel -->
        <section aria-label="AI response" class="card output-panel" appTilt [appTiltMax]="4">
          <h2>Response</h2>

          <!-- Live Region for screen readers -->
          <div
            aria-live="polite"
            aria-atomic="true"
            class="sr-only"
            id="response-announcement">
            {{ isLoading() ? 'Processing your prompt...' : responseAnnouncement() }}
          </div>

          @if (isLoading()) {
            <div class="loading-state" role="status">
              <div class="spinner-large" aria-hidden="true"></div>
              <p>Analyzing with {{ provider }}...</p>
              <p class="text-muted" aria-hidden="true">Applying guardrails and validation</p>
            </div>
          } @else if (response()) {
            <div class="response-content">
              <!-- Guardrail Status -->
              <div class="guardrail-status" [class.flagged]="response()!.flaggedForReview">
                @if (response()!.flaggedForReview) {
                  <span class="status-badge badge-warning" role="alert">
                    ⚠️ Flagged for Review (confidence: {{ (response()!.confidence || 0) * 100 | number:'1.0-0' }}%)
                  </span>
                } @else {
                  <span class="status-badge badge-success">
                    ✅ Passed Guardrails (confidence: {{ (response()!.confidence || 0) * 100 | number:'1.0-0' }}%)
                  </span>
                }
              </div>

              <!-- Response Text -->
              <div class="response-text">
                <h3>Output</h3>
                <pre class="code-block"><code>{{ response()!.content }}</code></pre>
              </div>

              <!-- Structured Output -->
              @if (response()!.structuredOutput) {
                <div class="structured-output">
                  <h3>Structured Output (Validated)</h3>
                  <pre class="code-block"><code>{{ response()!.structuredOutput | json }}</code></pre>
                </div>
              }

              <!-- Usage Metrics -->
              <div class="usage-metrics">
                <h3>Usage &amp; Cost</h3>
                <dl class="metrics-list">
                  <div class="metric-pair">
                    <dt>Provider</dt>
                    <dd>{{ response()!.provider }}</dd>
                  </div>
                  <div class="metric-pair">
                    <dt>Tokens</dt>
                    <dd>{{ response()!.usage.totalTokens }}</dd>
                  </div>
                  <div class="metric-pair">
                    <dt>Cost</dt>
                    <dd>$ {{ response()!.usage.costUsd }}</dd>
                  </div>
                  <div class="metric-pair">
                    <dt>Latency</dt>
                    <dd>{{ response()!.usage.latencyMs }}ms</dd>
                  </div>
                  <div class="metric-pair">
                    <dt>Cached</dt>
                    <dd>{{ response()!.cached ? 'Yes ✅' : 'No' }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          } @else {
            <div class="empty-state">
              <p class="text-muted">Send a prompt to see the AI response here.</p>
            </div>
          }
        </section>
      </div>
    </section>
  `,
  styles: [`
    .playground-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);
      margin-top: var(--spacing-lg);
    }
    @media (max-width: 900px) {
      .playground-grid { grid-template-columns: 1fr; }
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
    }
    .submit-btn {
      width: 100%;
      padding: var(--spacing-md);
      font-size: var(--font-size-base);
    }
    .spinner, .spinner-large {
      display: inline-block;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    .spinner { width: 16px; height: 16px; }
    .spinner-large { width: 40px; height: 40px; border-width: 3px; }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-2xl);
    }
    .code-block {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-md);
      overflow-x: auto;
      font-size: var(--font-size-sm);
      line-height: var(--line-height-relaxed);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .guardrail-status { margin-bottom: var(--spacing-md); }
    .status-badge {
      display: inline-block;
      padding: var(--spacing-xs) var(--spacing-md);
      border-radius: var(--border-radius-full);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
    }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: var(--accent-success); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: var(--accent-warning); }
    .metrics-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--spacing-sm);
    }
    .metric-pair {
      background: var(--bg-input);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius-md);
    }
    .metric-pair dt {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }
    .metric-pair dd {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      margin: 0;
    }
    .empty-state { padding: var(--spacing-2xl); text-align: center; }
    .response-content { display: flex; flex-direction: column; gap: var(--spacing-lg); }
    .response-text, .structured-output, .usage-metrics { margin-top: 0; }
  `],
})
export class AiPlaygroundComponent {
  userPrompt = '';
  systemPrompt = '';
  provider = 'openai';
  outputSchema = '';

  isLoading = signal(false);
  response = signal<LlmCompletionResponse | null>(null);
  responseAnnouncement = signal('');

  private readonly http = inject(HttpClient);

  sendPrompt(event: Event): void {
    event.preventDefault();
    if (!this.userPrompt.trim() || this.isLoading()) return;

    this.isLoading.set(true);
    this.response.set(null);
    this.responseAnnouncement.set('Processing your prompt...');

    const body: Record<string, unknown> = {
      prompt: this.userPrompt,
      provider: this.provider,
    };
    if (this.systemPrompt) body['systemPrompt'] = this.systemPrompt;
    if (this.outputSchema) body['outputSchemaName'] = this.outputSchema;

    this.http.post<{ data: LlmCompletionResponse }>('/api/llm/complete', body).subscribe({
      next: (res) => {
        this.response.set(res.data);
        this.isLoading.set(false);
        this.responseAnnouncement.set('AI response received successfully.');
      },
      error: (err) => {
        this.response.set({
          content: `Error: ${err.error?.errors?.[0]?.message || err.message || 'Unknown error'}`,
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, latencyMs: 0, timestamp: new Date() },
          provider: this.provider as LlmProviderType,
          model: 'error',
          confidence: 0,
          flaggedForReview: true,
          cached: false,
        });
        this.isLoading.set(false);
        this.responseAnnouncement.set('Error receiving AI response.');
      },
    });
  }
}
