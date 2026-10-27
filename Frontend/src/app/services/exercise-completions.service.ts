import { Injectable } from '@angular/core';
import { take } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ExerciseTypeEnum } from '../enums/exercise-type.enum';

@Injectable({
  providedIn: 'root',
})
export class ExerciseCompletionsService {
  constructor(private readonly apiService: ApiService) {}

  markCompleted(exercise: ExerciseTypeEnum) {
    this.apiService
      .postExerciseCompletion(exercise)
      .pipe(take(1))
      .subscribe({ error: (error) => console.error(error.message) });
  }
}
