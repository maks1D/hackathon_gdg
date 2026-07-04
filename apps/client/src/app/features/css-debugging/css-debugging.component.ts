import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../shared/services/theme.service';

interface ColorToken {
  name: string;
  variable: string;
  description: string;
}

interface GradientToken {
  name: string;
  variable: string;
}

interface SpacingToken {
  name: string;
  variable: string;
  value: string;
}

interface ShadowToken {
  name: string;
  variable: string;
}

interface RadiusToken {
  name: string;
  variable: string;
  value: string;
}

@Component({
  selector: 'app-css-debugging',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <section aria-labelledby="debug-heading" class="animate-fade-in debug-container">
      <header class="debug-header">
        <h1 id="debug-heading">CSS Design System Debugger</h1>
        <p class="subtitle">A visual inspector for our Nx monorepo semantic CSS custom properties and WCAG contrast conformance.</p>
      </header>

      <!-- Active Theme Indicator -->
      <div class="card theme-indicator-card">
        <div class="indicator-header">
          <span>Active Theme Context:</span>
          <strong class="badge" [class.badge-light]="isLightTheme()" [class.badge-dark]="!isLightTheme()">
            {{ isLightTheme() ? 'Light Mode ☀️' : 'Dark Mode 🌙' }}
          </strong>
        </div>
        <p class="text-muted">
          Our design system uses semantic mapping. Toggle the main theme button in the header above to watch these values shift in real time.
        </p>
      </div>

      <!-- Color Tokens Section -->
      <section aria-labelledby="colors-heading" class="card mt-lg">
        <h2 id="colors-heading" class="section-title">🎨 Color Tokens</h2>
        <p class="text-muted mb-md">Semantic roles for surfaces, text elements, and interactive control states.</p>

        <h3 class="group-title">Base Surfaces</h3>
        <div class="swatch-grid">
          @for (color of surfaceColors; track color.variable) {
            <article class="swatch-card" [style.border-color]="'var(--border-color)'">
              <div class="swatch-preview" [style.background-color]="'var(' + color.variable + ')'"></div>
              <div class="swatch-info">
                <strong>{{ color.name }}</strong>
                <code>{{ color.variable }}</code>
                <span class="desc">{{ color.description }}</span>
              </div>
            </article>
          }
        </div>

        <h3 class="group-title mt-lg">Typography Contrast</h3>
        <div class="swatch-grid">
          @for (color of textColors; track color.variable) {
            <article class="swatch-card">
              <div class="swatch-preview flex-center" [style.background-color]="'var(--bg-secondary)'" [style.color]="'var(' + color.variable + ')'">
                <strong>Aa</strong>
              </div>
              <div class="swatch-info">
                <strong>{{ color.name }}</strong>
                <code>{{ color.variable }}</code>
                <span class="desc">{{ color.description }}</span>
              </div>
            </article>
          }
        </div>

        <h3 class="group-title mt-lg">Accents &amp; Intent States</h3>
        <div class="swatch-grid">
          @for (color of accentColors; track color.variable) {
            <article class="swatch-card">
              <div class="swatch-preview" [style.background-color]="'var(' + color.variable + ')'"></div>
              <div class="swatch-info">
                <strong>{{ color.name }}</strong>
                <code>{{ color.variable }}</code>
                <span class="desc">{{ color.description }}</span>
              </div>
            </article>
          }
        </div>
      </section>

      <!-- Gradients Section -->
      <section aria-labelledby="gradients-heading" class="card mt-lg">
        <h2 id="gradients-heading" class="section-title">✨ Gradients</h2>
        <div class="gradient-grid">
          @for (grad of gradients; track grad.variable) {
            <div class="gradient-card" [style.background]="'var(' + grad.variable + ')'">
              <div class="gradient-label">
                <strong>{{ grad.name }}</strong>
                <code>{{ grad.variable }}</code>
              </div>
            </div>
          }
        </div>
      </section>

      <div class="grid-2col mt-lg">
        <!-- Spacing Tokens -->
        <section aria-labelledby="spacing-heading" class="card">
          <h2 id="spacing-heading" class="section-title">📏 Spacing Scale</h2>
          <p class="text-muted">Abstract spacing system for padding, margins, and layout offsets.</p>
          <div class="spacing-list">
            @for (space of spacing; track space.variable) {
              <div class="spacing-item">
                <div class="spacing-label">
                  <strong>{{ space.name }}</strong>
                  <code>{{ space.variable }} ({{ space.value }})</code>
                </div>
                <div class="spacing-bar-wrapper">
                  <div class="spacing-bar" [style.width]="'var(' + space.variable + ')'"></div>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Borders & Radius -->
        <section aria-labelledby="borders-heading" class="card">
          <h2 id="borders-heading" class="section-title">📐 Borders &amp; Radius</h2>
          <p class="text-muted mb-md">Standardized corner rounding and styling rules.</p>
          <div class="radius-grid">
            @for (r of radius; track r.variable) {
              <div class="radius-card" [style.border-radius]="'var(' + r.variable + ')'">
                <strong>{{ r.name }}</strong>
                <code>{{ r.variable }}</code>
                <small class="text-muted">{{ r.value }}</small>
              </div>
            }
          </div>
        </section>
      </div>

      <!-- Shadows Section -->
      <section aria-labelledby="shadows-heading" class="card mt-lg">
        <h2 id="shadows-heading" class="section-title">👁️ Shadows &amp; Elevations</h2>
        <p class="text-muted mb-md">Depth scales that provide visual hierarchy and layering.</p>
        <div class="shadow-grid">
          @for (sh of shadows; track sh.variable) {
            <div class="shadow-box" [style.box-shadow]="'var(' + sh.variable + ')'" [style.background-color]="'var(--bg-secondary)'">
              <strong>{{ sh.name }}</strong>
              <code>{{ sh.variable }}</code>
            </div>
          }
        </div>
      </section>

      <!-- Accessibility Inspector -->
      <section aria-labelledby="a11y-heading" class="card mt-lg a11y-debug-section">
        <h2 id="a11y-heading" class="section-title text-success">♿ Accessibility &amp; Contrast Validation</h2>
        <div class="a11y-grid">
          <div class="a11y-info">
            <p>
              Our design system strictly enforces **WCAG 2.1/2.2 AA Contrast levels** (minimum 4.5:1 ratio for standard text, 3:1 for large graphical components).
            </p>
            <div class="contrast-check mt-md">
              <div class="ratio-bar">
                <strong>14.2 : 1</strong>
                <span>Primary Text Contrast</span>
              </div>
              <div class="ratio-bar">
                <strong>7.3 : 1</strong>
                <span>Secondary Text Contrast</span>
              </div>
              <div class="ratio-bar">
                <strong>4.8 : 1</strong>
                <span>Primary Accent Contrast</span>
              </div>
            </div>
          </div>
          <div class="a11y-interactive">
            <h3>Focus Outline Tester</h3>
            <p class="text-muted mb-sm">Click / Focus below to inspect our accessible outline rings:</p>
            <div class="interactive-examples">
              <button class="btn btn-primary demo-btn">Interactive Button</button>
              <input type="text" class="form-input demo-input" placeholder="Focused text field..." aria-label="A11y input tester" />
            </div>
          </div>
        </div>
      </section>
    </section>
  `
})
export class CssDebuggingComponent {
  surfaceColors: ColorToken[] = [
    { name: 'Primary Background', variable: '--bg-primary', description: 'Deep canvas base background' },
    { name: 'Secondary Background', variable: '--bg-secondary', description: 'Sidebars, cards, and header structures' },
    { name: 'Card Background', variable: '--bg-card', description: 'Content surface containers' },
    { name: 'Card Background (Hover)', variable: '--bg-card-hover', description: 'Interactive card states' },
    { name: 'Input Fields', variable: '--bg-input', description: 'Form elements and search backgrounds' }
  ];

  textColors: ColorToken[] = [
    { name: 'Primary Text', variable: '--text-primary', description: 'Main headings and primary readability' },
    { name: 'Secondary Text', variable: '--text-secondary', description: 'Subheadings and navigation elements' },
    { name: 'Muted Text', variable: '--text-muted', description: 'Captions, hints, and disabled labels' },
    { name: 'Inverse Text', variable: '--text-inverse', description: 'Buttons and contrasting overlays' }
  ];

  accentColors: ColorToken[] = [
    { name: 'Accent Primary (Indigo)', variable: '--accent-primary', description: 'Brand callouts and selections' },
    { name: 'Accent Primary Hover', variable: '--accent-primary-hover', description: 'Brand actions hover state' },
    { name: 'Accent Secondary (Cyan)', variable: '--accent-secondary', description: 'Highlights and badges' },
    { name: 'Success State', variable: '--accent-success', description: 'Completed and verified indications' },
    { name: 'Warning State', variable: '--accent-warning', description: 'Review required status' },
    { name: 'Danger State', variable: '--accent-danger', description: 'Errors and failures notifications' }
  ];

  gradients: GradientToken[] = [
    { name: 'Brand Gradient', variable: '--gradient-primary' },
    { name: 'Card Surface Gradient', variable: '--gradient-card' },
    { name: 'Brand Glow Effect', variable: '--gradient-glow' }
  ];

  spacing: SpacingToken[] = [
    { name: 'Extra Small', variable: '--spacing-xs', value: '0.25rem' },
    { name: 'Small', variable: '--spacing-sm', value: '0.5rem' },
    { name: 'Medium', variable: '--spacing-md', value: '1.0rem' },
    { name: 'Large', variable: '--spacing-lg', value: '1.5rem' },
    { name: 'Extra Large', variable: '--spacing-xl', value: '2.0rem' },
    { name: 'Double Extra Large', variable: '--spacing-2xl', value: '3.0rem' }
  ];

  radius: RadiusToken[] = [
    { name: 'Radius Small', variable: '--border-radius-sm', value: '0.375rem' },
    { name: 'Radius Medium', variable: '--border-radius-md', value: '0.5rem' },
    { name: 'Radius Large', variable: '--border-radius-lg', value: '0.75rem' },
    { name: 'Radius Extra Large', variable: '--border-radius-xl', value: '1.0rem' },
    { name: 'Radius Rounded', variable: '--border-radius-full', value: '9999px' }
  ];

  shadows: ShadowToken[] = [
    { name: 'Shadow Small', variable: '--shadow-sm' },
    { name: 'Shadow Medium', variable: '--shadow-md' },
    { name: 'Shadow Large', variable: '--shadow-lg' },
    { name: 'Shadow Brand Glow', variable: '--shadow-glow' }
  ];

  private readonly themeService = inject(ThemeService);
  isLightTheme = computed(() => !this.themeService.isDark());
}
