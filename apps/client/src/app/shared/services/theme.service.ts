import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDark = signal(true);

  constructor() {
    const isLightTheme = document.body.classList.contains('theme-light');
    this.isDark.set(!isLightTheme);
  }

  toggleTheme(): void {
    this.isDark.update((v) => !v);
    document.body.classList.toggle('theme-light', !this.isDark());
  }
}
