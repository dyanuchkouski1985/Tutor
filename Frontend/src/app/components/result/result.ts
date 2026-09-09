import { Component, Input } from '@angular/core';

import { ButtonModule } from 'primeng/button';

export class FailedTask {
  constructor(
    public readonly questionAsHtml: string,
    public readonly answerAsHtml: string,
  ) {}
}

@Component({
  selector: 'app-result',
  imports: [ButtonModule],
  templateUrl: './result.html',
  styleUrls: ['./result.scss'],
})
export class ResultComponent {
  @Input() correctAnswers: number = 0;
  @Input() failedTasks: FailedTask[] = [];
}
