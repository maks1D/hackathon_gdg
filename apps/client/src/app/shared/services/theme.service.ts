import { Injectable, signal } from '@angular/core';

export type DesignSystem = 'editorial' | 'bwai';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDark = signal(true);
  designSystem = signal<DesignSystem>('editorial');

  constructor() {
    const isLightTheme = document.body.classList.contains('theme-light');
    this.isDark.set(!isLightTheme);
    
    const isBwai = document.body.classList.contains('theme-bwai');
    this.designSystem.set(isBwai ? 'bwai' : 'editorial');
  }

  toggleTheme(): void {
    this.isDark.update((v) => !v);
    document.body.classList.toggle('theme-light', !this.isDark());
  }

  setDesignSystem(system: DesignSystem): void {
    this.designSystem.set(system);
    if (system === 'bwai') {
      document.body.classList.add('theme-bwai');
    } else {
      document.body.classList.remove('theme-bwai');
    }
  }
}
