import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <footer class="footer" role="contentinfo">
      <div class="footer-inner">
        <p class="footer-text">
          Built for <strong>GDG Wrocław — Build with AI</strong> Hackathon
        </p>


        <p class="footer-meta">
          Angular + NestJS + Nx &middot; WCAG 2.2 Accessible
        </p>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: var(--bg-secondary);
      border-top: 1px solid var(--border-color);
      padding: var(--spacing-md) var(--spacing-lg);
      text-align: center;
    }
    .footer-inner {
      max-width: 1440px;
      margin: 0 auto;
    }
    .footer-text {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin-bottom: var(--spacing-xs);
    }

    .footer-meta {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-bottom: 0;
    }
  `],
})
export class FooterComponent {}
