import { Injectable } from '@angular/core';
import config from '../../assets/configs/config.json';

@Injectable({
  providedIn: 'root',
})
export class StaticConfigService {
  get identityUrl() {
    return config.identity;
  }

  get apiUrl() {
    return config.api;
  }

  get allowEditTranslations() {
    return config.allowEditTranslations;
  }

  get shuffleTasks() {
    return config.tasks.shuffle;
  }

  get reverseTasks() {
    return config.tasks.reverse;
  }

  get takeTasks() {
    return config.tasks.take;
  }

  get enableTimer() {
    return config.timer.enable;
  }

  get timerValueInSeconds() {
    return config.timer.valueInSeconds;
  }

  get warningTimeInSeconds() {
    return config.timer.warningTimeInSeconds;
  }

  get showTimerSeconds() {
    return config.timer.showSeconds;
  }

  get enableSpeechExercise() {
    return config.speechExercise.enable;
  }

  get continuousRecording() {
    return config.speechExercise.continuousRecording !== false;
  }

  get maxRecordingSeconds() {
    return config.speechExercise.maxRecordingSeconds || 120;
  }

  get maxAlternatives() {
    return config.speechExercise.maxAlternatives || 5;
  }

  get localRecognition() {
    return config.speechExercise.localRecognition === true;
  }

  get browserSpeech() {
    return config.speechExercise.browserSpeech === true;
  }

  get englishRecognitionTag() {
    return config.speechExercise.recognitionLanguageTags?.english || 'en-GB';
  }

  get polishRecognitionTag() {
    return config.speechExercise.recognitionLanguageTags?.polish || 'pl-PL';
  }

  get events() {
    return config.events;
  }

  pictureUrl(id: number) {
    return `${config.api}pictures/${id}`;
  }
}
