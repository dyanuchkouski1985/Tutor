import {
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-scroll-top',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button
      type="button"
      class="ui-button ui-scrolltop"
      [class.visible]="isVisible()"
      aria-label="Scroll to top"
      (click)="start()"
    >
      <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
        <path
          d="M2 9.5 7 4.5 12 9.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  `,
})
export class ScrollTopComponent implements OnInit, OnDestroy {
  @Input() threshold = 400;
  @Output() scrollingChange = new EventEmitter<boolean>();

  isVisible = signal(false);

  private readonly duration = 700;
  private frameId: number | null = null;
  private removeListeners: (() => void)[] = [];

  constructor(private readonly ngZone: NgZone) {}

  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      const onScroll = () => this.isVisible.set(window.scrollY > this.threshold);
      const onUserScroll = () => this.stop();

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('wheel', onUserScroll, { passive: true });
      window.addEventListener('touchstart', onUserScroll, { passive: true });
      onScroll();

      this.removeListeners = [
        () => window.removeEventListener('scroll', onScroll),
        () => window.removeEventListener('wheel', onUserScroll),
        () => window.removeEventListener('touchstart', onUserScroll),
      ];
    });
  }

  ngOnDestroy() {
    this.stop();
    this.removeListeners.forEach((removeListener) => removeListener());
  }

  start() {
    this.stop();

    const startY = window.scrollY;
    const startTime = performance.now();

    if (!startY) {
      return;
    }

    const step = (time: number) => {
      const progress = Math.min((time - startTime) / this.duration, 1);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

      window.scrollTo({ top: startY * (1 - eased), behavior: 'instant' });

      if (progress < 1) {
        this.frameId = requestAnimationFrame(step);
      } else {
        this.frameId = null;
        this.ngZone.run(() => this.scrollingChange.emit(false));
      }
    };

    this.scrollingChange.emit(true);
    this.ngZone.runOutsideAngular(() => (this.frameId = requestAnimationFrame(step)));
  }

  private stop() {
    if (this.frameId === null) {
      return;
    }

    cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.ngZone.run(() => this.scrollingChange.emit(false));
  }
}
