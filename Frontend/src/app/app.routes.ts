import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { HomeComponent } from './components/home/home';
import { TranslationsWordExerciseComponent } from './components/translations-word-exercise/translations-word-exercise';
import { CrosswordExerciseComponent } from './components/crossword-exercise/crossword-exercise';
import { RepeatPausedWordsExerciseComponent } from './components/repeat-paused-words-exercise/repeat-paused-words-exercise';
import { TestComponent } from './components/test/test';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'translations-word-exercise',
    component: TranslationsWordExerciseComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'crossword-exercise',
    component: CrosswordExerciseComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'repeat-paused-words-exercise',
    component: RepeatPausedWordsExerciseComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'test',
    component: TestComponent,
  },
  {
    path: '**',
    component: HomeComponent,
    canActivate: [AuthGuard],
  },
];
