import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MagneticDirective, ScrollRevealDirective],
  template: `
    <section aria-labelledby="settings-heading" class="animate-fade-in" appScrollReveal appScrollRevealType="fade-in">
      <div class="text-reveal-mask">
        <h1 id="settings-heading">Settings</h1>
      </div>
      <p>Configure your hackathon project settings.</p>

      <!-- LLM Provider Configuration -->
      <section aria-labelledby="llm-settings" class="card mt-lg" appScrollReveal [appScrollRevealDelay]="100">
        <h2 id="llm-settings">LLM Configuration</h2>

        <div class="form-group">
          <label for="default-provider" class="form-label">Default Provider</label>
          <select
            id="default-provider"
            class="form-select"
            [(ngModel)]="defaultProvider"
            name="defaultProvider"
            aria-describedby="provider-hint">
            <option value="google/gemini-2.5-flash">Google Gemini 2.5 Flash</option>
            <option value="google/gemini-2.5-pro">Google Gemini 2.5 Pro</option>
            <option value="anthropic/claude-3-haiku">Anthropic Claude 3 Haiku</option>
            <option value="openai/gpt-4o">OpenAI GPT-4o</option>
          </select>
          <small id="provider-hint" class="text-muted">
            Choose the default LLM provider for API calls.
          </small>
        </div>

        <div class="form-group">
          <label for="temperature" class="form-label">
            Temperature: {{ temperature }}
          </label>
          <input
            type="range"
            id="temperature"
            class="form-range"
            [(ngModel)]="temperature"
            name="temperature"
            min="0"
            max="2"
            step="0.1"
            aria-valuemin="0"
            aria-valuemax="2"
            [attr.aria-valuenow]="temperature"
            aria-describedby="temp-hint" />
          <small id="temp-hint" class="text-muted">
            Lower = more deterministic, Higher = more creative.
          </small>
        </div>
      </section>

      <!-- Business Model Configuration -->
      <section aria-labelledby="business-settings" class="card mt-lg" appScrollReveal [appScrollRevealDelay]="200">
        <h2 id="business-settings">Business Model</h2>
        <p class="text-muted">Select the monetization model for your hackathon project.</p>

        <fieldset>
          <legend class="sr-only">Business model type</legend>
          @for (model of businessModels; track model.value) {
            <label class="radio-card" [class.selected]="selectedModel() === model.value">
              <input
                type="radio"
                name="businessModel"
                [value]="model.value"
                [(ngModel)]="selectedModelValue"
                (ngModelChange)="selectedModel.set($event)"
                class="sr-only" />
              <span class="radio-content">
                <strong>{{ model.label }}</strong>
                <span class="text-muted">{{ model.description }}</span>
              </span>
              <span class="radio-indicator" aria-hidden="true"></span>
            </label>
          }
        </fieldset>
      </section>


      <!-- Save notification -->
      <div
        aria-live="polite"
        aria-atomic="true"
        class="sr-only"
        id="save-notification">
        {{ saveMessage() }}
      </div>

      <button
        class="btn btn-primary mt-lg"
        (click)="save()"
        (keydown.enter)="save()"
        id="save-settings-btn"
        appMagnetic
        [appMagneticStrength]="0.2">
        Save Settings
      </button>
    </section>
  `,
  styles: [`
    .form-range {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      appearance: none;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      cursor: pointer;
    }
    .form-range::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-primary);
      cursor: pointer;
    }
    fieldset {
      border: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }
    .radio-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .radio-card:hover {
      border-color: var(--accent-primary);
    }
    .radio-card.selected {
      border-color: var(--accent-primary);
      background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
    }
    .radio-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }
    .radio-content .text-muted { font-size: var(--font-size-sm); }
    .radio-indicator {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--border-color);
      flex-shrink: 0;
    }
    .selected .radio-indicator {
      border-color: var(--accent-primary);
      background: var(--accent-primary);
      box-shadow: inset 0 0 0 3px var(--bg-card);
    }
  `],
})
export class SettingsComponent {
  defaultProvider = 'openai';
  temperature = 0.7;
  selectedModelValue = 'SAAS';
  selectedModel = signal('SAAS');
  saveMessage = signal('');


  businessModels = [
    { value: 'SAAS', label: 'SaaS / Subscription', description: 'Recurring monthly/annual subscription' },
    { value: 'FREEMIUM', label: 'Freemium', description: 'Free tier with paid upgrades' },
    { value: 'PAY_PER_USE', label: 'Pay-per-Use', description: 'Charge per API call / token usage' },
    { value: 'LICENSE_B2B', label: 'B2B License', description: 'Enterprise license per seat/org' },
    { value: 'WHITE_LABEL', label: 'White Label', description: 'Rebrandable solution for partners' },
  ];

  save(): void {
    this.saveMessage.set('Settings saved successfully.');
    setTimeout(() => this.saveMessage.set(''), 3000);
  }
}
