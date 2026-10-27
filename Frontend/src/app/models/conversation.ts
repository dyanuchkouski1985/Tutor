import { LanguageEnum } from '../enums/language.enum';
import { MessageValidationStatusEnum } from '../enums/message-validation-status.enum';
import { ParticipantGenderEnum } from '../enums/participant-gender.enum';
import { ParticipantVoiceEnum } from '../enums/participant-voice.enum';

export class Conversation {
  id: number;
  title: string;
  context: string;
  autoFormat: boolean;
  sendImmediately: boolean;
  useLearningWords: boolean;
  language: LanguageEnum;
  createdDate: Date;
  lastActivityDate: Date;
  isUserTurn: boolean;
  participants: ConversationParticipant[] = [];
  messages: ConversationMessage[] = [];
}

export class ConversationParticipant {
  id: number;
  name: string;
  description: string;
  isUser: boolean;
  gender: ParticipantGenderEnum;
  voice: ParticipantVoiceEnum;
}

export class ConversationMessage {
  id: number;
  participantId: number;
  participantName: string;
  isUser: boolean;
  text: string;
  createdDate: Date;
  validationStatus: MessageValidationStatusEnum;
  validationSummary: string;
  validationErrors: ConversationValidationError[] = [];
  points: number;
}

export class ConversationValidationError {
  fragment: string;
  correction: string;
  explanation: string;
}

export class FormatConversationMessageResult {
  text: string;
  error: string;
}

export class GenerateConversationResult {
  context: string;
  learnerDescription: string;
  participants: GeneratedConversationParticipant[] = [];
  error: string;
}

export class GeneratedConversationParticipant {
  name: string;
  description: string;
  gender: ParticipantGenderEnum;
}

export class ConversationTurn {
  isUserTurn: boolean;
  message: ConversationMessage;
  newParticipant: ConversationParticipant | null;
  error: string;
}

export class CreateConversationParticipant {
  name = '';
  description = '';
  isUser = false;
  gender = ParticipantGenderEnum.Unspecified;
}

export class UpdateConversationParticipant extends CreateConversationParticipant {
  id = 0;
}

export class ConversationSetupIssue {
  participantName: string;
  problem: string;
  suggestion: string;
}

export class CreateConversationResult {
  isCreated: boolean;
  reason: string;
  issues: ConversationSetupIssue[] = [];
  conversation: Conversation;
}

export class UpdateConversationResult {
  isUpdated: boolean;
  reason: string;
  issues: ConversationSetupIssue[] = [];
  conversation: Conversation;
}
