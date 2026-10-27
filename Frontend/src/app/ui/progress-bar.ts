import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  template: `
    <div class="ui-progressbar-value" [style.width.%]="value">
      <div class="ui-progressbar-label"><ng-content /></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'ui-progressbar',
    role: 'progressbar',
    '[attr.aria-valuenow]': 'value',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
  },
})
export class ProgressBarComponent {
  @Input() value = 0;
}
