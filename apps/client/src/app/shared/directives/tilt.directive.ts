import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appTilt]',
  standalone: true
})
export class TiltDirective {
  @Input() appTiltMax = 8;
  @Input() appTiltPerspective = 1000;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const el = this.el.nativeElement;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const xc = rect.width / 2;
    const yc = rect.height / 2;

    const dx = x - xc;
    const dy = y - yc;

    const rx = -(dy / yc) * this.appTiltMax;
    const ry = (dx / xc) * this.appTiltMax;

    this.renderer.setStyle(
      el,
      'transform',
      `perspective(${this.appTiltPerspective}px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`
    );
    this.renderer.setStyle(
      el,
      'transition',
      'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)'
    );
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    const el = this.el.nativeElement;
    this.renderer.setStyle(
      el,
      'transform',
      `perspective(${this.appTiltPerspective}px) rotateX(0deg) rotateY(0deg) translateY(0)`
    );
    this.renderer.setStyle(
      el,
      'transition',
      'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
    );
  }
}
