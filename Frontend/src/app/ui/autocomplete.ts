import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ContentChild,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  forwardRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface AutocompleteCompleteEvent {
  query: string;
}

const completeDelay = 300;

@Component({
  selector: 'app-autocomplete',
  imports: [NgTemplateOutlet],
  template: `
    <input
      #input
      type="text"
      class="ui-input ui-autocomplete-input"
      autocomplete="off"
      placeholder=" "
      role="combobox"
      [id]="inputId"
      [value]="value"
      [disabled]="isDisabled"
      [attr.aria-expanded]="!!panelView"
      (input)="onInput()"
      (keydown)="onKeydown($event)"
      (blur)="hide()"
    />

    <ng-template #panelTemplate>
      <ul class="ui-autocomplete-panel" role="listbox" (mousedown)="$event.preventDefault()">
        @for (option of suggestions; track $index; let index = $index) {
          <li
            class="ui-autocomplete-option"
            role="option"
            [class.focused]="index === focusedIndex()"
            [attr.aria-selected]="index === focusedIndex()"
            (mouseenter)="focusedIndex.set(index)"
            (click)="select(option)"
          >
            @if (itemTemplate) {
              <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: option }" />
            } @else {
              {{ labelOf(option) }}
            }
          </li>
        }
      </ul>
    </ng-template>
  `,
  host: { class: 'ui-autocomplete' },
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutocompleteComponent),
      multi: true,
    },
  ],
})
export class AutocompleteComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input() suggestions: unknown[] = [];
  @Input() optionLabel?: string;
  @Input() inputId = '';

  @Output() complete = new EventEmitter<AutocompleteCompleteEvent>();
  @Output() selected = new EventEmitter<unknown>();
  @Output() cleared = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  @ViewChild('input', { static: true }) input!: ElementRef<HTMLInputElement>;
  @ViewChild('panelTemplate', { static: true }) panelTemplate!: TemplateRef<unknown>;
  @ContentChild('item') itemTemplate?: TemplateRef<unknown>;

  value = '';
  isDisabled = false;
  focusedIndex = signal(-1);
  panelView: EmbeddedViewRef<unknown> | null = null;

  private completeTimer: ReturnType<typeof setTimeout> | undefined;
  private removeListeners: (() => void)[] = [];
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private readonly viewContainerRef: ViewContainerRef,
    private readonly ngZone: NgZone,
  ) {}

  ngOnChanges() {
    if (this.suggestions?.length && this.input.nativeElement === document.activeElement) {
      this.show();
    } else {
      this.hide();
    }
  }

  ngOnDestroy() {
    clearTimeout(this.completeTimer);
    this.hide();
  }

  labelOf(option: unknown) {
    return String(
      this.optionLabel ? (option as Record<string, unknown>)[this.optionLabel] : option,
    );
  }

  onInput() {
    this.value = this.input.nativeElement.value;
    this.onChange(this.value);
    clearTimeout(this.completeTimer);

    if (!this.value) {
      this.hide();
      this.cleared.emit();
      return;
    }

    this.completeTimer = setTimeout(() => this.complete.emit({ query: this.value }), completeDelay);
  }

  onKeydown(event: KeyboardEvent) {
    const count = this.panelView ? this.suggestions.length : 0;

    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.focusedIndex.update((index) => Math.min(index + 1, count - 1));
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.focusedIndex.update((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && count && this.focusedIndex() >= 0) {
      event.preventDefault();
      event.stopPropagation();
      this.select(this.suggestions[this.focusedIndex()]);
    } else if (event.key === 'Enter') {
      clearTimeout(this.completeTimer);
      this.hide();
      this.submitted.emit();
    } else if (event.key === 'Escape' && this.panelView) {
      event.stopPropagation();
      this.hide();
    }
  }

  select(option: unknown) {
    clearTimeout(this.completeTimer);
    this.value = this.labelOf(option);
    this.input.nativeElement.value = this.value;
    this.onChange(this.value);
    this.hide();
    this.selected.emit(option);
  }

  hide() {
    this.panelView?.destroy();
    this.panelView = null;
    this.focusedIndex.set(-1);
    this.removeListeners.forEach((removeListener) => removeListener());
    this.removeListeners = [];
    this.onTouched();
  }

  writeValue(value: string) {
    this.value = value ?? '';
  }

  registerOnChange(onChange: (value: string) => void) {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void) {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean) {
    this.isDisabled = isDisabled;
  }

  private show() {
    this.focusedIndex.set(-1);

    if (!this.panelView) {
      this.panelView = this.viewContainerRef.createEmbeddedView(this.panelTemplate);
      this.panelView.detectChanges();
      this.panelView.rootNodes.forEach((node) => document.body.appendChild(node));
      this.bindListeners();
    }

    this.align();
  }

  private align() {
    const panel = this.panelView?.rootNodes[0] as HTMLElement | undefined;

    if (!panel) {
      return;
    }

    const rect = this.input.nativeElement.getBoundingClientRect();

    panel.style.top = `${rect.bottom}px`;
    panel.style.left = `${rect.left}px`;
    panel.style.minWidth = `${rect.width}px`;
  }

  private bindListeners() {
    this.ngZone.runOutsideAngular(() => {
      const panel = this.panelView?.rootNodes[0] as HTMLElement;
      const onScroll = (event: Event) => {
        if (!panel.contains(event.target as Node)) {
          this.ngZone.run(() => this.hide());
        }
      };
      const onResize = () => this.ngZone.run(() => this.hide());

      window.addEventListener('scroll', onScroll, { capture: true, passive: true });
      window.addEventListener('resize', onResize);

      this.removeListeners = [
        () => window.removeEventListener('scroll', onScroll, { capture: true }),
        () => window.removeEventListener('resize', onResize),
      ];
    });
  }
}
