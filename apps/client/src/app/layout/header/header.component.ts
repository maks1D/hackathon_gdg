import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../shared/services/theme.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header" role="banner">
      <div class="header-inner">
        <a routerLink="/dashboard" class="logo" aria-label="Build with AI — Home">
          <span class="logo-icon" aria-hidden="true">🚀</span>
          <span class="logo-text">Build with AI</span>
        </a>

        <nav aria-label="Main navigation" class="main-nav">
          <ul role="list" class="nav-list">
            <li>
              <a routerLink="/dashboard"
                 routerLinkActive="active"
                 class="nav-link"
                 id="nav-dashboard">
                Dashboard
              </a>
            </li>
            <li>
              <a routerLink="/ai-playground"
                 routerLinkActive="active"
                 class="nav-link"
                 id="nav-playground">
                AI Playground
              </a>
            </li>
            <li>
              <a routerLink="/settings"
                 routerLinkActive="active"
                 class="nav-link"
                 id="nav-settings">
                Settings
              </a>
            </li>
          </ul>
        </nav>

        <div class="header-actions">
          <button
            class="theme-toggle-btn"
            (click)="toggleTheme()"
            (keydown.enter)="toggleTheme()"
            [attr.aria-label]="isDark() ? 'Switch to light theme' : 'Switch to dark theme'"
            id="theme-toggle">
            <div class="toggle-track" [class.is-dark]="isDark()">
              <div class="sun-moon">
                <div class="crater crater-1"></div>
                <div class="crater crater-2"></div>
                <div class="crater crater-3"></div>
              </div>
              <div class="clouds"></div>
              <div class="stars">
                <div class="sparkle sparkle-1"></div>
                <div class="sparkle sparkle-2"></div>
                <div class="star star-1"></div>
                <div class="star star-2"></div>
                <div class="star star-3"></div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      position: sticky;
      top: 0;
      z-index: var(--z-header);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      backdrop-filter: blur(12px);
      height: var(--header-height);
    }
    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
      padding: 0 var(--spacing-lg);
      max-width: 1440px;
      margin: 0 auto;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
      text-decoration: none;
    }
    .logo-icon { font-size: 1.5rem; }
    .nav-list {
      display: flex;
      list-style: none;
      gap: var(--spacing-xs);
    }
    .nav-link {
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius-md);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      transition: all var(--transition-fast);
      text-decoration: none;
    }
    .nav-link:hover { color: var(--text-primary); background: var(--bg-card); }
    .nav-link.active {
      color: var(--accent-primary);
      background: rgba(99, 102, 241, 0.1);
    }
    
    /* 3D Theme Toggle Styles */
    .theme-toggle-btn {
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      border-radius: 100px;
      outline-offset: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toggle-track {
      width: 96px;
      height: 44px;
      border-radius: 100px;
      background-color: #3ba8e8;
      position: relative;
      overflow: hidden;
      transition: background-color 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: inset 0 3px 8px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1);
    }
    .toggle-track.is-dark {
      background-color: #1a1a1a;
    }
    .sun-moon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      position: absolute;
      top: 4px;
      left: 4px;
      background: #fde82e;
      box-shadow: inset -2px -2px 6px rgba(0,0,0,0.1), inset 2px 2px 6px rgba(255,255,255,0.8),
                  0 0 0 10px rgba(255,255,255,0.1),
                  0 0 0 22px rgba(255,255,255,0.05),
                  0 0 0 34px rgba(255,255,255,0.02);
      transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 3;
    }
    .is-dark .sun-moon {
      transform: translateX(52px);
      background: #cbd1d6;
      box-shadow: inset -3px -3px 5px rgba(0,0,0,0.3), inset 2px 2px 5px rgba(255,255,255,0.9),
                  0 0 0 10px rgba(255,255,255,0.03),
                  0 0 0 22px rgba(255,255,255,0.02),
                  0 0 0 34px rgba(255,255,255,0.01);
    }
    
    /* Moon Craters */
    .crater {
      position: absolute;
      background: #9fa7ad;
      border-radius: 50%;
      box-shadow: inset 1px 2px 3px rgba(0,0,0,0.3), 1px 1px 1px rgba(255,255,255,0.4);
      opacity: 0;
      transition: opacity 0.4s ease-in-out;
    }
    .is-dark .crater { opacity: 1; }
    .crater-1 { width: 8px; height: 8px; top: 6px; right: 8px; }
    .crater-2 { width: 12px; height: 12px; bottom: 6px; left: 6px; }
    .crater-3 { width: 7px; height: 7px; bottom: 12px; right: 5px; }

    /* Day Clouds */
    .clouds {
      position: absolute;
      bottom: -15px;
      right: -5px;
      width: 45px;
      height: 45px;
      background: #ffffff;
      border-radius: 50%;
      box-shadow: -22px 18px 0 5px #ffffff, -45px 22px 0 5px #ffffff, -70px 26px 0 10px #ffffff;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 2;
    }
    .is-dark .clouds {
      transform: translateY(60px);
    }

    /* Night Stars */
    .stars {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1;
    }
    .is-dark .stars { opacity: 1; }
    
    .sparkle {
      position: absolute;
      background: white;
      clip-path: polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
    }
    .sparkle-1 { width: 8px; height: 8px; top: 12px; left: 16px; }
    .sparkle-2 { width: 6px; height: 6px; top: 22px; left: 32px; }
    
    .star {
      position: absolute;
      background: white;
      border-radius: 50%;
    }
    .star-1 { width: 2px; height: 2px; top: 28px; left: 14px; box-shadow: 0 0 2px white; }
    .star-2 { width: 3px; height: 3px; top: 14px; left: 42px; box-shadow: 0 0 3px white; }
    .star-3 { width: 2px; height: 2px; top: 30px; left: 24px; box-shadow: 0 0 2px white; }
  `],
})
export class HeaderComponent {
  private readonly themeService = inject(ThemeService);
  isDark = this.themeService.isDark;

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
