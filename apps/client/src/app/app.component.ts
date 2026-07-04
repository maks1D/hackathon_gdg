import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, SidebarComponent],
  template: `
    <div class="app-shell" id="app-shell">
      <!-- Ambient background decoration -->
      <div class="ambient-blobs-container">
        <div class="ambient-blob blob-1"></div>
        <div class="ambient-blob blob-2"></div>
        <div class="ambient-blob blob-3"></div>
      </div>
      
      <app-header />
      <div class="app-body">
        <app-sidebar />
        <main id="main-content" role="main" tabindex="-1" aria-label="Main content">
          <router-outlet />
        </main>
      </div>
      <app-footer />
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    .app-body {
      display: flex;
      flex: 1;
    }
    main {
      flex: 1;
      padding: var(--spacing-lg);
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
    }
    main:focus {
      outline: none;
    }
  `],
})
export class AppComponent {}
