import {
  afterNextRender,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Injector,
  Input,
  NgZone,
  OnDestroy,
  Output,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';

const gutter = 10;
const focusableSelector = 'input:not([disabled]), textarea:not([disabled])';

@Component({
  selector: 'app-popover',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (isVisible()) {
      <div #container class="ui-popover" [class]="panelClass" role="dialog">
        <div class="ui-popover-content"><ng-content /></div>
      </div>
    }
  `,
})
export class PopoverComponent implements OnDestroy {
  @Input() panelClass = '';

  @Output() closed = new EventEmitter<void>();

  @ViewChild('container') container?: ElementRef<HTMLElement>;

  isVisible = signal(false);

  private target: HTMLElement | null = null;
  private isLeaving = false;
  private removeListeners: (() => void)[] = [];

  constructor(
    private readonly injector: Injector,
    private readonly ngZone: NgZone,
  ) {}

  ngOnDestroy() {
    this.unbindListeners();
    this.container?.nativeElement.remove();
  }

  toggle(event: Event) {
    const target = event.currentTarget as HTMLElement;

    if (!this.isVisible() || this.isLeaving) {
      this.show(event);
    } else if (this.target !== target) {
      this.hide();
      this.show(event);
    } else {
      this.hide();
    }
  }

  show(event: Event) {
    this.target = (event.currentTarget ?? event.target) as HTMLElement;

    if (this.isLeaving) {
      this.isLeaving = false;
      this.container?.nativeElement.classList.remove('ui-popover-leave');
      this.bindListeners();
    }

    if (this.isVisible()) {
      this.align();
      return;
    }

    this.isVisible.set(true);

    afterNextRender(
      {
        write: () => {
          const container = this.container?.nativeElement;

          if (!container) {
            return;
          }

          document.body.appendChild(container);
          this.align();
          this.bindListeners();
          container.querySelector<HTMLElement>(focusableSelector)?.focus();
        },
      },
      { injector: this.injector },
    );
  }

  hide() {
    if (!this.isVisible() || this.isLeaving) {
      return;
    }

    this.unbindListeners();

    const container = this.container?.nativeElement;
    container?.classList.add('ui-popover-leave');
    const animations = container?.getAnimations() ?? [];

    if (!animations.length) {
      this.close();
      return;
    }

    this.isLeaving = true;
    Promise.all(animations.map((animation) => animation.finished)).then(
      () => {
        if (this.isLeaving) {
          this.close();
        }
      },
      () => {},
    );
  }

  private close() {
    this.isLeaving = false;
    this.isVisible.set(false);
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.hide();
  }

  private align() {
    const container = this.container?.nativeElement;

    if (!container || !this.target) {
      return;
    }

    const target = this.target.getBoundingClientRect();
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const isFlipped =
      target.bottom + gutter + height > viewportHeight && target.top - gutter - height >= 0;
    const left = Math.max(0, Math.min(target.left, viewportWidth - width));
    const top = isFlipped ? target.top - gutter - height : target.bottom + gutter;
    const radius = parseFloat(getComputedStyle(container).borderRadius) || 0;
    const arrowLeft = left < target.left ? target.left - left - radius * 2 : 0;

    container.classList.toggle('flipped', isFlipped);
    container.style.left = `${left + window.scrollX}px`;
    container.style.top = `${top + window.scrollY}px`;
    container.style.setProperty('--ui-popover-arrow-left', `${arrowLeft}px`);
  }

  private bindListeners() {
    this.ngZone.runOutsideAngular(() => {
      const onClick = (event: Event) => {
        const node = event.target as Node;

        if (!this.container?.nativeElement.contains(node) && !this.target?.contains(node)) {
          this.ngZone.run(() => this.hide());
        }
      };
      const onScroll = (event: Event) => {
        if (!this.container?.nativeElement.contains(event.target as Node)) {
          this.ngZone.run(() => this.hide());
        }
      };
      const onResize = () => this.ngZone.run(() => this.hide());

      document.addEventListener('click', onClick);
      window.addEventListener('scroll', onScroll, { capture: true, passive: true });
      window.addEventListener('resize', onResize);

      this.removeListeners = [
        () => document.removeEventListener('click', onClick),
        () => window.removeEventListener('scroll', onScroll, { capture: true }),
        () => window.removeEventListener('resize', onResize),
      ];
    });
  }

  private unbindListeners() {
    this.removeListeners.forEach((removeListener) => removeListener());
    this.removeListeners = [];
  }
}
