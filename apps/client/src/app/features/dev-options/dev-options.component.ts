import { Component, signal, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { ThemeService, DesignSystem } from '../../shared/services/theme.service';

@Component({
  selector: 'app-dev-options',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MagneticDirective, ScrollRevealDirective],
  template: `
    <section aria-labelledby="dev-heading" class="animate-fade-in" appScrollReveal appScrollRevealType="fade-in">
      <div class="text-reveal-mask">
        <h1 id="dev-heading">Dev Options</h1>
      </div>
      <p>Configure developer overrides and access debugging tools.</p>

      <!-- API Configuration -->
      <section aria-labelledby="api-config" class="card mt-lg" appScrollReveal [appScrollRevealDelay]="100">
        <h2 id="api-config">API Configuration</h2>
        <p class="text-muted mb-md">Override default endpoints or provide a custom API key for external services.</p>

        <div class="form-group">
          <label for="custom-api-key" class="form-label">Custom API Key</label>
          
          <div class="api-key-row">
            <input
              type="password"
              id="custom-api-key"
              class="form-input"
              [(ngModel)]="customApiKey"
              (ngModelChange)="customApiKey.set($event)"
              name="customApiKey"
              placeholder="sk-..."
              aria-describedby="api-key-hint" />
            
            <button
              class="btn btn-primary"
              (click)="save()"
              appMagnetic
              [appMagneticStrength]="0.2">
              Save
            </button>
          </div>
          
          <small id="api-key-hint" class="text-muted mt-sm" style="display: block;">
            Your API key is securely stored locally and never transmitted to our servers.
          </small>
        </div>

        <div
          aria-live="polite"
          aria-atomic="true"
          class="success-text mt-sm"
          id="save-notification">
          {{ saveMessage() }}
        </div>
      </section>

      <!-- Design System Configuration -->
      <section aria-labelledby="design-system-config" class="card mt-lg" appScrollReveal [appScrollRevealDelay]="150">
        <h2 id="design-system-config">Design System</h2>
        <p class="text-muted mb-md">Select the core design system for the application. Changes apply globally.</p>

        <div class="form-group">
          <label class="form-label">Active Design System</label>
          <div class="radio-group">
            <label class="radio-label" [class.active]="themeService.designSystem() === 'editorial'">
              <input 
                type="radio" 
                name="designSystem" 
                value="editorial" 
                [ngModel]="themeService.designSystem()"
                (ngModelChange)="onDesignSystemChange($event)"
                class="sr-only">
              <span class="radio-custom"></span>
              <div class="radio-content">
                <strong>Editorial Minimalist</strong>
                <span class="text-muted text-sm">Deep greens, off-whites, elegant typography</span>
              </div>
            </label>

            <label class="radio-label" [class.active]="themeService.designSystem() === 'bwai'">
              <input 
                type="radio" 
                name="designSystem" 
                value="bwai" 
                [ngModel]="themeService.designSystem()"
                (ngModelChange)="onDesignSystemChange($event)"
                class="sr-only">
              <span class="radio-custom"></span>
              <div class="radio-content">
                <strong>Build with AI (Google)</strong>
                <span class="text-muted text-sm">Vibrant primary colors, clear contrasts, material-inspired</span>
              </div>
            </label>
          </div>
        </div>
      </section>

      <!-- Developer Tools -->
      <section aria-labelledby="dev-tools" class="card mt-lg" appScrollReveal [appScrollRevealDelay]="200">
        <h2 id="dev-tools">Developer Tools</h2>
        <p class="text-muted mb-md">Quick links to debugging utilities and system insights.</p>

        <ul role="list" class="dev-tools-list">
          <li>
            <a href="http://localhost:3000/api/docs" target="_blank" rel="noopener noreferrer" class="dev-tool-link">
              <span aria-hidden="true" class="tool-icon">📖</span> 
              <div class="tool-content">
                <strong>API Swagger Docs</strong>
                <span class="text-muted">Explore backend REST endpoints</span>
              </div>
            </a>
          </li>
          <li>
            <a href="http://localhost:3000/api/triz/parameters" target="_blank" rel="noopener noreferrer" class="dev-tool-link">
              <span aria-hidden="true" class="tool-icon">🧠</span> 
              <div class="tool-content">
                <strong>TRIZ Parameters API</strong>
                <span class="text-muted">View the 39 standard TRIZ engineering parameters</span>
              </div>
            </a>
          </li>
          <li>
            <a routerLink="/css-debugging" class="dev-tool-link">
              <span aria-hidden="true" class="tool-icon">🎨</span> 
              <div class="tool-content">
                <strong>CSS Debugger</strong>
                <span class="text-muted">Inspect design tokens and semantic variables</span>
              </div>
            </a>
          </li>
          <li>
            <div class="dev-tool-link" title="Run 'npm run graph' in terminal to visualize workspace dependencies">
              <span aria-hidden="true" class="tool-icon">🕸️</span> 
              <div class="tool-content">
                <strong>Nx Project Graph</strong>
                <span class="text-muted">Run 'npm run graph' to visualize</span>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </section>
  `,
  styles: [`
    .api-key-row {
      display: flex;
      gap: var(--spacing-sm);
      align-items: flex-start;
      margin-top: var(--spacing-xs);
    }
    .api-key-row .form-input {
      flex: 1;
      margin-top: 0;
    }
    .form-input {
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      color: var(--text-primary);
      font-size: var(--font-size-md);
      transition: all var(--transition-fast);
      height: 42px; /* Match button height */
    }
    .form-input:focus {
      outline: none;
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary) 20%, transparent);
    }
    .form-input::placeholder {
      color: var(--text-muted);
    }
    .btn-primary {
      height: 42px;
      white-space: nowrap;
    }
    .success-text {
      color: var(--accent-primary);
      font-size: var(--font-size-sm);
      min-height: 20px;
    }
    
    .radio-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }
    .radio-label {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .radio-label:hover {
      border-color: var(--text-muted);
    }
    .radio-label.active {
      border-color: var(--accent-primary);
      background: color-mix(in srgb, var(--accent-primary) 5%, transparent);
    }
    .radio-custom {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .radio-label.active .radio-custom {
      border-color: var(--accent-primary);
    }
    .radio-label.active .radio-custom::after {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent-primary);
    }
    .radio-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .text-sm {
      font-size: var(--font-size-sm);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    
    .dev-tools-list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }
    .dev-tool-link {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      border-radius: var(--border-radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-primary);
      color: var(--text-primary);
      text-decoration: none;
      transition: all var(--transition-fast);
    }
    a.dev-tool-link:hover {
      border-color: var(--accent-primary);
      background: color-mix(in srgb, var(--accent-primary) 5%, transparent);
      transform: translateY(-2px);
    }
    .tool-icon {
      font-size: 1.5rem;
      background: var(--bg-card);
      padding: var(--spacing-sm);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-color);
    }
    .tool-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tool-content strong {
      font-weight: var(--font-weight-medium);
    }
    .tool-content .text-muted {
      font-size: var(--font-size-sm);
    }
  `],
})
export class DevOptionsComponent implements OnInit {
  themeService = inject(ThemeService);

  customApiKey = signal('');
  saveMessage = signal('');

  ngOnInit(): void {
    const savedKey = localStorage.getItem('custom_api_key');
    if (savedKey) {
      this.customApiKey.set(savedKey);
    }
  }

  save(): void {
    const key = this.customApiKey().trim();
    if (key) {
      localStorage.setItem('custom_api_key', key);
    } else {
      localStorage.removeItem('custom_api_key');
    }
    this.saveMessage.set('API Key saved successfully.');
    setTimeout(() => this.saveMessage.set(''), 3000);
  }

  onDesignSystemChange(system: DesignSystem): void {
    this.themeService.setDesignSystem(system);
  }
}
