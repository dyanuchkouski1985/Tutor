import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export class FailedTask {
  constructor(
    public readonly questionAsHtml: string,
    public readonly answerAsHtml: string,
  ) {}
}

@Component({
  selector: 'app-result',
  imports: [],
  templateUrl: './result.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./result.scss'],
})
export class ResultComponent {
  @Input() correctAnswers: number = 0;
  @Input() failedTasks: FailedTask[] = [];
}
