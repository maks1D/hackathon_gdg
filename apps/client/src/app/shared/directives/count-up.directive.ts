import { Directive, ElementRef, Input, OnChanges, SimpleChanges, Renderer2, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnChanges, OnDestroy {
  @Input('appCountUp') value: string | number = 0;
  @Input() duration = 1200;

  private observer!: IntersectionObserver;
  private hasIntersected = false;
  private currentAnimationId: number | null = null;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.hasIntersected = true;
            this.startAnimation();
            this.observer.disconnect();
          }
        });
      },
      { threshold: 0.05 }
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange && this.hasIntersected) {
      this.startAnimation();
    }
  }

  private startAnimation(): void {
    if (this.currentAnimationId !== null) {
      cancelAnimationFrame(this.currentAnimationId);
    }

    const valueStr = String(this.value);
    const match = valueStr.match(/^([^\d-]*)([\d.-]+)([^\d]*)$/);
    if (!match) {
      this.renderer.setProperty(this.el.nativeElement, 'textContent', valueStr);
      return;
    }

    const prefix = match[1] || '';
    const numberVal = parseFloat(match[2]);
    const suffix = match[3] || '';

    if (isNaN(numberVal)) {
      this.renderer.setProperty(this.el.nativeElement, 'textContent', valueStr);
      return;
    }

    const startTime = performance.now();
    const startValue = 0;

    const run = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      
      const easeProgress = progress * (2 - progress);
      const currentValue = startValue + (numberVal - startValue) * easeProgress;
      
      const decimals = match[2].includes('.') ? match[2].split('.')[1].length : 0;
      const formattedValue = currentValue.toFixed(decimals);

      this.renderer.setProperty(
        this.el.nativeElement,
        'textContent',
        `${prefix}${formattedValue}${suffix}`
      );

      if (progress < 1) {
        this.currentAnimationId = requestAnimationFrame(run);
      } else {
        this.currentAnimationId = null;
      }
    };

    this.currentAnimationId = requestAnimationFrame(run);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.currentAnimationId !== null) {
      cancelAnimationFrame(this.currentAnimationId);
    }
  }
}
