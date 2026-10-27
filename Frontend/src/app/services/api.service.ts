import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { DynamicConfigService } from './dynamic.config.service';
import { Injectable } from '@angular/core';
import { WordTranslations } from '../models/word-translations';
import { ExerciseWordResult } from '../models/exercise-word-result';
import { UserStatistics } from '../models/user-statistics';
import { UserStatisticsCalendar } from '../models/user-statistics-calendar';
import { StaticConfigService } from './static.config.service';
import { CrosswordModel } from '../models/crossword-model';
import { WordTranslationsExerciseModel } from '../models/word-translations-exercise-model';
import { WordTranslationsPage } from '../models/wordTranslationsPage';
import { WordLearningProgressEnum } from '../enums/word-learning-progress.enum';
import { WordSuggestions, WordSuggestionsResult } from '../models/word-suggestions';
import {
  Conversation,
  ConversationTurn,
  CreateConversationParticipant,
  CreateConversationResult,
  FormatConversationMessageResult,
  GenerateConversationResult,
  UpdateConversationParticipant,
  UpdateConversationResult,
} from '../models/conversation';
import { ConversationsPage } from '../models/conversations-page';
import { SpeechToken } from '../models/speech-token';
import {
  MistakeAnswer,
  MistakePattern,
  MistakesExercise,
  MistakeTask,
} from '../models/mistake-pattern';
import {
  SentenceTranslationAnswer,
  SentenceTranslationExercise,
} from '../models/sentence-translation-exercise';
import { TranslationLanguageEnum } from '../enums/translation-language.enum';
import { GuessAnswer, GuessExercise } from '../models/guess-exercise';
import { ExplainAttempt, ExplainExercise, ExplainGuess } from '../models/explain-exercise';
import { ListeningAnswer, ListeningExercise } from '../models/listening-exercise';
import { GapChoiceAnswer, GapChoiceExercise } from '../models/gap-choice-exercise';
import { VerbFormsAnswer, VerbFormsExercise } from '../models/verb-forms-exercise';
import { LanguageSetting } from '../models/language-setting';
import { LanguageLevelEnum } from '../enums/language-level.enum';
import { ExerciseTypeEnum } from '../enums/exercise-type.enum';
import { ExerciseCompletionSummary } from '../models/exercise-completion-summary';
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(
    public readonly staticConfigService: StaticConfigService,
    public dynamicConfigService: DynamicConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  searchWordTranslations(
    word: string,
    sortBy: string,
    sortOrder: string,
    from: number,
    count: number,
    filterLearningProgresses: WordLearningProgressEnum[],
  ): Observable<WordTranslationsPage> {
    return this.httpClient
      .post<any>(`${this.staticConfigService.apiUrl}WordTranslations`, {
        value: word,
        language: this.dynamicConfigService.language,
        sortBy: sortBy,
        sortOrder: sortOrder,
        from: from,
        count: count,
        filterLearningProgresses: filterLearningProgresses,
      })
      .pipe(
        map((wordTranslationsPage) => {
          wordTranslationsPage.items = wordTranslationsPage.items.map(
            (wordTranslations: WordTranslations) => this.convertDateToLocale(wordTranslations),
          );
          return wordTranslationsPage;
        }),
      );
  }

  getWordSuggestions(): Observable<WordSuggestions> {
    return this.httpClient.get<WordSuggestions>(
      `${this.staticConfigService.apiUrl}WordTranslations/Suggestions?language=${this.dynamicConfigService.language}`,
    );
  }

  getWordTranslations(word: string): Observable<WordTranslations> {
    return this.httpClient.get<WordTranslations>(
      `${this.staticConfigService.apiUrl}WordTranslations?value=${encodeURIComponent(word)}&language=${this.dynamicConfigService.language}`,
    );
  }

  getWordPronunciationUrl(wordId: number) {
    return `${this.staticConfigService.apiUrl}WordPronunciation/${wordId}`;
  }

  suggestWordTranslations(word: string, existing: string[]): Observable<WordSuggestionsResult> {
    return this.httpClient.post<WordSuggestionsResult>(
      `${this.staticConfigService.apiUrl}WordTranslations/SuggestTranslations`,
      {
        value: word,
        language: this.dynamicConfigService.language,
        translationLanguage: this.dynamicConfigService.translationLanguage,
        existing: existing,
      },
    );
  }

  suggestWordUsages(word: string, existing: string[]): Observable<WordSuggestionsResult> {
    return this.httpClient.post<WordSuggestionsResult>(
      `${this.staticConfigService.apiUrl}WordTranslations/SuggestUsages`,
      {
        value: word,
        language: this.dynamicConfigService.language,
        existing: existing,
      },
    );
  }

  putWordTranslations(wordTranslations: WordTranslations): Observable<any> {
    const formData = new FormData();
    for (const picture of wordTranslations.pictures) {
      if (picture.file) {
        formData.append('files', picture.file);
      }
    }

    if (wordTranslations.pronunciation) {
      formData.append('pronunciation', wordTranslations.pronunciation);
    }

    formData.append('request', JSON.stringify(wordTranslations));
    return this.httpClient.put<any>(`${this.staticConfigService.apiUrl}WordTranslations`, formData);
  }

  deleteWord(wordId: number): Observable<any> {
    return this.httpClient.delete<any>(
      `${this.staticConfigService.apiUrl}WordTranslations?wordId=${wordId}`,
    );
  }

  getTomorrowWords(): Observable<WordTranslationsExerciseModel[]> {
    return this.httpClient.get<WordTranslationsExerciseModel[]>(
      `${this.staticConfigService.apiUrl}TomorrowWords?language=${this.dynamicConfigService.language}`,
    );
  }

  getTranslationsWordExercise(): Observable<WordTranslationsExerciseModel[]> {
    return this.httpClient.get<WordTranslationsExerciseModel[]>(
      `${this.staticConfigService.apiUrl}Exercises/TranslationsWord?language=${this.dynamicConfigService.language}`,
    );
  }

  getRepeatPausedWordsExercise(): Observable<WordTranslationsExerciseModel[]> {
    return this.httpClient.get<WordTranslationsExerciseModel[]>(
      `${this.staticConfigService.apiUrl}Exercises/RepeatPausedWords?language=${this.dynamicConfigService.language}`,
    );
  }

  getCrosswordExercise(): Observable<CrosswordModel> {
    return this.httpClient.get<CrosswordModel>(
      `${this.staticConfigService.apiUrl}Exercises/Crossword?language=${this.dynamicConfigService.language}`,
    );
  }

  putExerciseResults(exerciseWordResults: ExerciseWordResult[]): Observable<any> {
    return this.httpClient.put<any>(
      `${this.staticConfigService.apiUrl}Exercises?language=${this.dynamicConfigService.language}`,
      exerciseWordResults,
    );
  }

  putRepeatPausedWordsExerciseResults(exerciseWordResults: ExerciseWordResult[]): Observable<any> {
    return this.httpClient.put<any>(
      `${this.staticConfigService.apiUrl}Exercises/RepeatPausedWords?language=${this.dynamicConfigService.language}`,
      exerciseWordResults,
    );
  }

  getUserStatistics(): Observable<UserStatistics> {
    return this.httpClient.get<UserStatistics>(
      `${this.staticConfigService.apiUrl}UserStatistics?language=${this.dynamicConfigService.language}`,
    );
  }

  getUserStatisticsCalendar(months: number): Observable<UserStatisticsCalendar> {
    return this.httpClient.get<UserStatisticsCalendar>(
      `${this.staticConfigService.apiUrl}UserStatistics/Calendar?language=${this.dynamicConfigService.language}&months=${months}`,
    );
  }

  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const headers = new HttpHeaders().append('Content-Disposition', 'multipart/form-data');

    return this.httpClient.post<any>(`${this.staticConfigService.apiUrl}UserStatistics`, formData, {
      headers: headers,
    });
  }

  searchConversations(
    value: string,
    sortBy: string,
    sortOrder: string,
    from: number,
    count: number,
  ): Observable<ConversationsPage> {
    return this.httpClient
      .post<ConversationsPage>(`${this.staticConfigService.apiUrl}Conversations/Search`, {
        value: value,
        language: this.dynamicConfigService.language,
        sortBy: sortBy,
        sortOrder: sortOrder,
        from: from,
        count: count,
      })
      .pipe(
        map((page) => {
          page.items = page.items.map((item) => {
            item.createdDate = this.convertToLocaleDate(item.createdDate);
            item.lastActivityDate = this.convertToLocaleDate(item.lastActivityDate);
            return item;
          });
          return page;
        }),
      );
  }

  getConversation(conversationId: number): Observable<Conversation> {
    return this.httpClient
      .get<Conversation>(`${this.staticConfigService.apiUrl}Conversations/${conversationId}`)
      .pipe(map((conversation) => this.convertConversationDatesToLocale(conversation)));
  }

  createConversation(
    context: string,
    autoFormat: boolean,
    useLearningWords: boolean,
    sendImmediately: boolean,
    participants: CreateConversationParticipant[],
  ): Observable<CreateConversationResult> {
    return this.httpClient
      .post<CreateConversationResult>(`${this.staticConfigService.apiUrl}Conversations`, {
        language: this.dynamicConfigService.language,
        context: context,
        autoFormat: autoFormat,
        useLearningWords: useLearningWords,
        sendImmediately: sendImmediately,
        participants: participants,
      })
      .pipe(
        map((result) => {
          if (result.conversation) {
            result.conversation = this.convertConversationDatesToLocale(result.conversation);
          }
          return result;
        }),
      );
  }

  updateConversation(
    conversationId: number,
    context: string,
    autoFormat: boolean,
    useLearningWords: boolean,
    sendImmediately: boolean,
    participants: UpdateConversationParticipant[],
  ): Observable<UpdateConversationResult> {
    return this.httpClient
      .put<UpdateConversationResult>(
        `${this.staticConfigService.apiUrl}Conversations/${conversationId}`,
        {
          context: context,
          autoFormat: autoFormat,
          useLearningWords: useLearningWords,
          sendImmediately: sendImmediately,
          participants: participants,
        },
      )
      .pipe(
        map((result) => {
          if (result.conversation) {
            result.conversation = this.convertConversationDatesToLocale(result.conversation);
          }
          return result;
        }),
      );
  }

  getLanguageSetting(): Observable<LanguageSetting> {
    return this.httpClient.get<LanguageSetting>(
      `${this.staticConfigService.apiUrl}LanguageSettings?language=${this.dynamicConfigService.language}`,
    );
  }

  putLanguageSetting(level: LanguageLevelEnum): Observable<LanguageSetting> {
    return this.httpClient.put<LanguageSetting>(
      `${this.staticConfigService.apiUrl}LanguageSettings?language=${this.dynamicConfigService.language}`,
      { level },
    );
  }

  getSpeechToken(): Observable<SpeechToken> {
    return this.httpClient.get<SpeechToken>(`${this.staticConfigService.apiUrl}Speech/Token`);
  }

  generateConversation(
    learnerName: string,
    previousContext: string,
  ): Observable<GenerateConversationResult> {
    return this.httpClient.post<GenerateConversationResult>(
      `${this.staticConfigService.apiUrl}Conversations/Generate`,
      {
        language: this.dynamicConfigService.language,
        learnerName: learnerName,
        previousContext: previousContext,
      },
    );
  }

  formatConversationMessage(
    conversationId: number,
    text: string,
    alternatives: string[],
  ): Observable<FormatConversationMessageResult> {
    return this.httpClient.post<FormatConversationMessageResult>(
      `${this.staticConfigService.apiUrl}Conversations/${conversationId}/Format`,
      { text: text, alternatives: alternatives },
    );
  }

  getConversationTurn(conversationId: number): Observable<ConversationTurn> {
    return this.httpClient
      .post<ConversationTurn>(
        `${this.staticConfigService.apiUrl}Conversations/${conversationId}/Turn`,
        null,
      )
      .pipe(map((turn) => this.convertTurnDateToLocale(turn)));
  }

  postConversationMessage(conversationId: number, text: string): Observable<ConversationTurn> {
    return this.httpClient
      .post<ConversationTurn>(
        `${this.staticConfigService.apiUrl}Conversations/${conversationId}/Messages`,
        { text: text },
      )
      .pipe(map((turn) => this.convertTurnDateToLocale(turn)));
  }

  deleteConversation(conversationId: number): Observable<any> {
    return this.httpClient.delete<any>(
      `${this.staticConfigService.apiUrl}Conversations/${conversationId}`,
    );
  }

  getMistakes(): Observable<MistakePattern[]> {
    return this.httpClient
      .get<MistakePattern[]>(
        `${this.staticConfigService.apiUrl}Mistakes?language=${this.dynamicConfigService.language}`,
      )
      .pipe(
        map((patterns) => patterns.map((pattern) => this.convertMistakeDatesToLocale(pattern))),
      );
  }

  updateMistake(patternId: number, isIgnored: boolean): Observable<MistakePattern> {
    return this.httpClient
      .put<MistakePattern>(`${this.staticConfigService.apiUrl}Mistakes/${patternId}`, {
        isIgnored: isIgnored,
      })
      .pipe(map((pattern) => this.convertMistakeDatesToLocale(pattern)));
  }

  deleteMistake(patternId: number): Observable<boolean> {
    return this.httpClient.delete<boolean>(
      `${this.staticConfigService.apiUrl}Mistakes/${patternId}`,
    );
  }

  getMistakesAvailableCount(): Observable<number> {
    return this.httpClient.get<number>(
      `${this.staticConfigService.apiUrl}Mistakes/AvailableCount?language=${this.dynamicConfigService.language}`,
    );
  }

  getSentenceTranslationExercise(
    sentenceLanguage: TranslationLanguageEnum,
    count?: number,
  ): Observable<SentenceTranslationExercise> {
    const countQuery = count ? `&count=${count}` : '';

    return this.httpClient.get<SentenceTranslationExercise>(
      `${this.staticConfigService.apiUrl}SentenceTranslation/Exercise?language=${this.dynamicConfigService.language}&translationLanguage=${sentenceLanguage}${countQuery}`,
    );
  }

  answerSentenceTranslation(
    sentence: string,
    answer: string,
    revealedHintsCount: number,
  ): Observable<SentenceTranslationAnswer> {
    return this.httpClient.post<SentenceTranslationAnswer>(
      `${this.staticConfigService.apiUrl}SentenceTranslation/Answer`,
      { language: this.dynamicConfigService.language, sentence, answer, revealedHintsCount },
    );
  }

  getGuessExercise(): Observable<GuessExercise> {
    return this.httpClient.get<GuessExercise>(
      `${this.staticConfigService.apiUrl}Guess/Exercise?language=${this.dynamicConfigService.language}`,
    );
  }

  answerGuess(wordId: number, answer: string, revealedHintsCount: number): Observable<GuessAnswer> {
    return this.httpClient.post<GuessAnswer>(`${this.staticConfigService.apiUrl}Guess/Answer`, {
      language: this.dynamicConfigService.language,
      wordId,
      answer,
      revealedHintsCount,
    });
  }

  getExplainExercise(): Observable<ExplainExercise> {
    return this.httpClient.get<ExplainExercise>(
      `${this.staticConfigService.apiUrl}Explain/Exercise?language=${this.dynamicConfigService.language}`,
    );
  }

  guessExplain(
    wordId: number,
    explanation: string,
    attempts: ExplainAttempt[],
    isHintShown: boolean,
    isGivenUp = false,
  ): Observable<ExplainGuess> {
    return this.httpClient.post<ExplainGuess>(`${this.staticConfigService.apiUrl}Explain/Guess`, {
      language: this.dynamicConfigService.language,
      wordId,
      explanation,
      attempts,
      isHintShown,
      isGivenUp,
    });
  }

  postExerciseCompletion(exercise: ExerciseTypeEnum): Observable<void> {
    return this.httpClient.post<void>(`${this.staticConfigService.apiUrl}ExerciseCompletions`, {
      language: this.dynamicConfigService.language,
      exercise,
    });
  }

  getExerciseCompletionSummary(
    months: number,
    isAllUsers: boolean,
  ): Observable<ExerciseCompletionSummary[]> {
    return this.httpClient.get<ExerciseCompletionSummary[]>(
      `${this.staticConfigService.apiUrl}ExerciseCompletions/Summary?language=${this.dynamicConfigService.language}&months=${months}&isAllUsers=${isAllUsers}`,
    );
  }

  getListeningExercise(
    translationLanguage: TranslationLanguageEnum,
  ): Observable<ListeningExercise> {
    return this.httpClient.get<ListeningExercise>(
      `${this.staticConfigService.apiUrl}Listening/Exercise?language=${this.dynamicConfigService.language}&translationLanguage=${translationLanguage}`,
    );
  }

  answerListening(
    key: string,
    questionIndex: number,
    answer: number,
    isTextShown: boolean,
    isReplayed: boolean,
  ): Observable<ListeningAnswer> {
    return this.httpClient.post<ListeningAnswer>(
      `${this.staticConfigService.apiUrl}Listening/Answer`,
      {
        language: this.dynamicConfigService.language,
        key,
        questionIndex,
        answer,
        isTextShown,
        isReplayed,
      },
    );
  }

  getGapChoiceExercise(apiName: string): Observable<GapChoiceExercise> {
    return this.httpClient.get<GapChoiceExercise>(
      `${this.staticConfigService.apiUrl}${apiName}/Exercise?language=${this.dynamicConfigService.language}`,
    );
  }

  answerGapChoice(
    apiName: string,
    key: string,
    taskIndex: number,
    answer: number,
  ): Observable<GapChoiceAnswer> {
    return this.httpClient.post<GapChoiceAnswer>(
      `${this.staticConfigService.apiUrl}${apiName}/Answer`,
      {
        language: this.dynamicConfigService.language,
        key,
        taskIndex,
        answer,
      },
    );
  }

  getVerbFormsExercise(): Observable<VerbFormsExercise> {
    return this.httpClient.get<VerbFormsExercise>(
      `${this.staticConfigService.apiUrl}VerbForms/Exercise?language=${this.dynamicConfigService.language}`,
    );
  }

  answerVerbForms(key: string, taskIndex: number, answer: string): Observable<VerbFormsAnswer> {
    return this.httpClient.post<VerbFormsAnswer>(
      `${this.staticConfigService.apiUrl}VerbForms/Answer`,
      {
        language: this.dynamicConfigService.language,
        key,
        taskIndex,
        answer,
      },
    );
  }

  getMistakesExercise(): Observable<MistakesExercise> {
    return this.httpClient
      .get<MistakesExercise>(
        `${this.staticConfigService.apiUrl}Mistakes/Exercise?language=${this.dynamicConfigService.language}`,
      )
      .pipe(
        map((exercise) => {
          exercise.tasks = exercise.tasks.map((task) => {
            if (task.example) {
              task.example.createdDate = this.convertToLocaleDate(task.example.createdDate);
            }
            return task;
          });
          return exercise;
        }),
      );
  }

  answerMistakeTask(
    task: MistakeTask,
    answer: string,
    usedHint: boolean,
    isGivenUp = false,
  ): Observable<MistakeAnswer> {
    return this.httpClient.post<MistakeAnswer>(
      `${this.staticConfigService.apiUrl}Mistakes/${task.patternId}/Answer`,
      {
        sentence: task.sentence,
        answer: answer,
        correctedSentence: task.correctedSentence,
        explanation: task.explanation,
        usedHint: usedHint,
        isGivenUp: isGivenUp,
      },
    );
  }

  private convertMistakeDatesToLocale(pattern: MistakePattern): MistakePattern {
    pattern.lastOccurrenceDate = this.convertToLocaleDate(pattern.lastOccurrenceDate);
    pattern.createdDate = this.convertToLocaleDate(pattern.createdDate);
    pattern.lastPracticeDate = this.convertToLocaleDate(pattern.lastPracticeDate!);
    pattern.examples = pattern.examples?.map((example) => {
      example.createdDate = this.convertToLocaleDate(example.createdDate);
      return example;
    });

    return pattern;
  }

  private convertConversationDatesToLocale(conversation: Conversation): Conversation {
    conversation.createdDate = this.convertToLocaleDate(conversation.createdDate);
    conversation.lastActivityDate = this.convertToLocaleDate(conversation.lastActivityDate);
    conversation.messages = conversation.messages?.map((message) => {
      message.createdDate = this.convertToLocaleDate(message.createdDate);
      return message;
    });

    return conversation;
  }

  private convertTurnDateToLocale(turn: ConversationTurn): ConversationTurn {
    if (turn.message) {
      turn.message.createdDate = this.convertToLocaleDate(turn.message.createdDate);
    }

    return turn;
  }

  private convertToLocaleDate(date: Date): Date {
    if (!date) {
      return date;
    }

    const dateString = date as unknown as string;
    return /z$/i.test(dateString) ? new Date(dateString) : new Date(dateString + 'z');
  }

  private convertDateToLocale(wordTranslations: WordTranslations) {
    if (wordTranslations.addingDate) {
      const dateString = wordTranslations.addingDate as unknown as string;
      wordTranslations.addingDate = dateString?.endsWith('z')
        ? wordTranslations.addingDate
        : new Date(dateString + 'z');
    }

    if (wordTranslations.lastLearningDate) {
      const dateString = wordTranslations.lastLearningDate as unknown as string;
      wordTranslations.lastLearningDate = dateString?.endsWith('z')
        ? wordTranslations.lastLearningDate
        : new Date(dateString + 'z');
    }

    return wordTranslations;
  }
}
