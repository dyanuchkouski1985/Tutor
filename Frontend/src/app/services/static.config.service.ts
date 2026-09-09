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

  get events() {
    return config.events;
  }

  pictureUrl(id: number) {
    return `${config.api}pictures/${id}`;
  }
}
