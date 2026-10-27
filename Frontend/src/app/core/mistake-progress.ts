import { MistakeProgressEnum } from '../enums/mistake-progress.enum';

export const mistakeMasteredReviewDays = 30;

export function mistakeProgressLabel(progress: MistakeProgressEnum) {
  switch (progress) {
    case MistakeProgressEnum.New:
      return 'New';
    case MistakeProgressEnum.One:
      return '1 / 3';
    case MistakeProgressEnum.Two:
      return '2 / 3';
    case MistakeProgressEnum.Mastered:
      return 'Mastered';
    default:
      return 'Hidden';
  }
}

export function mistakeProgressClass(progress: MistakeProgressEnum) {
  switch (progress) {
    case MistakeProgressEnum.New:
      return 'progress-new';
    case MistakeProgressEnum.Mastered:
      return 'progress-mastered';
    case MistakeProgressEnum.Ignored:
      return 'progress-ignored';
    default:
      return 'progress-learning';
  }
}
