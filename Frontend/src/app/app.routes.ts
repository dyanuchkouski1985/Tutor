import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { HomeComponent } from './components/home/home';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'translations-word-exercise',
    loadComponent: () =>
      import('./components/translations-word-exercise/translations-word-exercise').then(
        (m) => m.TranslationsWordExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'tomorrow-words',
    loadComponent: () =>
      import('./components/tomorrow-words/tomorrow-words').then((m) => m.TomorrowWordsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'crossword-exercise',
    loadComponent: () =>
      import('./components/crossword-exercise/crossword-exercise').then(
        (m) => m.CrosswordExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'repeat-paused-words-exercise',
    loadComponent: () =>
      import('./components/repeat-paused-words-exercise/repeat-paused-words-exercise').then(
        (m) => m.RepeatPausedWordsExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'speech-exercise',
    loadComponent: () =>
      import('./components/speech-exercise/speech-exercise').then((m) => m.SpeechExerciseComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'speech-exercise/:conversationId',
    loadComponent: () =>
      import('./components/conversation-runner/conversation-runner').then(
        (m) => m.ConversationRunnerComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'mistakes',
    loadComponent: () => import('./components/mistakes/mistakes').then((m) => m.MistakesComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'mistakes-exercise',
    loadComponent: () =>
      import('./components/mistakes-exercise/mistakes-exercise').then(
        (m) => m.MistakesExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'sentence-translation-exercise',
    loadComponent: () =>
      import('./components/sentence-translation-exercise/sentence-translation-exercise').then(
        (m) => m.SentenceTranslationExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'guess-exercise',
    loadComponent: () =>
      import('./components/guess-exercise/guess-exercise').then((m) => m.GuessExerciseComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'explain-exercise',
    loadComponent: () =>
      import('./components/explain-exercise/explain-exercise').then(
        (m) => m.ExplainExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'listening-exercise',
    loadComponent: () =>
      import('./components/listening-exercise/listening-exercise').then(
        (m) => m.ListeningExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'countability-exercise',
    loadComponent: () =>
      import('./components/countability-exercise/countability-exercise').then(
        (m) => m.CountabilityExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'articles-exercise',
    loadComponent: () =>
      import('./components/articles-exercise/articles-exercise').then(
        (m) => m.ArticlesExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'verb-forms-exercise',
    loadComponent: () =>
      import('./components/verb-forms-exercise/verb-forms-exercise').then(
        (m) => m.VerbFormsExerciseComponent,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'test',
    loadComponent: () => import('./components/test/test').then((m) => m.TestComponent),
  },
  {
    path: '**',
    component: HomeComponent,
    canActivate: [AuthGuard],
  },
];
