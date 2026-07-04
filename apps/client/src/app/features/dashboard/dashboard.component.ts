import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

interface MetricCard {
  title: string;
  value: string;
  icon: string;
  trend: string;
  trendDirection: 'up' | 'down' | 'neutral';
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MagneticDirective, TiltDirective, CountUpDirective, ScrollRevealDirective],
  template: `
    <section aria-labelledby="dashboard-heading" class="animate-fade-in">
      <div class="text-reveal-mask">
        <h1 id="dashboard-heading">Dashboard</h1>
      </div>
      <p>Business metrics and AI usage overview.</p>

      <!-- Metrics Grid with staggered Scroll Reveal -->
      <section aria-label="Key metrics" class="metrics-grid" appScrollReveal appScrollRevealChildren=".metric-card">
        @for (card of metrics(); track card.title) {
          <article class="card metric-card" appTilt>
            <div class="metric-icon floating-ui" aria-hidden="true">{{ card.icon }}</div>
            <div class="metric-content">
              <h3 class="metric-title">{{ card.title }}</h3>
              <p class="metric-value" [appCountUp]="card.value">{{ card.value }}</p>
              <p class="metric-trend"
                 [class.trend-up]="card.trendDirection === 'up'"
                 [class.trend-down]="card.trendDirection === 'down'">
                {{ card.trend }}
              </p>
            </div>
          </article>
        }
      </section>

      <!-- Quick Actions with staggered Scroll Reveal -->
      <section aria-label="Quick actions" class="mt-lg">
        <h2>Quick Actions</h2>
        <div class="actions-grid" appScrollReveal appScrollRevealChildren=".action-card" [appScrollRevealDelay]="150">
          <a routerLink="/ai-playground" class="card action-card" id="action-playground" appTilt>
            <span class="action-icon floating-ui" aria-hidden="true">🤖</span>
            <h3>AI Playground</h3>
            <p>Test LLM prompts and structured outputs</p>
          </a>
          <a routerLink="/settings" class="card action-card" id="action-settings" appTilt>
            <span class="action-icon floating-ui-delay-1" aria-hidden="true">⚙️</span>
            <h3>Settings</h3>
            <p>Configure providers and business model</p>
          </a>
        </div>
      </section>

      <!-- Status -->
      <section aria-label="System status" class="mt-lg">
        <h2>System Status</h2>
        <div class="status-bar card" appScrollReveal appScrollRevealType="scale-up" [appScrollRevealDelay]="300">
          <span class="status-dot" aria-hidden="true"></span>
          <span>API: <strong class="text-success">Online</strong></span>
          <span class="text-muted">&middot;</span>
          <span>LLM Provider: <strong>{{ activeProvider() }}</strong></span>
        </div>
      </section>
    </section>
  `,
  styles: [`
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--spacing-md);
      margin-top: var(--spacing-lg);
    }
    .metric-card {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
    }
    .metric-icon { font-size: 2rem; }
    .metric-title {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }
    .metric-value {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
      margin-bottom: var(--spacing-xs);
    }
    .metric-trend { font-size: var(--font-size-xs); margin-bottom: 0; }
    .trend-up { color: var(--accent-success); }
    .trend-down { color: var(--accent-danger); }
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-md);
      margin-top: var(--spacing-md);
    }
    .action-card {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      text-decoration: none;
      color: inherit;
    }
    .action-icon { font-size: 2rem; }
    .action-card h3 { margin-bottom: 0; }
    .action-card p { color: var(--text-muted); margin-bottom: 0; font-size: var(--font-size-sm); }
    .status-bar {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      font-size: var(--font-size-sm);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-success);
      animation: pulse 2s infinite;
    }
  `],
})
export class DashboardComponent implements OnInit {
  metrics = signal<MetricCard[]>([
    { title: 'Total LLM Calls', value: '0', icon: '📡', trend: '—', trendDirection: 'neutral' },
    { title: 'Cost Saved (USD)', value: '$0', icon: '💰', trend: '—', trendDirection: 'neutral' },
    { title: 'Time Saved (min)', value: '0', icon: '⏱️', trend: '—', trendDirection: 'neutral' },
    { title: 'Cache Hit Rate', value: '0%', icon: '🎯', trend: '—', trendDirection: 'neutral' },
  ]);

  activeProvider = signal('OpenAI');

  private readonly http = inject(HttpClient);

  ngOnInit(): void {
    this.loadMetrics();
  }

  private loadMetrics(): void {
    this.http.get<{ data: Record<string, unknown> }>('/api/llm/metrics').subscribe({
      next: (response) => {
        const m = response.data;
        this.metrics.set([
          {
            title: 'Total LLM Calls',
            value: String(m['totalCalls'] || 0),
            icon: '📡',
            trend: `${m['totalTokens'] || 0} tokens`,
            trendDirection: 'neutral',
          },
          {
            title: 'Cost Saved (USD)',
            value: `$${m['estimatedCostSavedUsd'] || 0}`,
            icon: '💰',
            trend: `API cost: $${m['totalCostUsd'] || 0}`,
            trendDirection: (m['estimatedCostSavedUsd'] as number) > 0 ? 'up' : 'neutral',
          },
          {
            title: 'Time Saved (min)',
            value: String(m['estimatedTimeSavedMinutes'] || 0),
            icon: '⏱️',
            trend: 'vs. manual processing',
            trendDirection: 'up',
          },
          {
            title: 'Cache Hit Rate',
            value: `${Math.round(((m['cacheHitRate'] as number) || 0) * 100)}%`,
            icon: '🎯',
            trend: 'cost optimization',
            trendDirection: 'up',
          },
        ]);
      },
      error: () => {
        // Keep default values if API unreachable
      },
    });
  }
}
