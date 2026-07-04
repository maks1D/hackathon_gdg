import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside
      class="sidebar"
      [class.collapsed]="isCollapsed()"
      role="complementary"
      aria-label="Side navigation">

      <button
        class="sidebar-toggle btn btn-secondary"
        (click)="toggle()"
        (keydown.enter)="toggle()"
        [attr.aria-expanded]="!isCollapsed()"
        aria-controls="sidebar-nav"
        id="sidebar-toggle">
        <span class="toggle-icon" aria-hidden="true">{{ isCollapsed() ? '→' : '←' }}</span>
        <span class="sr-only">{{ isCollapsed() ? 'Expand' : 'Collapse' }} sidebar</span>
      </button>

      <nav id="sidebar-nav" [attr.aria-hidden]="isCollapsed()" aria-label="Sidebar navigation">
        <ul role="list" class="sidebar-list">
          @for (item of navItems; track item.path) {
            <li>
              <a [routerLink]="item.path"
                 routerLinkActive="active"
                 class="sidebar-link"
                 [attr.aria-label]="item.label"
                 [id]="'sidebar-' + item.id">
                <span class="sidebar-icon" aria-hidden="true">{{ item.icon }}</span>
                @if (!isCollapsed()) {
                  <span class="sidebar-label">{{ item.label }}</span>
                }
              </a>
            </li>
          }
        </ul>
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      padding: var(--spacing-md);
      transition: width var(--transition-normal);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }
    .sidebar.collapsed {
      width: var(--sidebar-collapsed-width);
    }
    .sidebar-toggle {
      align-self: flex-end;
      min-width: 2rem;
      min-height: 2rem;
      padding: var(--spacing-xs);
    }
    .sidebar-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }
    .sidebar-link {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius-md);
      color: var(--text-secondary);
      text-decoration: none;
      transition: all var(--transition-fast);
      font-size: var(--font-size-sm);
    }
    .sidebar-link:hover {
      color: var(--text-primary);
      background: var(--bg-card);
    }
    .sidebar-link.active {
      color: var(--accent-primary);
      background: rgba(99, 102, 241, 0.1);
      font-weight: var(--font-weight-medium);
    }
    .sidebar-icon { font-size: 1.2rem; }
    .collapsed .sidebar-link {
      justify-content: center;
      padding: var(--spacing-sm);
    }
    @media (max-width: 768px) {
      .sidebar { display: none; }
    }
  `],
})
export class SidebarComponent {
  isCollapsed = signal(false);
  navItems = [
    { path: '/triz-solver', label: 'R&D Solver', icon: '🧠', id: 'triz-solver' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊', id: 'dashboard' },
    { path: '/settings', label: 'Settings', icon: '⚙️', id: 'settings' },
    { path: '/dev-options', label: 'Dev Options', icon: '🛠️', id: 'dev-options' },
  ];

  toggle(): void {
    this.isCollapsed.update((v) => !v);
  }
}
