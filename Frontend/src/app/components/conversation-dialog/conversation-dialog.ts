import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogConfig, DialogRef } from '../../ui/dialog';
import { SelectButtonComponent } from '../../ui/select-button';
import { ToastComponent, ToastService } from '../../ui/toast';
import { TooltipDirective } from '../../ui/tooltip';
import { SvgIconComponent } from 'angular-svg-icon';
import { finalize, take } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { SoundService } from '../../services/sound.service';
import { DynamicConfigService } from '../../services/dynamic.config.service';
import { Observable } from 'rxjs';
import {
  Conversation,
  ConversationSetupIssue,
  CreateConversationResult,
  UpdateConversationParticipant,
  UpdateConversationResult,
} from '../../models/conversation';
import { ConversationConstants } from '../../constants/conversation.constants';
import { ParticipantGenderEnum } from '../../enums/participant-gender.enum';
import { WordLearningProgressEnum } from '../../enums/word-learning-progress.enum';
import { StarComponent } from '../star/star';
import { AutoFocusDirective } from '../../ui/auto-focus';

@Component({
  selector: 'app-conversation-dialog',
  imports: [
    AutoFocusDirective,
    CommonModule,
    FormsModule,
    SelectButtonComponent,
    ToastComponent,
    TooltipDirective,
    SvgIconComponent,
    StarComponent,
  ],
  templateUrl: './conversation-dialog.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./conversation-dialog.scss'],
})
export class ConversationDialogComponent {
  context = '';
  userParticipant: UpdateConversationParticipant = {
    id: 0,
    name: 'Me',
    description: '',
    isUser: true,
    gender: ParticipantGenderEnum.Unspecified,
  };
  otherParticipants: UpdateConversationParticipant[] = [
    { id: 0, name: '', description: '', isUser: false, gender: ParticipantGenderEnum.Unspecified },
  ];
  conversationId = 0;
  autoFormat = true;
  useLearningWords = true;
  sendImmediately = true;
  reason = '';
  contextIssue: ConversationSetupIssue | null = null;
  participantIssues = new Map<UpdateConversationParticipant, ConversationSetupIssue>();
  conversationConstants = ConversationConstants;
  wordLearningProgressEnum = WordLearningProgressEnum;
  isBusy = false;
  genderOptions = [
    { label: 'Auto', value: ParticipantGenderEnum.Unspecified },
    { label: 'Male', value: ParticipantGenderEnum.Male },
    { label: 'Female', value: ParticipantGenderEnum.Female },
  ];

  constructor(
    private readonly dialogRef: DialogRef,
    private readonly apiService: ApiService,
    private readonly soundService: SoundService,
    private readonly toastService: ToastService,
    dynamicConfigService: DynamicConfigService,
    dialogConfig: DialogConfig,
  ) {
    const conversation: Conversation = dialogConfig.data?.conversation;

    if (!conversation) {
      this.userParticipant.gender = dynamicConfigService.gender;
      return;
    }

    this.conversationId = conversation.id;
    this.context = conversation.context;
    this.autoFormat = conversation.autoFormat;
    this.useLearningWords = conversation.useLearningWords;
    this.sendImmediately = conversation.sendImmediately;

    const participants = [...conversation.participants].map((participant) => ({
      id: participant.id,
      name: participant.name,
      description: participant.description ?? '',
      isUser: participant.isUser,
      gender: participant.gender,
    }));

    this.userParticipant =
      participants.find((participant) => participant.isUser) ?? this.userParticipant;
    this.otherParticipants = participants.filter((participant) => !participant.isUser);
  }

  get isEditing() {
    return this.conversationId > 0;
  }

  get isValid() {
    const participants = this.buildParticipants();
    const names = participants.map((participant) => participant.name.trim().toLowerCase());

    return (
      !!this.context.trim() &&
      names.every((name) => !!name) &&
      new Set(names).size === names.length &&
      participants.every((participant) => !!participant.description.trim())
    );
  }

  get canAddParticipant() {
    return (
      !this.isEditing &&
      this.buildParticipants().length < ConversationConstants.MAX_PARTICIPANTS_COUNT
    );
  }

  get canRemoveParticipant() {
    return (
      !this.isEditing &&
      this.buildParticipants().length > ConversationConstants.MIN_PARTICIPANTS_COUNT
    );
  }

  onAddParticipant() {
    if (this.canAddParticipant) {
      this.otherParticipants.push({
        id: 0,
        name: '',
        description: '',
        isUser: false,
        gender: ParticipantGenderEnum.Unspecified,
      });
    }
  }

  onRemoveParticipant(index: number) {
    if (this.canRemoveParticipant) {
      this.otherParticipants.splice(index, 1);
    }
  }

  onGenerate() {
    if (this.isEditing || this.isBusy) {
      return;
    }

    this.clearIssues();
    this.isBusy = true;

    this.apiService
      .generateConversation(this.userParticipant.name.trim(), this.context.trim())
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.reason = result.error;
            this.soundService.error();
            return;
          }

          this.context = result.context;
          this.userParticipant.description = result.learnerDescription ?? '';
          this.otherParticipants = result.participants.map((participant) => ({
            id: 0,
            name: participant.name,
            description: participant.description ?? '',
            isUser: false,
            gender: participant.gender,
          }));
        },
        error: (error) => {
          this.toastService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message,
            life: 3000,
          });
        },
      });
  }

  onSave() {
    if (!this.isValid) {
      return;
    }

    this.clearIssues();
    this.isBusy = true;

    const request: Observable<CreateConversationResult | UpdateConversationResult> = this.isEditing
      ? this.apiService.updateConversation(
          this.conversationId,
          this.context.trim(),
          this.autoFormat,
          this.useLearningWords,
          this.sendImmediately,
          this.buildParticipants(),
        )
      : this.apiService.createConversation(
          this.context.trim(),
          this.autoFormat,
          this.useLearningWords,
          this.sendImmediately,
          this.buildParticipants(),
        );

    request
      .pipe(
        take(1),
        finalize(() => (this.isBusy = false)),
      )
      .subscribe({
        next: (result) => {
          const isSaved = 'isCreated' in result ? result.isCreated : result.isUpdated;

          if (!isSaved) {
            this.reason = result.reason;
            this.applyIssues(result.issues ?? []);
            this.soundService.error();
            return;
          }

          this.dialogRef.close(result.conversation);
        },
        error: (error) => {
          this.toastService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message,
            life: 3000,
          });
        },
      });
  }

  participantIssue(participant: UpdateConversationParticipant) {
    return this.participantIssues.get(participant) ?? null;
  }

  onContextChange() {
    this.contextIssue = null;
  }

  onParticipantChange(participant: UpdateConversationParticipant) {
    this.participantIssues.delete(participant);
  }

  private applyIssues(issues: ConversationSetupIssue[]) {
    const participants = this.buildParticipants();

    for (const issue of issues) {
      if (!issue.participantName) {
        this.contextIssue ??= issue;
        continue;
      }

      const participant = participants.find(
        (candidate) =>
          candidate.name.trim().toLowerCase() === issue.participantName.trim().toLowerCase(),
      );

      if (participant && !this.participantIssues.has(participant)) {
        this.participantIssues.set(participant, issue);
      }
    }
  }

  private clearIssues() {
    this.reason = '';
    this.contextIssue = null;
    this.participantIssues = new Map();
  }

  private buildParticipants(): UpdateConversationParticipant[] {
    return [this.userParticipant, ...this.otherParticipants];
  }
}
