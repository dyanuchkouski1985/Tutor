import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { DynamicConfigService } from './dynamic.config.service';
import { Injectable } from '@angular/core';
import { WordTranslations } from '../models/word-translations';
import { ExerciseWordResult } from '../models/exercise-word-result';
import { UserStatistics } from '../models/user-statistics';
import { StaticConfigService } from './static.config.service';
import { CrosswordModel } from '../models/crossword-model';
import { WordTranslationsExerciseModel } from '../models/word-translations-exercise-model';
import { WordTranslationsPage } from '../models/wordTranslationsPage';
import { WordLearningProgressEnum } from '../enums/word-learning-progress.enum';
import { WordSuggestions } from '../models/word-suggestions';

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
      `${this.staticConfigService.apiUrl}WordTranslations?value=${word}&language=${this.dynamicConfigService.language}`,
    );
  }

  getWordPronunciationUrl(wordId: number) {
    return `${this.staticConfigService.apiUrl}WordPronunciation/${wordId}`;
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

  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const headers = new HttpHeaders().append('Content-Disposition', 'multipart/form-data');

    return this.httpClient.post<any>(`${this.staticConfigService.apiUrl}UserStatistics`, formData, {
      headers: headers,
    });
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
