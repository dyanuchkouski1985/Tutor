import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subscription, timer } from 'rxjs';
import Tasks from '../../../assets/data/tasks-b6.json';
//import Tasks from "../../../assets/data/Vova/English/1.json";
//import Tasks from "../../../assets/data/pl/all/1.json";
import { FailedTask, ResultComponent } from '../result/result';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { SoundService } from '../../services/sound.service';

import { RoundProgressModule } from 'angular-svg-round-progressbar';
import { ProgressBarComponent } from '../../ui/progress-bar';
import { SvgIconComponent } from 'angular-svg-icon';
import { FormsModule } from '@angular/forms';
import { AutoFocusDirective } from '../../ui/auto-focus';

interface ITask {
  question: string;
  answer: string;
  extendedAnswer?: string;
  answerAsHtml?: string;
}

@Component({
  selector: 'app-test',
  imports: [
    AutoFocusDirective,
    FormsModule,
    RoundProgressModule,
    ProgressBarComponent,
    SvgIconComponent,
    ResultComponent,
  ],
  templateUrl: './test.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./test.scss'],
})
export class TestComponent implements OnInit, OnDestroy {
  tasks: ITask[] = Tasks;
  failedTasks: FailedTask[] = [];
  answer = '';
  questionIndex = 0;
  formattedQuestion = '';
  formattedAnswer = '';
  showAnswer = false;
  doNotKnow = false;
  isCorrectAnswer = false;
  answersHistory: boolean[] = [];
  private subscriptions = new Subscription();
  private timerSubscription: Subscription | null = null;
  public config = {
    tasks: {
      shuffle: true,
      reverse: false,
      take: 1000,
      math: true,
    },
    shuffleTasks: true,
    timer: {
      enable: true,
      valueInSeconds: 30,
      warningTimeInSeconds: 20,
      showSeconds: true,
    },
    identity: 'https://localhost:7008/',
    api: 'https://localhost:7151/api/',
    allowEditTranslations: true,
  };
  remainingTime: number = this.config.timer.valueInSeconds;

  @ViewChild('submitButton') submitButtonRef?: ElementRef;

  constructor(
    public dynamicConfigService: DynamicConfigService,
    private soundService: SoundService,
  ) {}

  ngOnInit() {
    if (this.config.tasks.math) {
      this.tasks = this.generateMathTasks();
    } else {
      if (this.config.shuffleTasks) {
        this.tasks = this.tasks.sort(() => Math.random() - 0.5);
      }
      if (this.config.tasks.take > 0) {
        this.tasks = this.tasks.slice(0, this.config.tasks.take);
      }
      if (this.config.tasks.reverse) {
        this.tasks = this.tasks.map((t) => {
          const answer = t.answer;
          t.answer = t.question;
          t.question = answer;
          return t;
        });
      }
    }

    if (this.config.timer.enable) {
      this.subscriptions.add(
        (this.timerSubscription = timer(0, 1000).subscribe(this.onTimer.bind(this))),
      );
    }
  }

  onNext() {
    if (this.showAnswer) {
      this.answer = '';
      if (this.config.timer.enable && this.questionIndex < this.tasks.length) {
        this.subscriptions.add(
          (this.timerSubscription = timer(0, 1000).subscribe(this.onTimer.bind(this))),
        );
      }
      if (this.questionIndex == this.tasks.length) {
        this.failedTasks.length == 0 ? this.soundService.celebrate() : this.soundService.finish();
      }
    } else {
      this.answer = this.answer.trim();
      if (this.doNotKnow) {
        this.answer = '';
        this.doNotKnow = false;
      } else if (this.answer == '' && (!this.config.timer.enable || this.remainingTime != 0)) {
        return;
      }

      if (this.config.timer.enable && this.timerSubscription) {
        this.soundService.clockTickingReset();
        this.timerSubscription.unsubscribe();
        this.timerSubscription = null;
      }

      const task = this.tasks[this.questionIndex];
      const formattedQuestion = task.question;
      this.isCorrectAnswer =
        (!!task.extendedAnswer && this.answer === task.extendedAnswer) ||
        this.answer === task.answer;
      this.answersHistory.push(this.isCorrectAnswer);
      if (this.isCorrectAnswer) {
        this.soundService.correct();
      } else {
        this.soundService.error();
        this.failedTasks.push(
          new FailedTask(formattedQuestion, `${task.answer} (no '${this.answer}')`),
        );
      }
      this.submitButtonRef?.nativeElement.focus();
      this.formattedQuestion = formattedQuestion;
      this.formattedAnswer =
        (task.answerAsHtml || task.extendedAnswer || task.answer) +
        (this.isCorrectAnswer ? '' : ` (no '${this.answer}')`);
      this.questionIndex++;
    }

    this.showAnswer = !this.showAnswer;
  }

  onDoNotKnow() {
    this.doNotKnow = true;
    this.onNext();
  }

  private onTimer(val: number) {
    this.remainingTime = this.config.timer.valueInSeconds - val;
    if (this.remainingTime === this.config.timer.warningTimeInSeconds) {
      this.soundService.beep();
    } else if (this.remainingTime == 12) {
      this.soundService.clockTicking();
    }
    if (this.remainingTime === 0) {
      this.timerSubscription?.unsubscribe();
      this.timerSubscription = null;
      this.onNext();
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private generateMathTasks(): ITask[] {
    const tasks: ITask[] = [];
    for (let i = 0; i < 3; i++) {
      tasks.push(this.generateRomanToDecimalTask());
      tasks.push(this.generateAddTask());
      tasks.push(this.generateSubtractTask());
      tasks.push(this.generateComparisonTask());
      tasks.push(this.generateRestTask());
      tasks.push(this.generateMultipleTask());
      tasks.push(this.generateDivideTask());
    }

    return tasks;
  }

  private generateAddTask(): ITask {
    const task: ITask = {} as ITask;
    const number1 = Math.floor(10 + Math.random() * 990); // 10..999
    const number2 = Math.floor(10 + Math.random() * (999 - number1));
    task.answer = `${number1 + number2}`;
    task.question = `${number1} + ${number2} =`;
    return task;
  }

  private generateSubtractTask(): ITask {
    const task: ITask = {} as ITask;
    const number1 = Math.floor(10 + Math.random() * 990); // 10..999
    const number2 = Math.floor(number1 + Math.random() * (999 - number1));
    task.answer = `${number2 - number1}`;
    task.question = `${number2} - ${number1} =`;
    return task;
  }

  private generateComparisonTask(): ITask {
    const task: ITask = {} as ITask;

    const task1 = this.generateRandomTaskForComparisonOperation();
    const task2 = this.generateRandomTaskForComparisonOperation();

    task.question = `${task1.question.substring(0, task1.question.length - 1)} ? ${task2.question.substring(0, task2.question.length - 1)}`;
    if (task1.answer === task2.answer) {
      task.answer = '=';
    } else {
      if (parseInt(task1.answer) < parseInt(task2.answer)) {
        task.answer = '<';
      } else {
        task.answer = '>';
      }
    }
    return task;
  }

  private generateMultipleTask(): ITask {
    const task: ITask = {} as ITask;
    const number1 = Math.floor(3 + Math.random() * 97);
    const number2 = Math.floor(3 + Math.random() * 7);
    task.answer = `${number1 * number2}`;
    task.question = `${number1} * ${number2} =`;
    return task;
  }

  private generateDivideTask(): ITask {
    const task: ITask = {} as ITask;
    const number1 = Math.floor(3 + Math.random() * 7);
    const number2 = Math.floor(3 + Math.random() * 97);
    const multiplicationResult = number1 * number2;
    task.answer = `${number2}`;
    task.question = `${multiplicationResult} / ${number1} =`;
    return task;
  }

  private generateRestTask(): ITask {
    const task: ITask = {} as ITask;
    const number1 = Math.floor(3 + Math.random() * 7);
    const number2 = Math.floor(3 + Math.random() * 97);
    const rest = Math.floor(1 + Math.random() * (number1 - 1));
    const multiplicationResult = number1 * number2 + rest;
    task.answer = `${number2} r${rest}`;
    task.question = `${multiplicationResult} / ${number1} =`;
    return task;
  }

  private generateRomanToDecimalTask(): ITask {
    const task: ITask = {} as ITask;
    const number = Math.floor(1 + Math.random() * 3000);
    const roman = this.toRoman(number);

    task.answer = `${number}`;
    task.question = `${roman} =`;

    return task;
  }

  private generateRandomTaskForComparisonOperation(): ITask {
    if (Math.floor(Math.random() * 2)) {
      return this.generateAddTask();
    }

    return this.generateSubtractTask();
  }

  private generateRandomTask(): ITask {
    switch (Math.floor(Math.random() * 4)) {
      case 0:
        return this.generateDivideTask();
      case 1:
        return this.generateMultipleTask();
      case 2:
        return this.generateSubtractTask();
    }

    return this.generateAddTask();
  }

  private toRoman(num: number): string {
    const map: { value: number; roman: string }[] = [
      { value: 1000, roman: 'M' },
      { value: 900, roman: 'CM' },
      { value: 500, roman: 'D' },
      { value: 400, roman: 'CD' },
      { value: 100, roman: 'C' },
      { value: 90, roman: 'XC' },
      { value: 50, roman: 'L' },
      { value: 40, roman: 'XL' },
      { value: 10, roman: 'X' },
      { value: 9, roman: 'IX' },
      { value: 5, roman: 'V' },
      { value: 4, roman: 'IV' },
      { value: 1, roman: 'I' },
    ];

    let res = '';
    for (const item of map) {
      while (num >= item.value) {
        res += item.roman;
        num -= item.value;
      }
    }
    return res;
  }
}
