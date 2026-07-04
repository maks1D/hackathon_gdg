import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true
})
export class ScrollRevealDirective implements OnInit {
  @Input() appScrollRevealDelay = 0;
  @Input() appScrollRevealStagger = 80;
  @Input() appScrollRevealType: 'fade-in' | 'slide-up' | 'scale-up' = 'slide-up';
  @Input() appScrollRevealChildren = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    const host = this.el.nativeElement;
    
    let items: HTMLElement[] = [host];
    if (this.appScrollRevealChildren) {
      const selected = host.querySelectorAll(this.appScrollRevealChildren);
      if (selected.length > 0) {
        items = Array.from(selected) as HTMLElement[];
      }
    }

    items.forEach((item) => {
      this.renderer.setStyle(item, 'opacity', '0');
      if (this.appScrollRevealType === 'slide-up') {
        this.renderer.setStyle(item, 'transform', 'translate3d(0, 24px, 0)');
      } else if (this.appScrollRevealType === 'scale-up') {
        this.renderer.setStyle(item, 'transform', 'scale3d(0.96, 0.96, 1)');
      }
      this.renderer.setStyle(
        item,
        'transition',
        'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
      );
      this.renderer.setStyle(item, 'will-change', 'transform, opacity');
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            items.forEach((item, index) => {
              const delay = this.appScrollRevealDelay + (index * this.appScrollRevealStagger);
              setTimeout(() => {
                this.renderer.setStyle(item, 'opacity', '1');
                this.renderer.setStyle(item, 'transform', 'translate3d(0, 0, 0) scale3d(1, 1, 1)');
              }, delay);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(host);
  }
}
