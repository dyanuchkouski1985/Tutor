import { WordLearningProgressEnum } from '../enums/word-learning-progress.enum';

export class WordSuggestions {
  [key: string]: Suggestion[];
}

export class Suggestion {
  wordId: number;
  value: string;
  learningProgress: WordLearningProgressEnum | null;
}

export class WordSuggestionsResult {
  items: string[] = [];
  error: string;
}
