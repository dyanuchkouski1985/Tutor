import { Directive, ElementRef, EventEmitter, NgZone, OnDestroy, OnInit, Output } from '@angular/core';

@Directive({
  selector: '[appInView]',
  standalone: true,
})
export class InViewDirective implements OnInit, OnDestroy {
  @Output() appInView = new EventEmitter<void>();

  private static observer: IntersectionObserver | null = null;
  private static callbacks = new WeakMap<Element, () => void>();

  constructor(
    private readonly elementRef: ElementRef<Element>,
    private readonly ngZone: NgZone,
  ) {}

  ngOnInit() {
    InViewDirective.callbacks.set(this.elementRef.nativeElement, () =>
      this.ngZone.run(() => this.appInView.emit()),
    );
    InViewDirective.getObserver().observe(this.elementRef.nativeElement);
  }

  ngOnDestroy() {
    InViewDirective.observer?.unobserve(this.elementRef.nativeElement);
    InViewDirective.callbacks.delete(this.elementRef.nativeElement);
  }

  private static getObserver() {
    InViewDirective.observer ??= new IntersectionObserver(
      (entries) =>
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => InViewDirective.callbacks.get(entry.target)?.()),
      { rootMargin: '1000px 0px' },
    );

    return InViewDirective.observer;
  }
}
