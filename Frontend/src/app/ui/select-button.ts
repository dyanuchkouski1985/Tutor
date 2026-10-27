import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-select-button',
  template: `
    @for (option of options; track $index) {
      <button
        type="button"
        class="ui-togglebutton"
        [class.checked]="valueOf(option) === value"
        [class.small]="size === 'small'"
        [disabled]="isDisabled"
        [attr.aria-pressed]="valueOf(option) === value"
        (click)="select(option)"
      >
        <span class="ui-togglebutton-content">{{ labelOf(option) }}</span>
      </button>
    }
  `,
  host: { class: 'ui-selectbutton', role: 'group' },
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectButtonComponent),
      multi: true,
    },
  ],
})
export class SelectButtonComponent implements ControlValueAccessor {
  @Input() options: unknown[] = [];
  @Input() optionLabel?: string;
  @Input() optionValue?: string;
  @Input() size?: 'small';
  @Input() set disabled(value: boolean) {
    this.isInputDisabled = value;
  }

  @Output() selectionChange = new EventEmitter<unknown>();

  value: unknown = null;

  private isInputDisabled = false;
  private isFormDisabled = false;
  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  get isDisabled() {
    return this.isInputDisabled || this.isFormDisabled;
  }

  labelOf(option: unknown) {
    return this.field(option, this.optionLabel ?? 'label');
  }

  valueOf(option: unknown) {
    return this.field(option, this.optionValue ?? 'value');
  }

  private field(option: unknown, name: string) {
    return option !== null && typeof option === 'object' && name in option
      ? (option as Record<string, unknown>)[name]
      : option;
  }

  select(option: unknown) {
    const value = this.valueOf(option);

    this.onTouched();

    if (value === this.value) {
      return;
    }

    this.value = value;
    this.onChange(value);
    this.selectionChange.emit(value);
  }

  writeValue(value: unknown) {
    this.value = value;
  }

  registerOnChange(onChange: (value: unknown) => void) {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void) {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean) {
    this.isFormDisabled = isDisabled;
  }
}
