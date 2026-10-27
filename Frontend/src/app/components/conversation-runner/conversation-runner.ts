import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SvgIconComponent } from 'angular-svg-icon';
import { TooltipDirective } from '../../ui/tooltip';
import { Subscription, firstValueFrom } from 'rxjs';
import { StaticConfigService } from '../../services/static.config.service';
import { ApiService } from '../../services/api.service';
import {
  SpeechPhrase,
  SpeechService,
  SpeechTranscript,
  VoiceAssignment,
} from '../../services/speech.service';
import { SoundService } from '../../services/sound.service';
import { UserStatisticsService } from '../../services/user-statistics.service';
import { Conversation, ConversationMessage } from '../../models/conversation';
import { MessageValidationStatusEnum } from '../../enums/message-validation-status.enum';
import { ConversationConstants } from '../../constants/conversation.constants';
import { DialogService } from '../../ui/dialog';
import { WordTranslationsDialogComponent } from '../word-translations-dialog/word-translations-dialog';
import { ScrollTopComponent } from '../../ui/scroll-top';
import { getTextBounds } from '../../core/text-selection';
import { AutoResizeDirective } from '../../ui/auto-resize';

@Component({
  selector: 'app-conversation-runner',
  imports: [
    AutoResizeDirective,
    CommonModule,
    FormsModule,
    TooltipDirective,
    SvgIconComponent,
    ScrollTopComponent,
  ],
  templateUrl: './conversation-runner.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./conversation-runner.scss'],
})
export class ConversationRunnerComponent implements OnInit, OnDestroy {
  @ViewChild('transcript') transcriptRef: ElementRef;
  @ViewChild('answer') answerRef: ElementRef;
  @ViewChild('selectionIcon', { read: ElementRef }) selectionIconRef: ElementRef;

  conversation: Conversation | null = null;
  messages: ConversationMessage[] = [];
  isUserTurn = false;
  pendingText = '';
  interimText = '';
  isListening = false;
  isFormatting = false;
  isBusy = false;
  isTurnFailed = false;
  error = '';
  selectedText = '';
  selectionTop = 0;
  selectionLeft = 0;
  selectionIconHeight = 40;
  selectionIconClip = 'none';
  messageValidationStatusEnum = MessageValidationStatusEnum;
  conversationConstants = ConversationConstants;

  private listenSubscription: Subscription | null = null;
  private voiceAssignments = new Map<number, VoiceAssignment>();
  private participantDescriptions = new Map<number, string>();
  private pendingMessageId = -1;
  private collapsedValidations = new Set<number>();
  private participantClasses = new Map<number, string>();
  private recognizedText = '';
  private recognizedAlternatives: string[] = [];
  private pendingTextBeforeListening = '';
  private interimResult: SpeechTranscript | null = null;
  private speakingMessageId: number | null = null;
  private speakingRequestId = 0;

  constructor(
    public readonly staticConfigService: StaticConfigService,
    public readonly speechService: SpeechService,
    private readonly apiService: ApiService,
    private readonly soundService: SoundService,
    private readonly userStatisticsService: UserStatisticsService,
    private readonly dialogService: DialogService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  @HostListener('document:selectionchange')
  @HostListener('window:scroll')
  @HostListener('window:resize')
  onSelectionChange() {
    const selection = document.getSelection();
    const text = selection?.toString().trim() ?? '';
    const transcript = this.transcriptRef?.nativeElement;

    if (!text || !selection?.rangeCount || !transcript) {
      this.selectedText = '';
      return;
    }

    const range = selection.getRangeAt(0);

    if (!transcript.contains(range.commonAncestorContainer)) {
      this.selectedText = '';
      return;
    }

    const rectangle = getTextBounds(range);

    if (!rectangle) {
      this.selectedText = '';
      return;
    }

    const visibleArea = transcript.getBoundingClientRect();
    this.selectionIconHeight =
      this.selectionIconRef?.nativeElement.offsetHeight || this.selectionIconHeight;
    const iconTop = rectangle.top - this.selectionIconHeight * 1.15;
    const iconBottom = iconTop + this.selectionIconHeight;

    if (iconBottom <= visibleArea.top || iconTop >= visibleArea.bottom) {
      this.selectedText = '';
      return;
    }

    const clipTop = Math.max(0, visibleArea.top - iconTop);
    const clipBottom = Math.max(0, iconBottom - visibleArea.bottom);

    this.selectedText = text;
    this.selectionTop = rectangle.top;
    this.selectionLeft = (rectangle.left + rectangle.right) / 2;
    this.selectionIconClip =
      clipTop || clipBottom ? `inset(${clipTop}px 0 ${clipBottom}px 0)` : 'none';
  }

  onOpenWordTranslationsDialog() {
    const word = this.selectedText;

    if (!word) {
      return;
    }

    this.selectedText = '';
    document.getSelection()?.removeAllRanges();

    this.dialogService.open(WordTranslationsDialogComponent, {
      header: 'Word',
      styleClass: 'word-translations-dialog',
      waitUntilReady: true,
      data: { word: word },
    });
  }

  ngOnInit() {
    if (!this.staticConfigService.enableSpeechExercise) {
      this.router.navigate(['/']);
      return;
    }

    const conversationId = Number(this.route.snapshot.paramMap.get('conversationId'));

    if (!conversationId) {
      this.onBack();
      return;
    }

    this.load(conversationId);
  }

  ngOnDestroy() {
    this.stopListening();
    this.stopSpeaking();
  }

  get canSend() {
    return this.isUserTurn && !this.isBusy && !!this.pendingText.trim();
  }

  onMicrophone() {
    if (this.isListening) {
      if (this.interimResult) {
        this.commitRecognized(this.interimResult);
      }

      this.stopListening();
      this.finishListening();
      return;
    }

    this.startListening();
  }

  onCancelListening() {
    if (!this.isListening) {
      return;
    }

    this.stopListening();

    this.pendingText = this.pendingTextBeforeListening;
    this.recognizedText = '';
    this.recognizedAlternatives = [];
  }

  get listeningText() {
    const heard = this.conversation?.autoFormat
      ? `${this.recognizedText} ${this.interimText}`.trim()
      : this.interimText;

    const status = this.speechService.localRecognitionStatus;

    return heard || (status ? `Listening (${status})...` : 'Listening...');
  }

  get canFormat() {
    return this.isUserTurn && !this.isBusy && !!this.pendingText.trim();
  }

  async onFormat() {
    if (!this.canFormat) {
      return;
    }

    this.stopListening();

    const text = this.pendingText.trim();

    await this.formatText(text, text === this.recognizedText ? this.recognizedAlternatives : []);
  }

  private async formatText(text: string, alternatives: string[]) {
    if (!this.conversation || !text) {
      return;
    }

    this.error = '';
    this.isFormatting = true;
    this.isBusy = true;

    try {
      const result = await firstValueFrom(
        this.apiService.formatConversationMessage(this.conversation.id, text, alternatives),
      );

      this.pendingText = result.error ? text : result.text;
      this.error = result.error ?? '';
    } catch (error: any) {
      this.pendingText = text;
      this.error = error.message;
    } finally {
      this.isFormatting = false;
      this.isBusy = false;
    }
  }

  async onSend() {
    if (!this.canSend || !this.conversation) {
      return;
    }

    this.stopListening();
    this.stopSpeaking();

    const text = this.pendingText.trim();

    this.collapseValidations();

    const pendingMessage = this.addPendingMessage(text);
    let turn;

    this.pendingText = '';
    this.recognizedText = '';
    this.recognizedAlternatives = [];
    this.error = '';
    this.isBusy = true;

    try {
      turn = await firstValueFrom(
        this.apiService.postConversationMessage(this.conversation.id, text),
      );
    } catch (error: any) {
      this.error = error.message;
      this.restorePendingMessage(pendingMessage, text);
      return;
    } finally {
      this.isBusy = false;
    }

    if (turn.error) {
      this.error = turn.error;
      this.isUserTurn = turn.isUserTurn;
      this.restorePendingMessage(pendingMessage, text);
      this.soundService.error();
      return;
    }

    if (turn.message) {
      this.messages = this.messages.map((message) =>
        message === pendingMessage ? turn.message : message,
      );
      this.scrollToAnswer();
    } else {
      this.restorePendingMessage(pendingMessage, text);
    }

    this.isUserTurn = turn.isUserTurn;

    if (turn.message?.points) {
      this.userStatisticsService.refresh();
    }

    await this.runTurns();
  }

  participantClass(participantId: number) {
    return this.participantClasses.get(participantId) ?? '';
  }

  isValidationCollapsed(messageId: number) {
    return this.collapsedValidations.has(messageId);
  }

  onToggleValidation(messageId: number) {
    if (this.collapsedValidations.has(messageId)) {
      this.collapsedValidations.delete(messageId);
      return;
    }

    this.collapsedValidations.add(messageId);
  }

  participantDescription(participantId: number) {
    return this.participantDescriptions.get(participantId) ?? '';
  }

  isSpeaking(message: ConversationMessage) {
    return this.speakingMessageId === message.id;
  }

  onSpeakMessage(message: ConversationMessage) {
    if (this.isSpeaking(message)) {
      this.stopSpeaking();
      return;
    }

    this.speakMessage(message);
  }

  async onRetryTurns() {
    if (!this.isTurnFailed || this.isBusy) {
      return;
    }

    this.error = '';
    await this.runTurns();
  }

  onBack() {
    this.router.navigate(['/speech-exercise']);
  }

  verdictIconSrc(validationStatus: MessageValidationStatusEnum) {
    switch (validationStatus) {
      case MessageValidationStatusEnum.Ok:
        return '../../../assets/images/svg/check.svg';
      case MessageValidationStatusEnum.HasErrors:
        return '../../../assets/images/svg/cross.svg';
      default:
        return '../../../assets/images/svg/help.svg';
    }
  }

  private async load(conversationId: number) {
    this.isBusy = true;

    try {
      this.conversation = await firstValueFrom(this.apiService.getConversation(conversationId));
      this.messages = this.conversation.messages ?? [];
      this.isUserTurn = this.conversation.isUserTurn;
      this.collapseValidations();
      this.applyParticipants();
    } catch (error: any) {
      this.error = error.message;
      return;
    } finally {
      this.isBusy = false;
    }

    this.scrollToAnswer();

    if (!this.isUserTurn) {
      await this.runTurns();
      return;
    }

    if (this.messages.length) {
      this.speakMessage(this.messages[this.messages.length - 1]);
    }
  }

  private async runTurns() {
    if (!this.conversation) {
      return;
    }

    this.isTurnFailed = false;

    for (
      let turnIndex = 0;
      turnIndex < ConversationConstants.MAX_AI_TURNS_PER_ROUND && !this.isUserTurn;
      turnIndex++
    ) {
      let turn;

      this.isBusy = true;

      try {
        turn = await firstValueFrom(this.apiService.getConversationTurn(this.conversation.id));
      } catch (error: any) {
        this.error = error.message;
        this.isTurnFailed = true;
        return;
      } finally {
        this.isBusy = false;
      }

      if (turn.error) {
        this.error = turn.error;
        this.isTurnFailed = true;
        this.soundService.error();
        return;
      }

      this.isUserTurn = turn.isUserTurn;

      if (turn.newParticipant) {
        this.conversation.participants = [...this.conversation.participants, turn.newParticipant];
        this.applyParticipants();
      }

      if (!turn.message) {
        return;
      }

      this.messages = [...this.messages, turn.message];
      this.scrollToAnswer();

      await this.speakMessage(turn.message);
    }
  }

  private async speakMessage(message: ConversationMessage) {
    if (!this.conversation) {
      return;
    }

    const speakingRequestId = ++this.speakingRequestId;

    this.speakingMessageId = message.id;

    await this.speechService.speak(
      message.text,
      this.conversation.language,
      this.voiceAssignments.get(message.participantId),
    );

    if (speakingRequestId === this.speakingRequestId) {
      this.speakingMessageId = null;
    }
  }

  private stopSpeaking() {
    this.speakingRequestId++;
    this.speakingMessageId = null;
    this.speechService.stopSpeaking();
  }

  private scrollToAnswer() {
    setTimeout(() => {
      const transcript = this.transcriptRef?.nativeElement;

      if (transcript) {
        transcript.scrollTop = transcript.scrollHeight;
      }

      this.answerRef?.nativeElement?.scrollIntoView({ block: 'end' });
    });
  }

  private startListening() {
    if (!this.conversation || !this.speechService.isListeningSupported) {
      return;
    }

    this.stopSpeaking();

    this.error = '';
    this.interimText = '';
    this.isListening = true;
    this.pendingTextBeforeListening = this.pendingText;

    this.listenSubscription = this.speechService
      .listen(this.conversation.language, this.buildPhrases())
      .subscribe({
        next: (result) => {
          this.interimText = result.transcript;

          if (!result.isFinal) {
            this.interimResult = result.transcript.trim() ? result : null;
            return;
          }

          this.commitRecognized(result);
          this.interimText = '';
        },
        error: (error) => {
          this.error = error.message;
          this.isListening = false;
          this.interimText = '';
        },
        complete: () => {
          this.isListening = false;
          this.interimText = '';
          this.finishListening();
        },
      });
  }

  private applyParticipants() {
    const participants = this.conversation?.participants ?? [];

    this.voiceAssignments = this.speechService.assignVoices(participants);
    this.participantDescriptions = new Map(
      participants.map((participant) => [participant.id, participant.description ?? '']),
    );
    this.assignParticipantClasses();
  }

  private assignParticipantClasses() {
    const participants = [...(this.conversation?.participants ?? [])].sort(
      (first, second) => first.id - second.id,
    );
    const others = participants.filter((participant) => !participant.isUser);

    this.participantClasses = new Map(
      participants.map((participant) => [
        participant.id,
        participant.isUser
          ? ''
          : `participant-message-${others.indexOf(participant) % ConversationConstants.MESSAGE_COLORS_COUNT}`,
      ]),
    );
  }

  private buildPhrases() {
    const phrases = new Map<string, SpeechPhrase>();

    for (const participant of this.conversation?.participants ?? []) {
      this.addPhrase(phrases, participant.name, ConversationConstants.NAME_PHRASE_BOOST);
    }

    const words = (this.conversation?.context ?? '')
      .split(/[^\p{L}\p{N}'-]+/u)
      .filter((word) => word.length >= ConversationConstants.MIN_RECOGNITION_PHRASE_LENGTH);

    for (const word of words) {
      this.addPhrase(phrases, word, ConversationConstants.CONTEXT_PHRASE_BOOST);
    }

    return [...phrases.values()].slice(0, ConversationConstants.MAX_RECOGNITION_PHRASES);
  }

  private addPhrase(phrases: Map<string, SpeechPhrase>, text: string, boost: number) {
    const phrase = text?.trim();

    if (!phrase || phrases.has(phrase.toLowerCase())) {
      return;
    }

    phrases.set(phrase.toLowerCase(), { text: phrase, boost: boost });
  }

  private commitRecognized(result: SpeechTranscript) {
    this.interimResult = null;
    this.appendRecognized(result);

    if (!this.conversation?.autoFormat) {
      this.pendingText = `${this.pendingText} ${result.transcript}`.trim();
    }
  }

  private appendRecognized(result: SpeechTranscript) {
    const previous = [this.recognizedText, ...this.recognizedAlternatives];
    const variants = [result.transcript, ...result.alternatives];
    const merged: string[] = [];

    for (let order = 0; order < Math.max(previous.length, variants.length); order++) {
      const head = previous[Math.min(order, previous.length - 1)];
      const tail = variants[Math.min(order, variants.length - 1)];
      const line = `${head} ${tail}`.trim();

      if (line && !merged.includes(line)) {
        merged.push(line);
      }
    }

    this.recognizedText = merged[0] ?? '';
    this.recognizedAlternatives = merged.slice(1);
  }

  private async autoFormat() {
    if (!this.conversation?.autoFormat) {
      return;
    }

    const text = this.recognizedText;
    const alternatives = this.recognizedAlternatives;

    this.recognizedText = '';
    this.recognizedAlternatives = [];
    await this.formatText(text, alternatives);
  }

  private async finishListening() {
    await this.autoFormat();

    if (this.conversation?.sendImmediately) {
      await this.onSend();
    }
  }

  private collapseValidations() {
    this.collapsedValidations = new Set(
      this.messages
        .filter((message) => message.validationErrors.length)
        .map((message) => message.id),
    );
  }

  private addPendingMessage(text: string) {
    const learner = this.conversation?.participants.find((participant) => participant.isUser);

    const message: ConversationMessage = {
      id: this.pendingMessageId--,
      participantId: learner?.id ?? 0,
      participantName: learner?.name ?? '',
      isUser: true,
      text: text,
      createdDate: new Date(),
      validationStatus: MessageValidationStatusEnum.NotApplicable,
      validationSummary: '',
      validationErrors: [],
      points: 0,
    };

    this.messages = [...this.messages, message];
    this.scrollToAnswer();

    return message;
  }

  private restorePendingMessage(message: ConversationMessage, text: string) {
    this.messages = this.messages.filter((existing) => existing !== message);
    this.pendingText = text;
  }

  private stopListening() {
    this.listenSubscription?.unsubscribe();
    this.listenSubscription = null;
    this.speechService.stopListening();
    this.isListening = false;
    this.interimText = '';
    this.interimResult = null;
  }
}
