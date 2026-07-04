import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appMagnetic]',
  standalone: true
})
export class MagneticDirective {
  @Input() appMagneticStrength = 0.25;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const bound = this.el.nativeElement.getBoundingClientRect();
    const x = event.clientX - (bound.left + bound.width / 2);
    const y = event.clientY - (bound.top + bound.height / 2);

    this.renderer.setStyle(
      this.el.nativeElement,
      'transform',
      `translate3d(${x * this.appMagneticStrength}px, ${y * this.appMagneticStrength}px, 0)`
    );
    this.renderer.setStyle(
      this.el.nativeElement,
      'transition',
      'transform 0.08s cubic-bezier(0.25, 1, 0.5, 1)'
    );
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.renderer.setStyle(this.el.nativeElement, 'transform', 'translate3d(0, 0, 0)');
    this.renderer.setStyle(
      this.el.nativeElement,
      'transition',
      'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
    );
  }
}
