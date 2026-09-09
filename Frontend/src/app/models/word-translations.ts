import { Translation } from './translation';
import { WordLearningProgressEnum } from '../enums/word-learning-progress.enum';
import { Usage } from './usage';
import { Picture } from './picture';

export class WordTranslations {
  id: number;
  language: number;
  wordLearningProgress: WordLearningProgressEnum;
  userUpload = true;
  translations: Translation[] = [];
  pictures: Picture[] = [];
  usages: Usage[] = [];
  value: string;
  pronunciation: File | null;
  isAnyNewPictureAvailable: boolean;
  hasPronunciation = false;
  addingDate: Date;
  lastLearningDate: Date;
}
