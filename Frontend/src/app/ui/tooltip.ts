import {
  booleanAttribute,
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
} from '@angular/core';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

const opposite: Record<TooltipPosition, TooltipPosition> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const leaveDuration = 150;

@Directive({
  selector: '[appTooltip]',
})
export class TooltipDirective implements OnInit, OnChanges, OnDestroy {
  @Input('appTooltip') text: string | null | undefined = '';
  @Input() tooltipPosition: TooltipPosition = 'right';
  @Input({ transform: booleanAttribute }) tooltipDisabled = false;

  private tooltip: HTMLElement | null = null;
  private removeListeners: (() => void)[] = [];

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      const host = this.elementRef.nativeElement;
      const show = () => this.show();
      const hide = () => this.hide();

      host.addEventListener('mouseenter', show);
      host.addEventListener('mouseleave', hide);
      host.addEventListener('click', hide);
      window.addEventListener('scroll', hide, { capture: true, passive: true });

      this.removeListeners = [
        () => host.removeEventListener('mouseenter', show),
        () => host.removeEventListener('mouseleave', hide),
        () => host.removeEventListener('click', hide),
        () => window.removeEventListener('scroll', hide, { capture: true }),
      ];
    });
  }

  ngOnChanges() {
    if (!this.tooltip) {
      return;
    }

    if (this.tooltipDisabled || !this.text) {
      this.hide();
    } else {
      this.render();
    }
  }

  ngOnDestroy() {
    this.hide();
    this.removeListeners.forEach((removeListener) => removeListener());
  }

  private show() {
    if (this.tooltipDisabled || !this.text) {
      return;
    }

    this.tooltip ??= document.body.appendChild(document.createElement('div'));
    this.render();
  }

  private hide() {
    const tooltip = this.tooltip;
    this.tooltip = null;

    if (!tooltip) {
      return;
    }

    tooltip.classList.add('ui-tooltip-leave');
    setTimeout(() => tooltip.remove(), leaveDuration);
  }

  private render() {
    const tooltip = this.tooltip!;
    const preferred = this.tooltipPosition;
    const positions: TooltipPosition[] = [
      preferred,
      opposite[preferred],
      ...(['top', 'bottom', 'right', 'left'] as TooltipPosition[]).filter(
        (position) => position !== preferred && position !== opposite[preferred],
      ),
    ];

    tooltip.replaceChildren();
    const arrow = tooltip.appendChild(document.createElement('div'));
    const text = tooltip.appendChild(document.createElement('div'));
    arrow.className = 'ui-tooltip-arrow';
    text.className = 'ui-tooltip-text';
    text.textContent = this.text ?? '';

    for (const position of positions) {
      tooltip.className = `ui-tooltip ui-tooltip-${position}`;
      if (this.place(tooltip, position)) {
        return;
      }
    }

    tooltip.className = `ui-tooltip ui-tooltip-${preferred}`;
    this.place(tooltip, preferred);
  }

  private place(tooltip: HTMLElement, position: TooltipPosition) {
    const host = this.elementRef.nativeElement.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const left =
      position === 'left'
        ? host.left - width
        : position === 'right'
          ? host.right
          : host.left + (host.width - width) / 2;
    const top =
      position === 'top'
        ? host.top - height
        : position === 'bottom'
          ? host.bottom
          : host.top + (host.height - height) / 2;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    return (
      left >= 0 &&
      top >= 0 &&
      left + width <= document.documentElement.clientWidth &&
      top + height <= document.documentElement.clientHeight
    );
  }
}
