import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { SvgIconComponent } from 'angular-svg-icon';
import { CommonModule } from '@angular/common';
import { PopoverComponent } from '../../ui/popover';
import { TooltipDirective } from '../../ui/tooltip';
import { finalize, take } from 'rxjs/operators';
import { StaticConfigService } from '../../services/static.config.service';
import { ApiService } from '../../services/api.service';
import { SoundService } from '../../services/sound.service';
import { ConversationListItem } from '../../models/conversations-page';
import { Conversation } from '../../models/conversation';
import { ConversationFieldsConstants } from '../../constants/conversation-fields.constants';
import { AppConstants } from '../../constants/app.constants';
import { ConversationConstants } from '../../constants/conversation.constants';
import { DialogService } from '../../ui/dialog';
import { ConversationDialogComponent } from '../conversation-dialog/conversation-dialog';
import { ScrollTopComponent } from '../../ui/scroll-top';

@Component({
  selector: 'app-speech-exercise',
  imports: [CommonModule, PopoverComponent, TooltipDirective, SvgIconComponent, ScrollTopComponent],
  templateUrl: './speech-exercise.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./speech-exercise.scss'],
})
export class SpeechExerciseComponent implements OnInit {
  items: ConversationListItem[] = [];
  sortedItems: ConversationListItem[] = [];
  conversationConstants = ConversationConstants;
  appConstants = AppConstants;
  sortField = ConversationFieldsConstants.LAST_ACTIVITY_DATE;
  sortOrder = AppConstants.SORT_ORDER_DOWN;
  sortOptions = [
    { field: ConversationFieldsConstants.LAST_ACTIVITY_DATE, label: 'Last activity' },
    { field: ConversationFieldsConstants.CREATED_DATE, label: 'Created' },
    { field: ConversationFieldsConstants.TITLE, label: 'Title' },
  ];
  conversationIdToDelete: number | null = null;
  conversationFieldsConstants = ConversationFieldsConstants;
  isBusy = false;
  isLoaded = false;
  loadError = '';

  constructor(
    public readonly staticConfigService: StaticConfigService,
    private readonly dialogService: DialogService,
    private readonly apiService: ApiService,
    private readonly soundService: SoundService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    if (!this.staticConfigService.enableSpeechExercise) {
      this.router.navigate(['/']);
      return;
    }

    this.searchConversations();
  }

  onSort(field: string) {
    if (field === this.sortField) {
      this.sortOrder = -this.sortOrder;
    } else {
      this.sortField = field;
      this.sortOrder = AppConstants.SORT_ORDER_UP;
    }

    this.applySort();
  }

  get canCreateConversation() {
    return this.items.length < ConversationConstants.MAX_CONVERSATIONS_COUNT;
  }

  onOpenConversationDialog() {
    if (!this.canCreateConversation) {
      return;
    }

    this.openConversationDialog()
      ?.onClose.pipe(take(1))
      .subscribe((conversation: Conversation) => {
        if (conversation) {
          this.onOpenConversation(conversation.id);
        }
      });
  }

  onEditConversation(conversationId: number) {
    this.isBusy = true;
    this.apiService
      .getConversation(conversationId)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (conversation) => {
          this.openConversationDialog(conversation)
            ?.onClose.pipe(take(1))
            .subscribe((updated: Conversation) => {
              if (updated) {
                this.searchConversations();
              }
            });
        },
        error: (error) => {
          console.error(error.message);
        },
      });
  }

  private openConversationDialog(conversation?: Conversation) {
    return this.dialogService.open(ConversationDialogComponent, {
      header: 'Conversation',
      styleClass: 'conversation-dialog',
      data: { conversation: conversation },
    });
  }

  onOpenConversation(conversationId: number) {
    this.router.navigate(['/speech-exercise', conversationId]);
  }

  onConfirmDelete(event: Event, panel: any, conversationId: number) {
    this.conversationIdToDelete = conversationId;
    panel.show(event);
  }

  onDeleteConversation(panel: any) {
    if (!this.conversationIdToDelete) {
      return;
    }

    this.isBusy = true;
    this.apiService
      .deleteConversation(this.conversationIdToDelete)
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (_) => {
          this.soundService.delete();
          this.searchConversations();
        },
        error: (error) => {
          console.error(error.message);
        },
      });

    panel.hide();
  }

  isTruncated(element: HTMLElement) {
    return element.scrollHeight > element.clientHeight;
  }

  private applySort() {
    const field = this.sortField as keyof ConversationListItem;

    this.sortedItems = [...this.items].sort((a, b) => {
      const left = a[field];
      const right = b[field];
      const result =
        field === ConversationFieldsConstants.TITLE
          ? String(left).localeCompare(String(right))
          : new Date(left as Date).getTime() - new Date(right as Date).getTime();

      return result * this.sortOrder;
    });
  }

  onHome() {
    this.router.navigate(['/']);
  }

  private searchConversations() {
    if (!this.staticConfigService.enableSpeechExercise) {
      return;
    }

    this.isBusy = true;
    this.apiService
      .searchConversations(
        '',
        this.sortField,
        this.sortOrder === AppConstants.SORT_ORDER_UP ? 'asc' : 'desc',
        0,
        ConversationConstants.MAX_CONVERSATIONS_COUNT,
      )
      .pipe(
        take(1),
        finalize(() => {
          this.isBusy = false;
          this.isLoaded = true;
        }),
      )
      .subscribe({
        next: (page) => {
          this.loadError = '';
          this.items = page.items;
          this.applySort();
        },
        error: (error) => {
          this.loadError = 'Could not load conversations.';
          console.error(error.message);
        },
      });
  }
}
