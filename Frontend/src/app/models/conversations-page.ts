import { LanguageEnum } from '../enums/language.enum';

export class ConversationsPage {
  items: ConversationListItem[] = [];
  from: number;
  count: number;
  itemsCount: number;
}

export class ConversationListItem {
  id: number;
  title: string;
  context: string;
  language: LanguageEnum;
  createdDate: Date;
  lastActivityDate: Date;
  messagesCount: number;
  participantNames: string[] = [];
}
