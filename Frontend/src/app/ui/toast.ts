import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  ContentChild,
  Injectable,
  Input,
  OnDestroy,
  signal,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface ToastMessage {
  key?: string;
  severity?: 'success' | 'info' | 'warn' | 'error';
  summary?: string;
  detail?: string;
  life?: number;
  closable?: boolean;
  data?: any;
}

interface ShownToastMessage extends ToastMessage {
  id: number;
}

const defaultLife = 3000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ShownToastMessage[]>([]);

  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  add(message: ToastMessage) {
    const shown = { ...message, id: this.nextId++ };

    this.messages.update((messages) => [...messages, shown]);
    this.startTimer(shown);
  }

  remove(id: number) {
    this.stopTimer(id);
    this.messages.update((messages) => messages.filter((message) => message.id !== id));
  }

  pause(id: number) {
    this.stopTimer(id);
  }

  resume(message: ShownToastMessage) {
    this.startTimer(message);
  }

  private startTimer(message: ShownToastMessage) {
    this.stopTimer(message.id);
    this.timers.set(
      message.id,
      setTimeout(() => this.remove(message.id), message.life ?? defaultLife),
    );
  }

  private stopTimer(id: number) {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }
}

@Component({
  selector: 'app-toast',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="ui-toast ui-toast-{{ position }}">
      @for (message of messages(); track message.id) {
        <div
          class="ui-toast-message ui-toast-message-{{ message.severity ?? 'info' }} {{
            messageClass
          }}"
          role="alert"
          (mouseenter)="toastService.pause(message.id)"
          (mouseleave)="toastService.resume(message)"
        >
          <div class="ui-toast-message-content">
            @if (template) {
              <ng-container
                *ngTemplateOutlet="template; context: { $implicit: message }"
              ></ng-container>
            } @else {
              <svg class="ui-toast-icon" viewBox="0 0 18 18" aria-hidden="true">
                <circle
                  cx="9"
                  cy="9"
                  r="7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                @if (message.severity === 'success') {
                  <path
                    d="M5.5 9.2 8 11.5 12.5 6.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                } @else {
                  <path
                    d="M9 5v5M9 12.5v.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                }
              </svg>
              <div class="ui-toast-text">
                @if (message.summary) {
                  <div class="ui-toast-summary">{{ message.summary }}</div>
                }
                @if (message.detail) {
                  <div class="ui-toast-detail">{{ message.detail }}</div>
                }
              </div>
            }
            @if (message.closable !== false) {
              <button
                type="button"
                class="ui-toast-close"
                aria-label="Close"
                (click)="toastService.remove(message.id)"
              >
                <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                  <path
                    d="M3 3 11 11M11 3 3 11"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastComponent implements OnDestroy {
  @Input() key?: string;
  @Input() position: 'top-center' | 'top-right' | 'bottom-left' = 'top-right';
  @Input() messageClass = '';

  @ContentChild('message') template?: TemplateRef<unknown>;

  messages = computed(() =>
    this.toastService.messages().filter((message) => message.key === this.key),
  );

  constructor(readonly toastService: ToastService) {}

  ngOnDestroy() {
    this.messages().forEach((message) => this.toastService.remove(message.id));
  }
}
